import logging
from typing import Dict, Any
from .gemini_service import call_gemini_with_fallback
from schemas.mentor import MentorQueryPayload, MentorResponsePayload, QuickCheckQuiz

logger = logging.getLogger("skillverse.mentor")

MENTOR_SYSTEM_INSTRUCTION = """
You are an encouraging, empathetic, and expert technical reskilling mentor for SkillVerse AI.
Your mission is to help workers from non-technical, vocational, or at-risk backgrounds 
(such as clerks, cashiers, machine operators, customer service staff) understand modern digital, AI, 
and green technologies without intimidation or academic jargon.

CRITICAL INSTRUCTIONS:
1. EXPLANATION: Clearly and simply answer the user's question about the topic in accessible, encouraging terms.
2. PRACTICAL ANALOGY: Construct a vivid, intuitive real-world analogy directly grounded in the learner's past job background (`userPastJobTitle`).
   Connect their daily past physical, clerical, or operational tasks to this new technological concept.
3. QUICK CHECK QUIZ: Generate an interactive 4-option multiple-choice scenario question testing the core intuition of the topic using the analogy.
   Must contain:
   - "question": string
   - "options": list of exactly 4 distinct strings
   - "correctIndex": integer (0, 1, 2, or 3) indicating the correct answer
   - "explanation": brief explanation of why the correct option is right
4. SDG IMPACT SUMMARY: Explain in 1-2 sentences how mastering this competency aligns with the UN Sustainable Development Goals 
   (e.g., SDG 8.2 on economic productivity through technological upgrading, SDG 4.4, or SDG 9.4) and shields them from automation risk.
5. LANGUAGE COMPLIANCE:
   - If locale is 'ms', generate ALL text strictly in natural Bahasa Melayu.
   - If locale is 'zh', generate ALL text strictly in natural Simplified Chinese (简体中文).
   - If locale is 'en', generate ALL text in clear, accessible English.
6. OUTPUT FORMAT: Output ONLY a valid JSON object matching the requested schema. No conversational preamble or code blocks outside the JSON.
"""


def _generate_fallback_response(query: MentorQueryPayload) -> MentorResponsePayload:
    """
    Deterministic localized fallback when Gemini is unavailable.
    """
    loc = (query.locale or "en").lower()
    topic = query.courseTopic or "Modern Data & Automation Tools"
    past = query.userPastJobTitle or "Operations Specialist"

    if loc.startswith("ms"):
        return MentorResponsePayload(
            explanation=(
                f"Modul '{topic}' direka khas untuk memperkasakan latar belakang anda sebagai {past}. "
                "Ia menukar proses manual yang memakan masa kepada aliran kerja digital automatik."
            ),
            practicalAnalogy=(
                f"Bayangkan tugas harian anda sebagai {past} yang memerlukan semakan fizikal berulang kali. "
                f"Menggunakan {topic} adalah seperti mempunyai pembantu pintar yang mengisih dan mengesahkan rekod "
                "tersebut secara automatik pada waktu malam, supaya anda hanya perlu menyelesaikan isu utama pada waktu pagi."
            ),
            quickCheckQuiz=QuickCheckQuiz(
                question=f"Apakah faedah utama mengaplikasikan {topic} dalam aliran kerja anda?",
                options=[
                    "Ia menghapuskan keperluan membuat salinan data secara manual dan berulang",
                    "Ia menyukarkan proses kerja harian",
                    "Ia hanya boleh digunakan untuk syarikat teknologi global",
                    "Ia memerlukan kemahiran matematik tinggi peringkat universiti",
                ],
                correctIndex=0,
                explanation="Betul! Automasi menghapuskan input manual berulang kali, membolehkan anda fokus pada analisis dan keputusan bernilai tinggi.",
            ),
            sdgImpactSummary="Selaras dengan SDG 8.2 (Peningkatan Produktiviti Ekonomi melalui Penaiktarafan Teknologi) dan SDG 4.4.",
        )
    elif loc.startswith("zh"):
        return MentorResponsePayload(
            explanation=(
                f"学习“{topic}”能够直接赋能您作为{past}的工作经验，"
                "将过去耗时的人工重复操作转化为高效的自动化流程。"
            ),
            practicalAnalogy=(
                f"把您在{past}岗位上的日常重复检查，想象成每天需要手动搬运和记录每张单据。"
                f"而“{topic}”就像在工作区安装了自动传送带和扫描仪，系统会在后台自动完成归类整理，"
                "您只需在有异常时进行把关和决策。"
            ),
            quickCheckQuiz=QuickCheckQuiz(
                question=f"在日常工作中应用“{topic}”的核心价值是什么？",
                options=[
                    "消除枯燥且易出错的手工重复录入，提升数据处理效率",
                    "增加不必要的技术复杂度和纸质文档",
                    "只能用于纯学术科研，无法应用到企业一线",
                    "要求所有从业者必须具备博士级算法背景",
                ],
                correctIndex=0,
                explanation="回答正确！掌握自动化工具能够把您从重复机械劳动中解放出来，转型为具备高附加值的复合型人才。",
            ),
            sdgImpactSummary="深度契合联合国可持续发展目标 SDG 8.2（通过技术升级促进体面工作与经济增长）与 SDG 4.4。",
        )
    else:
        return MentorResponsePayload(
            explanation=(
                f"The module '{topic}' builds upon your existing domain knowledge as a {past}. "
                "It transitions manual, repetitive operational steps into streamlined, automated workflows."
            ),
            practicalAnalogy=(
                f"Think of your routine tasks as a {past} as manually filing paperwork and cross-referencing ledger rows one by one. "
                f"Mastering '{topic}' is like having an automated digital conveyor belt: the system pulls, formats, and validates "
                "the numbers automatically at midnight, freeing you to focus on strategy and high-value decisions."
            ),
            quickCheckQuiz=QuickCheckQuiz(
                question=f"What is the primary advantage of integrating {topic} into your operational workflow?",
                options=[
                    "It eliminates error-prone manual copy-pasting, letting you focus on strategic oversight",
                    "It replaces human decision-making with rigid paper forms",
                    "It can only be used by computer science PhDs",
                    "It requires manual printing and physical verification every morning",
                ],
                correctIndex=0,
                explanation="Correct! Automating repetitive data mechanics elevates your role from routine entry to intelligent oversight.",
            ),
            sdgImpactSummary="Directly advances UN SDG 8.2 (Economic Productivity via Technological Upgrading) and SDG 4.4 (Future-Ready Skills for Decent Work).",
        )


