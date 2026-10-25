import re
import time
import random
import logging
from typing import Dict, Any, List, Tuple
from services.gemini_service import call_gemini_with_fallback
from schemas.quiz import PhaseQuizRequest, PhaseQuizResponse, QuizQuestion

logger = logging.getLogger("skillverse.quiz")

# In-memory TTL cache for generated phase verification quizzes (1 hour TTL)
_quiz_cache: Dict[str, Tuple[PhaseQuizResponse, float]] = {}
QUIZ_CACHE_TTL = 3600.0

QUIZ_SYSTEM_INSTRUCTION = """
You are the Chief Technical Certification Auditor for SkillVerse AI.
Your mission is to rigorously verify whether a reskilling candidate has genuinely mastered the competencies declared in a specific career roadmap phase before certifying milestone completion.

MANDATORY RULES:
1. TEN (10) SCENARIO QUESTIONS:
   Generate EXACTLY 10 distinct, practical, scenario-based multiple choice questions assessing the candidate's understanding of the provided phase competencies (`skills`, `phaseTitle`, `courseTopic`).
   - Questions must test practical decision-making, code/architecture concepts, debugging, or real-world industrial best practices.
   - Avoid trivial yes/no or superficial questions.
2. EXACTLY 4 OPTIONS PER QUESTION:
   - Must have an array of 4 plausible options.
   - DO NOT include "A)", "B)", "1.", or letter prefixes in the option strings; output only the clean option text.
   - "correctIndex": integer (0, 1, 2, or 3) indicating the single correct option.
   - "explanation": Educational explanation of the underlying technical principle. DO NOT refer to option letters ("Option A", "Option B", "B is correct", "选项A", "选项B") because options are dynamically shuffled! Explain the concept directly by naming the tool or technique.
3. BALANCED OPTION DISTRIBUTION (CRITICAL):
   - You MUST distribute the correct answer randomly across all 4 positions: index 0 (A), index 1 (B), index 2 (C), and index 3 (D).
   - NEVER put the correct answer in the same position (such as Option B / index 1) for all or most questions!
   - Across the 10 questions, ensure roughly equal representation: ~2-3 questions for index 0, ~2-3 for index 1, ~2-3 for index 2, and ~2-3 for index 3.
4. EXP EVALUATION:
   Assess the cognitive complexity, labor market demand, and prerequisite depth of this milestone:
   - "expReward": An integer between 5 and 100.
   - CRITICAL REQUIREMENT: "expReward" MUST BE A STRICT MULTIPLE OF 5 (i.e. 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, or 100).
   - "expDifficultyTier": A concise tier descriptor (e.g. "Foundational Digital Competency (30 EXP)", "Applied Production Engineering (75 EXP)").
   - "evaluationReason": 1-2 sentence justification for the awarded EXP.
5. STRICT LANGUAGE COMPLIANCE (CRITICAL):
   - If target language is 'en': ALL questions, options, explanations, and evaluation reasons MUST be 100% in natural, professional ENGLISH. ABSOLUTELY ZERO Chinese (中文) characters or foreign script allowed anywhere!
   - If target language is 'ms': ALL content MUST be in natural, formal Bahasa Melayu.
   - If target language is 'zh': ALL content MUST be in Simplified Chinese (简体中文).
6. JSON OUTPUT FORMAT:
   Return strictly a valid JSON object matching this schema:
   {
     "expReward": 50,
     "expDifficultyTier": "Applied Specialization",
     "evaluationReason": "string",
     "questions": [
       {
         "id": 1,
         "question": "string",
         "options": ["string", "string", "string", "string"],
         "correctIndex": 0,
         "explanation": "string"
       }
       ... (exactly 10 questions)
     ]
   }
"""


