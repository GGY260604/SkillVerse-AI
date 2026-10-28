import json
import logging
from typing import Optional, Dict, Any, List
from config import settings
from schemas.agent import AgentChatRequest, AgentChatResponse
from services.local_llm_service import call_local_llm_chat
from services.gemini_service import call_gemini_with_fallback, get_last_used_key
from services.agent.database_reader_service import fetch_user_database_summary
from services.agent.project_knowledge_service import (
    is_project_inquiry,
    get_relevant_project_knowledge,
)

logger = logging.getLogger("agent_service")


def _format_dict_to_markdown(val: Any, level: int = 3) -> str:
    """Recursively formats nested dictionaries and lists from LLMs into clean Markdown."""
    if isinstance(val, str):
        return val
    if isinstance(val, list):
        return "\n".join(f"- {_format_dict_to_markdown(item, level)}" for item in val)
    if isinstance(val, dict):
        lines = []
        prefix = "#" * min(level, 6)
        for k, v in val.items():
            if isinstance(v, (dict, list)):
                lines.append(f"{prefix} {k}\n{_format_dict_to_markdown(v, level + 1)}")
            else:
                lines.append(f"**{k}**: {v}")
        return "\n\n".join(lines)
    return str(val)


def _extract_message_from_dict(raw: Dict[str, Any]) -> str:
    """Extracts or synthesizes user-facing conversational text from raw LLM response dict."""
    msg = raw.get("message") or raw.get("text") or raw.get("response") or raw.get("answer") or ""
    if msg and isinstance(msg, str) and msg.strip():
        return msg.strip()

    # If the LLM formatted its answer directly under topic-specific keys
    parts = []
    for k, v in raw.items():
        if k in ["target", "route", "action", "args", "success", "user", "history", "role"]:
            continue
        if isinstance(v, (dict, list)):
            parts.append(f"### {k}\n{_format_dict_to_markdown(v, 4)}")
        else:
            parts.append(f"**{k}**: {v}")
    return "\n\n".join(parts).strip()


