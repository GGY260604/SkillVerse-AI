import os
import re
import logging
from pathlib import Path
from typing import Optional, List, Dict, Tuple, Set

logger = logging.getLogger("project_knowledge_service")

_CACHED_SUMMARY_TEXT: Optional[str] = None
_CACHED_SECTIONS: List[Tuple[str, str]] = []

# Exhaustive keywords indicating that the user is inquiring about SkillVerse AI's system, architecture,
# formulas, algorithms, background, SDGs, or technical capabilities across Chinese, English, and Malay.
PROJECT_INQUIRY_KEYWORDS = [
    # Platform Identity & Overview
    "skillverse", "平台", "系统", "项目", "你们", "你是谁", "背景", "简介", "介绍",
    "功能", "做什么", "做甚么", "有哪些", "怎么用", "如何使用", "说明",
    "project", "platform", "system", "who are you", "what is", "about", "overview",
    "apakah", "siapakah", "tentang", "sistem",
    
    # Architecture, Infrastructure & Technology Stack
    "架构", "技术栈", "数据库", "底层", "微服务", "网关", "容灾", "双层", "三层", "兜底",
    "architecture", "tech stack", "fastapi", "next.js", "turbopack",
    "supabase", "pgvector", "hnsw", "bge-m3", "runpod", "gemini", "qwen", "ollama",
    "seni bina", "pangkalan data",
    
    # Formulas, Algorithms & Mathematics
    "公式", "算法", "数学", "计算", "算", "原理", "逻辑", "步骤", "机制", "规则", "指标", "权重", "阈值",
    "formula", "algorithm", "math", "calculation", "how to calculate", "how is calculated",
    "kira", "pengiraan", "kaedah", "logik",
    
    # Hybrid Matching & Proximity
    "匹配", "微观", "宏观", "吻合", "契合", "混合匹配", "余弦", "相似度",
    "hybrid match", "matching", "macro", "micro", "basematch", "finalscore",
    "jaccard", "cosine", "token jaccard", "dense cosine", "proximity", "padanan",
    
    # Role Velocity, Market Viability & Trend Signals
    "role velocity", "velocity", "增速", "速率", "速度", "动量", "v_role", "v_s", "v_skills",
    "在榜", "掉队", "核心", "viability", "on_trend", "stable", "falling_behind", "market viability",
    "scenario", "macro scenario", "情景", "乘数", "情景乘数", "宏观情景", "m_scenario",
    "halaju", "momentum", "pengganda", "senario",
    
    # 5-Axis Competency Radar
    "radar", "雷达", "5-axis", "5维", "五维", "competency", "能力图", "能力模型",
    "radar geometry", "calibration",
    
    # UN SDGs & Impact
    "sdg", "可持续发展", "联合国", "sustainable development", "un 2030", "对标", "目标",
    "malaysia", "mosti", "hays", "hrd corp", "马来西亚", "matlamat pembangunan",
    
    # Core Services & Pipelines
    "pii", "脱敏", "extract", "简历解析", "简历", "resume", "pathway", "路线图", "roadmap",
    "trend", "趋势", "skill search", "技能搜索", "replan", "重规划", "漂移", "drift",
    "mentor", "导师", "quiz", "测验", "heatmap", "热力图", "team matrix", "团队", "矩阵", "互补",
    "credential", "证书", "证明", "sha-256", "agent", "chatbot", "tool", "工具",
    "theme", "主题", "暗色", "深色", "浅色", "esco", "o*net", "taxonomy",
    "trilingual", "三语", "localization"
]