def _sanitize_and_shuffle_options(
    raw_options: Any,
    correct_idx: int,
) -> Tuple[List[str], int]:
    """
    1. Strips leading option labels like 'A) ', 'B. ', 'C: ', '(D) ', '1. '.
    2. Ensures exactly 4 distinct options.
    3. Programmatically shuffles the options so the correct answer is uniformly
       distributed across [0, 1, 2, 3] (eliminating LLM positional bias towards Option B).
    """
    if not isinstance(raw_options, list):
        raw_options = []

    cleaned: List[str] = []
    for opt in raw_options:
        opt_str = str(opt).strip()
        # Strip prefixes like 'A) ', 'B. ', 'C: ', '(D) ', '1. ', '1) ', 'A - '
        opt_clean = re.sub(
            r"^(?:\([A-Da-d1-4]\)|[A-Da-d1-4][\.\)\:\-])\s*", "", opt_str
        ).strip()
        cleaned.append(opt_clean or opt_str)

    while len(cleaned) < 4:
        cleaned.append(f"Option {len(cleaned) + 1}")
    cleaned = cleaned[:4]

    if not (0 <= correct_idx < len(cleaned)):
        correct_idx = 0

    # Pair each option with whether it is the correct answer
    paired = [(opt, i == correct_idx) for i, opt in enumerate(cleaned)]
    random.shuffle(paired)

    shuffled_options = [opt for opt, _ in paired]
    new_correct_idx = 0
    for new_i, (_, is_corr) in enumerate(paired):
        if is_corr:
            new_correct_idx = new_i
            break

    return shuffled_options, new_correct_idx


def _clamp_exp_modular_5(raw_exp: Any, default_val: int = 50) -> int:
    """Ensure EXP reward is an integer between 5 and 100, and strictly a multiple of 5."""
    try:
        val = int(raw_exp)
    except (ValueError, TypeError):
        val = default_val

    # Clamp to [5, 100]
    val = max(5, min(100, val))

    # Round to nearest multiple of 5
    remainder = val % 5
    if remainder >= 3:
        val = val + (5 - remainder)
    else:
        val = val - remainder

    return max(5, min(100, val))


