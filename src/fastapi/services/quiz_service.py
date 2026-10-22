import logging
from typing import Dict, Any, List
from .gemini_service import call_gemini_with_fallback
from schemas.quiz import PhaseQuizRequest, PhaseQuizResponse, QuizQuestion

logger = logging.getLogger("skillverse.quiz")

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
   - "correctIndex": integer (0, 1, 2, or 3) indicating the single correct option.
   - "explanation": clear technical explanation of why the correct option is right and the misconceptions in other choices.
3. EXP EVALUATION:
   Assess the cognitive complexity, labor market demand, and prerequisite depth of this milestone:
   - "expReward": An integer between 5 and 100.
   - CRITICAL REQUIREMENT: "expReward" MUST BE A STRICT MULTIPLE OF 5 (i.e. 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, or 100).
   - "expDifficultyTier": A concise tier descriptor (e.g. "Foundational Digital Competency (30 EXP)", "Applied Production Engineering (75 EXP)").
   - "evaluationReason": 1-2 sentence justification for the awarded EXP.
4. LANGUAGE ADAPTATION:
   - If locale is 'ms': Generate ALL questions, options, explanations, and evaluation reasons in natural, formal Bahasa Melayu.
   - If locale is 'zh': Generate ALL content in Simplified Chinese (简体中文).
   - If locale is 'en': Generate ALL content in clear, professional English.
5. JSON OUTPUT FORMAT:
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
        questions = [
            QuizQuestion(
                id=i,
                question=f"Dalam amalan industri bagi '{primary_skill if i % 2 == 1 else secondary_skill}', apakah pendekatan terbaik untuk soalan pengesahan #{i}?",
                options=[
                    f"Mengaplikasikan amalan standard terbaik bagi memastikan kualiti dan kebolehpercayaan {primary_skill}",
                    "Mengabaikan semakan data dan meneruskan operasi manual",
                    "Menghapuskan dokumentasi bagi mempercepatkan kerja",
                    "Hanya bergantung kepada andaian tanpa ujian sistematik",
                ],
                correctIndex=0,
                explanation=f"Pematuhan kepada amalan terbaik industri dalam {primary_skill} menjamin kebolehpercayaan sistem dan kecekapan aliran kerja digital.",
            )
            for i in range(1, 11)
        ]
    elif loc.startswith("zh"):
        tier = f"阶段 {request.phaseIndex} 综合能力认证 ({exp} EXP)"
        reason = f"考核「{primary_skill}」与「{secondary_skill}」的工程实践与底层认知，具备高市场应用价值。"
        questions = [
            QuizQuestion(
                id=i,
                question=f"在企业级「{primary_skill if i % 2 == 1 else secondary_skill}」实操场景中，针对问题 #{i} 的最优解决方案是什么？",
                options=[
                    f"遵循现代技术规范与最佳工程实践，确保 {primary_skill} 流程的高效稳定",
                    "采用低效的手工重复流程进行临时拼凑",
                    "直接跳过测试与质量审计环节",
                    "完全依赖未经审计的第三方未经验证脚本",
                ],
                correctIndex=0,
                explanation=f"遵循行业工程规范是掌握「{primary_skill}」的核心标志，能有效避免系统性隐患并提高生产力。",
            )
            for i in range(1, 11)
        ]
    else:
        tier = f"Phase {request.phaseIndex} Verified Competency ({exp} EXP)"
        reason = f"Mastering {primary_skill} and {secondary_skill} represents robust digital capabilities requiring verified technical aptitude."
        questions = [
            QuizQuestion(
                id=i,
                question=f"In production workflows utilizing '{primary_skill if i % 2 == 1 else secondary_skill}', which practice is most essential for verification scenario #{i}?",
                options=[
                    f"Apply validated industry standard practices and automated validation for {primary_skill}",
                    "Rely on unmonitored manual copy-pasting across disparate spreadsheets",
                    "Bypass security checks and documentation to accelerate deployment",
                    "Disable audit logging and ignore operational edge cases",
                ],
                correctIndex=0,
                explanation=f"Applying validated modern standards in {primary_skill} ensures resilient, reproducible workflows that guard against errors.",
            )
            for i in range(1, 11)
        ]

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
    """
    skills_text = ", ".join(request.skills) if request.skills else "Core Modern Competencies"
    user_prompt = f"""