# Multilingual cross-lingual semantic synonym expansion:
# Maps user query concepts (Chinese / Malay / English) directly to canonical headings & terms in Summary.md
CROSS_LINGUAL_SYNONYMS: Dict[str, List[str]] = {
    # Matching and scoring formulas
    "匹配": ["hybrid role matching", "macro", "micro", "itemizedskilloverlap", "basematch", "cosine", "jaccard", "4.1", "0.60", "0.40"],
    "微观": ["micro itemized skill", "itemizedskilloverlap", "effective_req_count", "matchedstrengths", "4.1"],
    "宏观": ["macro vector proximity", "macro-scenario", "cosinesimilarity_macro", "m_scenario", "4.1", "4.3"],
    "公式": ["mathematical formulations", "basematch", "finalscore", "v_role", "v_s", "clamp", "4.1", "4.4", "4.5"],
    "算法": ["algorithmic", "fast-path skill proximity", "jaccard", "dense cosine", "4.1", "4.2"],
    "计算": ["formulation", "basematch", "v_role", "v_s", "itemizedskilloverlap", "4.1", "4.4", "4.5"],
    "算": ["formulation", "basematch", "v_role", "v_s", "itemizedskilloverlap", "4.1", "4.4", "4.5"],
    "权重": ["weight", "0.60", "0.40", "w_s", "60%", "40%"],
    "阈值": ["threshold", "0.60", "0.58", "0.25", "-0.10", "clamp"],
    "jaccard": ["fast-path skill proximity", "jaccard", "token jaccard", "0.60", "4.2"],
    "相似度": ["similarity", "cosine", "cosinesimilarity", "jaccard", "proximity", "4.1", "4.2"],
    
    # Scenarios
    "情景": ["dynamic macro-scenario multiplier", "moderate", "accelerated_ai", "green_economy", "m_scenario", "4.3"],
    "乘数": ["multiplier", "m_scenario", "scenario_multipliers", "moderate", "accelerated_ai", "green_economy", "4.3"],
    "情景乘数": ["macro-scenario multiplier", "m_scenario", "moderate", "accelerated_ai", "green_economy", "4.3"],
    
    # Velocity and viability
    "role velocity": ["role velocity", "v_role", "v_skills", "m_scenario", "market viability", "on_trend", "stable", "falling_behind", "4.5"],
    "速度": ["role velocity", "signal velocity", "v_role", "v_s", "momentum", "4.4", "4.5"],
    "动量": ["role momentum", "v_skills", "v_role", "momentum", "4.5"],
    "在榜": ["on_trend", "on-trend", "+25%", "4.5"],
    "掉队": ["falling_behind", "falling behind", "-10%", "4.5"],
    "核心": ["stable core", "stable", "4.5"],
    "viability": ["viability", "on_trend", "stable", "falling_behind", "4.5"],
    
    # SDGs
    "联合国": ["un sustainable development goals", "sdg", "sdg 4", "sdg 5", "sdg 8", "sdg 9", "sdg 10", "mosti", "hrd corp", "hays", "2. un"],
    "sdg": ["un sustainable development goals", "sdg", "sdg 4", "sdg 5", "sdg 8", "sdg 9", "sdg 10", "2. un"],
    "可持续": ["un sustainable development goals", "sustainable", "sdg", "2. un"],
    "对标": ["alignment", "un sustainable development goals", "sdg", "2. un"],
    
    # Radar and competencies
    "雷达": ["5-axis competency radar", "radar geometry", "calibration", "4.8"],
    "5维": ["5-axis competency radar", "technical proficiency", "leadership", "adaptability", "domain velocity", "creativity", "4.8"],
    "五维": ["5-axis competency radar", "technical proficiency", "leadership", "adaptability", "domain velocity", "creativity", "4.8"],
    
    # PII and intake
    "脱敏": ["multimodal profile intake", "pii scrubbing engine", "zero-bias", "service 1"],
    "简历": ["multimodal profile intake", "resume", "ocr", "pii", "service 1"],
    
    # Roadmaps
    "路线图": ["dynamic reskilling pathway", "roadmap", "re-planning", "drift recovery", "service 3", "service 7"],
    "重规划": ["autonomous roadmap re-planning", "drift recovery", "service 7"],
    "导师": ["contextual ai learning mentor", "mentor", "quiz", "service 8"],
    "测验": ["milestone proof", "quiz", "exp", "level", "service 8", "4.11"],
    
    # Team matrix
    "热力图": ["enterprise team skill matrix", "heatmap", "cohort deficit", "selection-mode", "service 10", "4.10"],
    "团队": ["enterprise team skill matrix", "heatmap", "cohort deficit", "service 10", "4.10"],
    
    # Cryptographic proof
    "证书": ["cryptographic sha-256", "micro-credential proof", "service 9", "4.12"],
    "证明": ["sha-256", "cryptographic", "micro-credential proof", "service 9", "4.12"],
    
    # Resilience & architecture
    "容灾": ["resilience & failover infrastructure", "gateway failover", "circular 26-key", "waterfall", "6. resilience"],
    "兜底": ["fallback", "waterfall", "offline notice", "three-tier", "6. resilience"],
    "架构": ["global end-to-end system architecture", "fastapi", "supabase", "next.js", "flowchart", "3. global"],
    "技术栈": ["global end-to-end system architecture", "infrastructure tiers", "tech stack", "3. global"],
    "bge-m3": ["bge-m3", "1024-dim", "runpod", "vector space", "4.9"],
    
    # Localization & theme
    "三语": ["trilingual localization", "en", "ms", "zh", "7.1"],
    "主题": ["reactive dark/light mode theme", "dark mode", "light mode", "7.2"],
    "暗色": ["reactive dark/light mode theme", "dark mode", "7.2"],
}