def _generate_fallback_quiz(request: PhaseQuizRequest) -> PhaseQuizResponse:
    """Deterministic 10-question fallback when LLM is unavailable."""
    loc = (request.locale or "en").lower()
    title = request.phaseTitle or f"Phase {request.phaseIndex}"
    skill_list = request.skills if request.skills else ["Core Engineering Competency", "Workflow Modernization"]
    primary_skill = skill_list[0]
    secondary_skill = skill_list[1] if len(skill_list) > 1 else "Industrial Automation"

    # Assign EXP based on phase index
    exp_by_phase = {1: 35, 2: 60, 3: 85}
    base_exp = exp_by_phase.get(request.phaseIndex, 50)
    exp = _clamp_exp_modular_5(base_exp)

    if loc.startswith("ms"):
        tier = f"Kompetensi Teras Fasa {request.phaseIndex} ({exp} EXP)"
        reason = f"Penilaian kemahiran teras '{primary_skill}' dan '{secondary_skill}' memerlukan kefahaman konsep dan aplikasi kerja sebenar."
    elif loc.startswith("zh"):
        tier = f"阶段 {request.phaseIndex} 综合能力认证 ({exp} EXP)"
        reason = f"考核「{primary_skill}」与「{secondary_skill}」的工程实践与底层认知，具备高市场应用价值。"
    else:
        tier = f"Phase {request.phaseIndex} Verified Competency ({exp} EXP)"
        reason = f"Mastering {primary_skill} and {secondary_skill} represents robust digital capabilities requiring verified technical aptitude."

    questions = []
    for i in range(1, 11):
        target_idx = (i - 1) % 4
        skill = primary_skill if i % 2 == 1 else secondary_skill

        if loc.startswith("ms"):
            q_text = f"Dalam amalan industri bagi '{skill}', apakah pendekatan terbaik untuk soalan pengesahan #{i}?"
            correct_opt = f"Mengaplikasikan amalan standard terbaik bagi memastikan kualiti dan kebolehpercayaan {skill}"
            distractors = [
                "Mengabaikan semakan data dan meneruskan operasi manual",
                "Menghapuskan dokumentasi bagi mempercepatkan kerja",
                "Hanya bergantung kepada andaian tanpa ujian sistematik",
            ]
            exp_explanation = f"Pematuhan kepada amalan terbaik industri dalam {skill} menjamin kebolehpercayaan sistem dan kecekapan aliran kerja digital."
        elif loc.startswith("zh"):
            q_text = f"在企业级「{skill}」实操场景中，针对问题 #{i} 的最优解决方案是什么？"
            correct_opt = f"遵循现代技术规范与最佳工程实践，确保 {skill} 流程的高效稳定"
            distractors = [
                "采用低效的手工重复流程进行临时拼凑",
                "直接跳过测试与质量审计环节",
                "完全依赖未经审计的第三方未经验证脚本",
            ]
            exp_explanation = f"遵循行业工程规范是掌握「{skill}」的核心标志，能有效避免系统性隐患并提高生产力。"
        else:
            q_text = f"In production workflows utilizing '{skill}', which practice is most essential for verification scenario #{i}?"
            correct_opt = f"Apply validated industry standard practices and automated validation for {skill}"
            distractors = [
                "Rely on unmonitored manual copy-pasting across disparate spreadsheets",
                "Bypass security checks and documentation to accelerate deployment",
                "Disable audit logging and ignore operational edge cases",
            ]
            exp_explanation = f"Applying validated modern standards in {skill} ensures resilient, reproducible workflows that guard against errors."

        opts = list(distractors)
        opts.insert(target_idx, correct_opt)

        questions.append(
            QuizQuestion(
                id=i,
                question=q_text,
                options=opts,
                correctIndex=target_idx,
                explanation=exp_explanation,
            )
        )

    return PhaseQuizResponse(
        phaseIndex=request.phaseIndex,
        phaseTitle=title,
        expReward=exp,
        expDifficultyTier=tier,
        evaluationReason=reason,
        passingScore=10,
        questions=questions,
    )