async def execute_agent_chat(request: AgentChatRequest) -> AgentChatResponse:
    """
    Executes an intelligent agent chat request with multi-tier model fallbacks:
    Tier 1: Local Qwen 2.5 (via Ollama / vLLM)
    Tier 2: Google Gemini API (circular key pool rotation)
    Tier 3: Graceful localized offline fallback notice

    The system instruction is supplied dynamically by the frontend to ensure
    the frontend remains the single source of truth for routes, modals, and actions.
    """
    sys_instruction = request.system_instruction or (
        "You are SkillVerse AI Agent, an intelligent career navigator and reskilling specialist.\n"
        "Reply with a JSON object:\n"
        '{"target": "<tool_name_or_route_or_null>", "message": "<explanation>", "args": {}}\n'
        'Available tools: get_skill_radar, toggle_theme, extract_resume, generate_roadmap, get_roadmaps, share_roadmap, get_market_trends, get_shared_roadmaps, get_heatmap_comparison, export_report.\n'
        'For skill trends, set "target": "get_skill_radar" and args: {"skill": "<name>"}.\n'
        'For theme, set "target": "toggle_theme" and args: {"theme": "dark"} or {"theme": "light"}.\n'
        'For heatmap comparison, set "target": "get_heatmap_comparison".\n'
        'When user asks about the platform, algorithms, architecture, formulas, or SDGs, answer thoroughly in "message" with "target": null.\n'
        'For pure chatting, set "target": null.'
    )
    locale = (request.locale or "en").lower()

    if request.user_id:
        db_context = await fetch_user_database_summary(request.user_id)
        if db_context:
            sys_instruction = f"{sys_instruction}\n\n[Current Authenticated User Database Data]\n{db_context}".strip()

    # Check if inquiry pertains to SkillVerse AI platform architecture, formulas, algorithms, or SDGs
    history_str = " ".join([m.content for m in (request.history or [])[-3:]]) if request.history else ""
    is_inq = is_project_inquiry(request.message, history_str)
    llm_temperature = 0.15 if is_inq else 0.2

    if is_inq:
        project_knowledge = get_relevant_project_knowledge(request.message, max_chars=6000)
        if project_knowledge:
            sys_instruction = (
                f"{sys_instruction}\n\n"
                "======================================================================\n"
                "CRITICAL PLATFORM KNOWLEDGE & ZERO-HALLUCINATION SPECIFICATION:\n"
                "======================================================================\n"
                "The user is asking about SkillVerse AI's architecture, formulas, algorithms, or SDGs.\n"
                "YOU MUST STRICTLY COMPLY WITH THE FOLLOWING ANTI-HALLUCINATION RULES:\n"
                "1. GROUNDING MANDATE: Answer EXCLUSIVELY and FAITHFULLY using the exact formulas, definitions, numbers, percentages, thresholds, and architectures provided in [Summary.md] below.\n"
                "2. ZERO TOLERANCE FOR HALLUCINATION: DO NOT invent, assume, fabricate, or extrapolate any formulas, variables, metrics, algorithms, or architecture components that are not explicitly stated in the provided text.\n"
                "3. EXACT FORMULA FIDELITY:\n"
                "   - Hybrid Matching Formula (60% Macro + 40% Micro):\n"
                "     BaseMatch = 0.60 * CosineSimilarity_macro(U_profile, R_role) + 0.40 * ItemizedSkillOverlap\n"
                "     FinalScore = clamp(0.15, 1.0, BaseMatch * M_scenario + delta_target)\n"
                "     where ItemizedSkillOverlap = |matchedStrengths| / effective_req_count\n"
                "     effective_req_count = max(|requiredSkills|, 5), delta_target = +0.25 (target role incentive)\n"
                "   - Fast-Path Skill Proximity Algorithm (3 Tiers):\n"
                "     Tier 1: Exact or Substring Match (1.00 score, 0.00ms)\n"
                "     Tier 2: Token Jaccard >= 0.60 (|U ∩ R| / |U ∪ R| >= 0.60, 0.00ms)\n"
                "     Tier 3: Dense Cosine Vector >= 0.58 (using BAAI/bge-m3 1024-dim, <2ms)\n"
                "   - Live Labor Trend Signal Velocity (V_s):\n"
                "     V_s = (C_t - C_{t-1}) / max(C_{t-1}, 1)\n"
                "     Spectrum: Emerging (V_s > +0.25), Stable (-0.15 <= V_s <= +0.25), Declining (V_s < -0.15)\n"
                "   - Empirical Role Velocity (V_role) & 3-Tier Viability:\n"
                "     V_skills(R) = (1/|S|) * sum_{s in S} w_s * V_s(s)\n"
                "     V_role = round(V_skills(R) * M_scenario, 3)\n"
                "     Viability Tiers:\n"
                "     * On-Trend (🟢): V_role >= +0.25 (High Expansion, highly recommended)\n"
                "     * Stable Core (🔵): -0.10 <= V_role < +0.25 (Baseline Demand, consistent)\n"
                "     * Falling Behind (🔴): V_role < -0.10 (Automation Risk, upskilling advised)\n"
                "   - Macro Scenarios (M_scenario):\n"
                "     * moderate (1.00x baseline)\n"
                "     * accelerated_ai (1.30x for AI/cognitive roles, 0.70x for routine clerical roles)\n"
                "     * green_economy (1.30x for clean-tech/ESG roles, 0.85x for routine clerical roles)\n"
                "   - UN SDGs: Specifically SDG 4 (4.3 & 4.4), SDG 5 (5.1 & 5.5), SDG 8 (8.2 & 8.5), SDG 9 (9.2 & 9.5), SDG 10 (10.2 & 10.3).\n"
                "4. NEGATIVE CONSTRAINT: If the user asks for a detail or formula NOT documented in Summary.md, explicitly state that it is not documented in the official platform specification. NEVER invent generic, textbook, or RPG alternatives.\n"
                "5. LANGUAGE & FORMAT: Respond fluently in the user's inquiry language (e.g. Chinese for Chinese inquiries), while keeping all mathematical formulas, variables, and numerical thresholds strictly authentic to Summary.md.\n"
                "6. OUTPUT JSON FORMAT: Set \"target\": null, \"args\": {}, and put your complete, rich Markdown explanation into the \"message\" string:\n"
                "   {\"target\": null, \"message\": \"<markdown text>\", \"args\": {}}\n\n"
                f"[SkillVerse AI Platform Architectural Knowledge & Specifications (from Summary.md)]\n"
                f"{project_knowledge}"
            ).strip()

    # ==========================================
    # Tier 1: Local Qwen LLM
    # ==========================================
    if getattr(settings, "ENABLE_LOCAL_LLM", True):
        model_name = getattr(settings, "LOCAL_LLM_MODEL", "qwen2.5:7b")
        logger.info(f"[agent] Attempting inference with local Qwen ({model_name})...")
        qwen_res = await call_local_llm_chat(
            prompt=request.message,
            history=request.history,
            system_instruction=sys_instruction,
            timeout=30.0,
            temperature=llm_temperature,
        )

        if qwen_res and isinstance(qwen_res, dict):
            target = qwen_res.get("target") or qwen_res.get("route") or qwen_res.get("action")
            message = _extract_message_from_dict(qwen_res)
            args = qwen_res.get("args") or {}
            logger.info(f"[agent] Successfully fulfilled by Qwen ({model_name}). Target: {target}")
            return AgentChatResponse(
                success=True,
                target=target,
                message=message,
                args=args,
                model_used=f"qwen ({model_name})",
            )

        logger.warning("[agent] Qwen local LLM unavailable or returned empty. Falling back to Gemini API...")

    # ==========================================
    # Tier 2: Gemini API Fallback
    # ==========================================
    if getattr(settings, "ENABLE_GEMINI_API", True) and settings.GEMINI_API_KEYS:
        logger.info("[agent] Initiating Gemini API fallback...")
        try:
            gemini_contents = []
            for item in (request.history or []):
                role = "model" if item.role in ["assistant", "bot", "model"] else "user"
                gemini_contents.append({"role": role, "parts": [{"text": item.content}]})
            gemini_contents.append({"role": "user", "parts": [{"text": request.message}]})

            gemini_res = await call_gemini_with_fallback(
                contents=gemini_contents,
                system_instruction=sys_instruction,
                timeout=30.0,
                temperature=llm_temperature,
            )

            if gemini_res and isinstance(gemini_res, dict):
                target = gemini_res.get("target") or gemini_res.get("route") or gemini_res.get("action")
                message = _extract_message_from_dict(gemini_res)
                args = gemini_res.get("args") or {}
                key_id = get_last_used_key() or "gemini"
                logger.info(f"[agent] Successfully fulfilled by Gemini ({key_id}). Target: {target}")
                return AgentChatResponse(
                    success=True,
                    target=target,
                    message=message,
                    args=args,
                    model_used=f"gemini ({key_id})",
                )
        except Exception as e:
            logger.error(f"[agent] Gemini fallback failed: {type(e).__name__}: {e}")

    # ==========================================
    # Tier 3: Localized Offline Fallback
    # ==========================================
    logger.warning("[agent] All model tiers exhausted. Returning localized offline notice.")
    if locale.startswith("zh"):
        fallback_msg = "现在 AI 不在线，请稍后再试。"
    elif locale.startswith("ms"):
        fallback_msg = "Ejen AI sedang luar talian pada masa ini. Sila cuba sebentar lagi."
    else:
        fallback_msg = "The AI agent is currently offline. Please try again later."

    return AgentChatResponse(
        success=False,
        target=None,
        message=fallback_msg,
        args={},
        model_used="offline_fallback",
    )