def resolve_summary_path() -> Optional[Path]:
    """
    Search candidate filesystem locations to locate the canonical Summary.md,
    fixed primarily within the agent microservice directory (src/fastapi/services/agent/Summary.md).
    """
    current_file = Path(__file__).resolve()
    candidate_paths = [
        # 1. Primary fixed location: same folder (src/fastapi/services/agent/Summary.md)
        current_file.parent / "Summary.md",
        # 2. When CWD is repo root
        Path.cwd() / "src" / "fastapi" / "services" / "agent" / "Summary.md",
        # 3. When CWD is src/fastapi
        Path.cwd() / "services" / "agent" / "Summary.md",
        # 4. Fallbacks across parent structures
        current_file.parents[1] / "Summary.md",
        current_file.parents[2] / "Summary.md",
        current_file.parents[3] / "Summary.md",
        Path.cwd() / "Summary.md",
    ]

    for p in candidate_paths:
        if p.is_file():
            return p
    return None


def load_project_summary() -> str:
    """
    Load and cache the complete markdown content of Summary.md.
    """
    global _CACHED_SUMMARY_TEXT, _CACHED_SECTIONS
    if _CACHED_SUMMARY_TEXT is not None:
        return _CACHED_SUMMARY_TEXT

    path = resolve_summary_path()
    if not path or not path.is_file():
        logger.warning("[project_knowledge] Summary.md could not be found in candidate paths.")
        _CACHED_SUMMARY_TEXT = ""
        return ""

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            _CACHED_SUMMARY_TEXT = content

            # Parse markdown into sections by level 2 and level 3 headings (## and ###)
            sections: List[Tuple[str, str]] = []
            raw_parts = re.split(r"(?m)^(?=#{2,3}\s+)", content)
            for part in raw_parts:
                part = part.strip()
                if not part:
                    continue
                match = re.match(r"^#{2,3}\s+([^\n]+)", part)
                heading = match.group(1).strip() if match else "Overview"
                sections.append((heading, part))

            _CACHED_SECTIONS = sections
            logger.info(f"[project_knowledge] Successfully loaded Summary.md ({len(content)} chars, {len(sections)} sections) from {path}")
            return _CACHED_SUMMARY_TEXT
    except Exception as e:
        logger.error(f"[project_knowledge] Failed to read Summary.md: {e}")
        _CACHED_SUMMARY_TEXT = ""
        return ""


def is_project_inquiry(query: str, history_text: str = "") -> bool:
    """
    Determines whether a user query or ongoing discussion pertains to
    SkillVerse AI's technical architecture, algorithms, specifications, or SDGs.
    """
    combined = f"{query} {history_text}".lower()
    
    # 1. Direct keyword match
    if any(keyword in combined for keyword in PROJECT_INQUIRY_KEYWORDS):
        return True
        
    # 2. Inquisitive sentence structures about platform mechanics
    inquisitive_patterns = [
        r"(怎么|如何|怎样|如何计算|怎么计算|原理|什么是|为何|为什么)",
        r"(how\s+to|how\s+does|how\s+is|what\s+is|why\s+is|explain|describe)",
        r"(bagaimana|apakah|mengapa|kenapa)"
    ]
    if any(re.search(pat, combined) for pat in inquisitive_patterns):
        # Combined with any technical noun
        tech_nouns = ["score", "match", "rate", "radar", "roadmap", "matrix", "trend", "model", "分数", "匹配", "雷达", "路线", "矩阵", "趋势", "模型"]
        if any(noun in combined for noun in tech_nouns):
            return True

    return False