async def generate_phase_quiz(request: PhaseQuizRequest) -> PhaseQuizResponse:
    """
    Generates a 10-question technical competency quiz using Gemini Flash,
    evaluating the skills declared in the phase and calibrating an EXP reward in steps of 5.
    Caches results in-memory for 1 hour for instantaneous (< 1ms) repeat retrievals.
    """
    # 1. Check in-memory cache for instant (< 1ms) retrieval on repeat requests
    cache_key = (
        f"{request.phaseIndex}:"
        f"{(request.targetRole or '').lower().strip()}:"
        f"{(request.courseTopic or '').lower().strip()}:"
        f"{(request.locale or 'en').lower().strip()}:"
        f"{','.join(sorted([s.lower().strip() for s in request.skills or []]))}"
    )

    now = time.time()
    if not request.forceRefresh and cache_key in _quiz_cache:
        cached_resp, timestamp = _quiz_cache[cache_key]
        if now - timestamp < QUIZ_CACHE_TTL:
            logger.info(f"Phase Quiz cache HIT for {cache_key} (age: {now - timestamp:.1f}s)")
            return cached_resp

    skills_text = ", ".join(request.skills) if request.skills else "Core Modern Competencies"
    loc_code = (request.locale or "en").lower().strip()

    if loc_code.startswith("zh"):
        lang_label = "Simplified Chinese (简体中文)"
        lang_rules = (
            "CRITICAL LANGUAGE MANDATE: All 10 questions, all options, all explanations, "
            "and evaluation reasoning MUST be written in Simplified Chinese (简体中文)."
        )
    elif loc_code.startswith("ms"):
        lang_label = "Bahasa Melayu (ms)"
        lang_rules = (
            "CRITICAL LANGUAGE MANDATE: All 10 questions, all options, all explanations, "
            "and evaluation reasoning MUST be written in natural, formal Bahasa Melayu. Do NOT use English or Chinese."
        )
    else:
        lang_label = "English (en)"
        lang_rules = (
            "CRITICAL LANGUAGE MANDATE: All 10 questions, all options, all explanations, "
            "and evaluation reasoning MUST be in 100% professional ENGLISH. "
            "DO NOT use any Chinese characters (中文) or foreign phrases anywhere in the JSON, "
            "especially in the 'explanation' field!"
        )

    user_prompt = f"""
Candidate Reskilling Context:
- Target Horizon Role: {request.targetRole or 'Technology Specialist'}
- Milestone Phase: Phase {request.phaseIndex} - "{request.phaseTitle}"
- Planned Skills / Objectives to Audit: {skills_text}
- Course Topic: {request.courseTopic or request.phaseTitle}
- Target Language: {lang_label}

{lang_rules}

TASK & MANDATORY CONSTRAINTS:
1. Formulate 10 practical, scenario-based multiple-choice questions assessing whether the learner has genuinely mastered these skills.
2. Provide 4 realistic options per question with exactly 1 correct option index (0, 1, 2, or 3).
3. EXPLANATION RULE: In the 'explanation' field, explain the underlying technical principle directly by naming the tool or concept. DO NOT write "Option A is correct", "Option B", "选项B是正确的", etc., because option positions will be randomized.
4. STRICT LANGUAGE: Every single field in the JSON output MUST be in {lang_label}.
5. Evaluate the technical difficulty of these skills and determine the EXP reward:
   - expReward MUST BE an integer between 5 and 100, and MUST BE A MULTIPLE OF 5 (e.g. 25, 45, 60, 80, 100).
   - expDifficultyTier: Short tier title reflecting difficulty and EXP.
   - evaluationReason: 1 sentence explaining the EXP valuation.
6. Output strict JSON only.
"""

    raw_response = None

    # Tier 1: Local Qwen 2.5 (via Ollama / vLLM)
    try:
        from services.local_llm_service import call_local_llm_json
        logger.info(
            f"[quiz_service] Tier 1: Generating 10-question verification quiz for Phase {request.phaseIndex} "
            f"('{request.phaseTitle}') via Local Qwen 2.5 (locale: {loc_code})..."
        )
        raw_response = await call_local_llm_json(
            prompt=user_prompt,
            system_instruction=QUIZ_SYSTEM_INSTRUCTION,
            timeout=55.0,
        )
        if (
            raw_response
            and isinstance(raw_response, dict)
            and "questions" in raw_response
            and isinstance(raw_response.get("questions"), list)
            and len(raw_response.get("questions", [])) >= 5
        ):
            logger.info(
                f"[quiz_service] Tier 1 Success: Qwen 2.5 generated {len(raw_response.get('questions', []))} quiz questions."
            )
        else:
            raw_response = None
    except Exception as qwen_err:
        logger.warning(
            f"[quiz_service] Tier 1 Qwen failed: {qwen_err}. Switching to Tier 2 Gemini fallback..."
        )
        raw_response = None

    # Tier 2: Gemini API Fallback
    if not raw_response:
        try:
            logger.info(
                f"[quiz_service] Tier 2: Fallback to Gemini API for Phase {request.phaseIndex} quiz..."
            )
            contents = [{"role": "user", "parts": [{"text": user_prompt}]}]
            raw_response = await call_gemini_with_fallback(
                contents=contents,
                system_instruction=QUIZ_SYSTEM_INSTRUCTION,
                timeout=16.0,
                max_output_tokens=3500,
            )
        except Exception as gemini_err:
            logger.warning(
                f"[quiz_service] Tier 2 Gemini failed: {gemini_err}. Dropping to Tier 3 fallback..."
            )
            raw_response = None

    # Process and validate response from either Tier 1 or Tier 2
    if isinstance(raw_response, dict) and "questions" in raw_response:
        raw_questions = raw_response.get("questions", [])
        parsed_questions: List[QuizQuestion] = []

        for idx, q in enumerate(raw_questions[:10], 1):
            if not isinstance(q, dict):
                continue
            q_text = q.get("question", f"Question {idx} regarding {request.phaseTitle}")
            raw_options = q.get("options", [])

            correct_idx = q.get("correctIndex")
            if correct_idx is None:
                correct_idx = q.get("correct_index", 0)
            if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx > 3:
                try:
                    correct_idx = int(correct_idx)
                except (ValueError, TypeError):
                    correct_idx = 0
            if correct_idx < 0 or correct_idx > 3:
                correct_idx = 0

            # Programmatically strip prefixes and shuffle options to eliminate positional bias towards Option B (index 1)
            clean_options, new_correct_idx = _sanitize_and_shuffle_options(raw_options, correct_idx)

            raw_explanation = str(q.get("explanation", "Verified correct implementation standard.")).strip()

            # 1. Clean out any leading option references (e.g. 'Option B is correct: ', '选项 B 是正确的。')
            cleaned_explanation = re.sub(
                r"^(?:(?:Option|选项)\s*[A-Da-d1-4]\s*(?:is correct[.:, ]*|是正确的[。，\s]*|[:：-]\s*))+",
                "",
                raw_explanation,
                flags=re.IGNORECASE,
            ).strip()

            # 2. Cross-language safety check: If locale is English or Malay but explanation contains Chinese characters,
            # provide a clean localized fallback summary so UI never shows Chinese in EN/MS locale.
            has_chinese_chars = bool(re.search(r"[\u4e00-\u9fff]", cleaned_explanation))
            if loc_code.startswith("en") and has_chinese_chars:
                cleaned_explanation = (
                    f"Applying '{clean_options[new_correct_idx]}' represents the verified industry standard "
                    f"and best practice for {request.phaseTitle}."
                )
            elif loc_code.startswith("ms") and has_chinese_chars:
                cleaned_explanation = (
                    f"Mengaplikasikan '{clean_options[new_correct_idx]}' adalah amalan terbaik industri yang "
                    f"disahkan untuk {request.phaseTitle}."
                )
            elif not cleaned_explanation:
                cleaned_explanation = f"Verified correct technical approach for {request.phaseTitle}."

            parsed_questions.append(
                QuizQuestion(
                    id=idx,
                    question=str(q_text),
                    options=clean_options,
                    correctIndex=new_correct_idx,
                    explanation=cleaned_explanation,
                )
            )

        # If model returned fewer than 10, fill to exactly 10 from deterministic fallback
        if len(parsed_questions) < 10:
            fallback = _generate_fallback_quiz(request)
            for missing_idx in range(len(parsed_questions) + 1, 11):
                parsed_questions.append(fallback.questions[missing_idx - 1])

        raw_exp = raw_response.get("expReward") or raw_response.get("exp_reward", 50)
        exp_reward = _clamp_exp_modular_5(raw_exp)
        exp_tier = str(
            raw_response.get("expDifficultyTier")
            or raw_response.get("exp_difficulty_tier")
            or f"Phase {request.phaseIndex} Mastery ({exp_reward} EXP)"
        )
        eval_reason = str(
            raw_response.get("evaluationReason")
            or raw_response.get("evaluation_reason")
            or f"Calibrated based on cognitive depth of {skills_text}."
        )

        result = PhaseQuizResponse(
            phaseIndex=request.phaseIndex,
            phaseTitle=request.phaseTitle,
            expReward=exp_reward,
            expDifficultyTier=exp_tier,
            evaluationReason=eval_reason,
            passingScore=10,
            questions=parsed_questions[:10],
        )
        _quiz_cache[cache_key] = (result, now)
        return result
    else:
        logger.warning(
            "[quiz_service] LLM output incomplete or unavailable; returning Tier 3 deterministic fallback."
        )
        return _generate_fallback_quiz(request)