Candidate Reskilling Context:
- Target Horizon Role: {request.targetRole or 'Technology Specialist'}
- Milestone Phase: Phase {request.phaseIndex} - "{request.phaseTitle}"
- Planned Skills / Objectives to Audit: {skills_text}
- Course Topic: {request.courseTopic or request.phaseTitle}
- Requested Language Locale: {request.locale}

TASK:
1. Formulate 10 practical, scenario-based multiple-choice questions assessing whether the learner has genuinely mastered these skills.
2. Provide 4 realistic options per question with exactly 1 correct option index (0, 1, 2, or 3) and an explanation.
3. Evaluate the technical difficulty of these skills and determine the EXP reward:
   - expReward MUST BE an integer between 5 and 100, and MUST BE A MULTIPLE OF 5 (e.g. 25, 45, 60, 80, 100).
   - expDifficultyTier: Short tier title reflecting difficulty and EXP.
   - evaluationReason: 1 sentence explaining the EXP valuation.
4. Output strict JSON only.
"""

    contents = [{"role": "user", "parts": [{"text": user_prompt}]}]

    try:
        raw_response = await call_gemini_with_fallback(
            contents=contents,
            system_instruction=QUIZ_SYSTEM_INSTRUCTION,
            timeout=16.0,
            max_output_tokens=3500,
        )

        if isinstance(raw_response, dict) and "questions" in raw_response:
            raw_questions = raw_response.get("questions", [])
            parsed_questions: List[QuizQuestion] = []

            for idx, q in enumerate(raw_questions[:10], 1):
                if not isinstance(q, dict):
                    continue
                q_text = q.get("question", f"Question {idx} regarding {request.phaseTitle}")
                options = q.get("options", [])
                if not isinstance(options, list) or len(options) != 4:
                    # Guarantee exactly 4 options
                    valid_options = [str(opt) for opt in options[:4]]
                    while len(valid_options) < 4:
                        valid_options.append(f"Option {len(valid_options) + 1}")
                    options = valid_options

                correct_idx = q.get("correctIndex", 0)
                if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx > 3:
                    correct_idx = 0

                explanation = q.get("explanation", "Verified correct implementation standard.")

                parsed_questions.append(
                    QuizQuestion(
                        id=idx,
                        question=str(q_text),
                        options=[str(opt) for opt in options[:4]],
                        correctIndex=correct_idx,
                        explanation=str(explanation),
                    )
                )

            # If Gemini returned fewer than 10, fill to exactly 10
            if len(parsed_questions) < 10:
                fallback = _generate_fallback_quiz(request)
                for missing_idx in range(len(parsed_questions) + 1, 11):
                    parsed_questions.append(fallback.questions[missing_idx - 1])

            exp_reward = _clamp_exp_modular_5(raw_response.get("expReward", 50))
            exp_tier = str(raw_response.get("expDifficultyTier", f"Phase {request.phaseIndex} Mastery ({exp_reward} EXP)"))
            eval_reason = str(raw_response.get("evaluationReason", f"Calibrated based on cognitive depth of {skills_text}."))

            return PhaseQuizResponse(
                phaseIndex=request.phaseIndex,
                phaseTitle=request.phaseTitle,
                expReward=exp_reward,
                expDifficultyTier=exp_tier,
                evaluationReason=eval_reason,
                passingScore=10,
                questions=parsed_questions[:10],
            )
        else:
            logger.warning("Gemini quiz output incomplete; returning deterministic fallback.")
            return _generate_fallback_quiz(request)

    except Exception as e:
        logger.error(f"Error invoking Gemini for Phase Mastery Quiz: {e}. Yielding fallback.")
        return _generate_fallback_quiz(request)