def get_relevant_project_knowledge(query: str, max_chars: int = 18000) -> str:
    """
    Extracts the most relevant sections of Summary.md according to the user query.
    Utilizes multilingual token expansion to bridge Chinese/Malay inquiries with English documentation.
    """
    full_text = load_project_summary()
    if not full_text:
        return ""

    query_lower = query.lower()

    # If full text fits within budget or user explicitly requests full documentation, return full
    if len(full_text) <= max_chars or any(w in query_lower for w in ["全部", "完整", "所有细节", "full", "complete"]):
        return full_text[:max_chars]

    # Tokenize user query (English words, numbers, and Chinese 1-2 char segments)
    query_tokens: Set[str] = set(re.findall(r"[a-zA-Z0-9_\-]+|[\u4e00-\u9fa5]{2,}", query_lower))
    chinese_chars = set(re.findall(r"[\u4e00-\u9fa5]", query_lower))
    query_tokens.update(chinese_chars)

    # Multilingual expansion: map non-English concepts to canonical English documentation keywords
    expanded_tokens: Set[str] = set(query_tokens)
    for term, syn_list in CROSS_LINGUAL_SYNONYMS.items():
        if term in query_lower:
            for s in syn_list:
                expanded_tokens.add(s.lower())

    # Detect high-level intents
    wants_formulas = any(w in query_lower for w in ["公式", "计算", "算", "算法", "math", "formula", "velocity", "matching", "jaccard", "cosine"])
    wants_sdgs = any(w in query_lower for w in ["sdg", "联合国", "可持续", "2030", "目标", "对标"])
    wants_overview = any(w in query_lower for w in ["介绍", "你是谁", "系统", "平台", "功能", "做甚么", "做什么", "overview", "what is"])

    ranked_sections: List[Tuple[int, str, str]] = []

    for heading, sec_text in _CACHED_SECTIONS:
        score = 0
        heading_lower = heading.lower()
        sec_lower = sec_text.lower()

        # Score heading matches heavily
        for token in expanded_tokens:
            if len(token) < 2 and not re.match(r"[\u4e00-\u9fa5]", token):
                continue
            if token in heading_lower:
                score += 30
            elif token in sec_lower:
                score += min(sec_lower.count(token), 10) * 2

        # Intent-driven section boosts
        if wants_formulas and ("4." in heading or "formula" in heading_lower or "velocity" in heading_lower or "matching" in heading_lower):
            score += 40
        if wants_sdgs and ("2." in heading or "sdg" in heading_lower or "sustainable" in heading_lower):
            score += 50
        if wants_overview and ("1." in heading or "2." in heading or "3." in heading or "executive" in heading_lower):
            score += 30

        ranked_sections.append((score, heading, sec_text))

    ranked_sections.sort(key=lambda x: x[0], reverse=True)

    # Accumulate highest-scoring sections up to max_chars
    selected_parts: List[str] = []
    accumulated_len = 0

    for score, heading, sec_text in ranked_sections:
        if score <= 0:
            continue
        if accumulated_len + len(sec_text) + 20 <= max_chars:
            selected_parts.append(sec_text)
            accumulated_len += len(sec_text)
        else:
            remaining_budget = max_chars - accumulated_len
            if remaining_budget > 400:
                selected_parts.append(sec_text[:remaining_budget] + "\n...(truncated)")
            break

    if not selected_parts:
        # Fallback to the top 3 sections (Executive Summary, SDG, Architecture)
        for _, sec_text in _CACHED_SECTIONS[:3]:
            if accumulated_len + len(sec_text) + 20 <= max_chars:
                selected_parts.append(sec_text)
                accumulated_len += len(sec_text)

    return "\n\n---\n\n".join(selected_parts)