async def generate_mentor_guidance(query: MentorQueryPayload) -> MentorResponsePayload:
    """
    Produces contextualized mentoring, relatable analogies, a tailored mini-quiz,
    and UN SDG impact alignment using Gemini Flash with fallback key rotation.
    """
    user_prompt = f"""
Learner Profile Context:
- Past / Baseline Job Title: {query.userPastJobTitle}
- Active Milestone Phase: Phase {query.milestonePhase}
- Course Topic / Syllabus Module: {query.courseTopic}
- Learner's Specific Question or Concern: "{query.userQuestion or 'How does this help me and how do I understand this concept?'}"
- Requested Output Locale: {query.locale}

Task:
Generate a compassionate, clear, and relatable mentoring guide:
1. Explain the topic simply in response to the user's question.
2. Provide a vivid, real-world practical analogy directly referencing their day-to-day background as a {query.userPastJobTitle}.
3. Create a 4-option multiple-choice mini quiz based on this analogy (options array of length 4, correctIndex 0-3, explanation).
4. Summarize the UN SDG impact (SDG 8 & 4).

Respond in valid JSON matching this schema:
{{
  "explanation": "string",
  "practicalAnalogy": "string",
  "quickCheckQuiz": {{
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctIndex": 0,
    "explanation": "string"
  }},
  "sdgImpactSummary": "string"
}}
"""

    contents = [
        {
            "role": "user",
            "parts": [{"text": user_prompt}],
        }
    ]

    try:
        raw_response = await call_gemini_with_fallback(
            contents=contents,
            system_instruction=MENTOR_SYSTEM_INSTRUCTION,
            timeout=14.0,
            max_output_tokens=2500,
        )

        if isinstance(raw_response, dict) and "explanation" in raw_response and "practicalAnalogy" in raw_response:
            quiz_data = raw_response.get("quickCheckQuiz", {})
            options = quiz_data.get("options", [])
            if not isinstance(options, list) or len(options) < 2:
                options = [
                    "Automate repetitive tasks efficiently",
                    "Requires manual paper record keeping",
                    "Has no practical business value",
                    "Only applicable to academic research",
                ]
            
            correct_idx = quiz_data.get("correctIndex", 0)
            if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(options):
                correct_idx = 0

            quiz = QuickCheckQuiz(
                question=quiz_data.get("question", f"Why is {query.courseTopic} valuable for your career transition?"),
                options=options[:4],
                correctIndex=correct_idx,
                explanation=quiz_data.get("explanation", "It transforms routine manual steps into high-efficiency automated workflows."),
            )

            return MentorResponsePayload(
                explanation=raw_response["explanation"],
                practicalAnalogy=raw_response["practicalAnalogy"],
                quickCheckQuiz=quiz,
                sdgImpactSummary=raw_response.get(
                    "sdgImpactSummary",
                    "Directly advances UN SDG 8.2 (Economic Productivity via Technological Upgrading) and SDG 4.4.",
                ),
            )
        else:
            logger.warning("Gemini mentor output missing mandatory fields; falling back to deterministic response.")
            return _generate_fallback_response(query)

    except Exception as e:
        logger.error(f"Error invoking Gemini for AI Mentor guidance: {e}. Yielding localized fallback.")
        return _generate_fallback_response(query)
