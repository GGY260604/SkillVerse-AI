# ESCO Role Velocity & Viability Engine: Architectural Specification

## 1. Executive Summary & Problem Definition

### 1.1 The Career Viability Problem
When learners or job seekers explore workforce transitions or submit a career goal, knowing that a target role matches their existing skills is only half of the equation. In an era of rapid AI automation and macroeconomic restructuring:
- A candidate may match 85% with a **"Legacy Monolithic Scripting Operator"** or **"Data Entry Coordinator"**, but pursuing this role represents high automation displacement risk.
- Conversely, transitioning towards an **"AI Agent Systems Architect"** or **"Clean Energy Grid Modeler"** represents surging market demand and long-term career viability.

SkillVerse AI transforms the static European Skills, Competences, Qualifications and Occupations (**ESCO**) taxonomy into a **Living Labor Taxonomy** by assigning an empirical **Role Velocity metric ($V_{\text{role}}$)** to every occupational role in the system.

---

## 2. Mathematical Formulation of Role Velocity ($V_{\text{role}}$)

### 2.1 The Competency Portfolio Model
An occupational role $R$ is defined by its required skills portfolio $S = \{s_1, s_2, \dots, s_k\}$.
Each skill $s_i$ possesses an instantaneous trend velocity $V_s(s_i)$ tracked in the Supabase `trend_signals` table.

The unadjusted role momentum $V_{\text{skills}}(R)$ is the weighted arithmetic mean of its constituent skill velocities:

$$V_{\text{skills}}(R) = \frac{1}{|S|} \sum_{s \in S} w_s \cdot V_s(s)$$

Where:
- $w_s$ represents the competency criticality weight (normalized such that $\sum w_s = 1.0$; default uniform weight $w_s = \frac{1}{|S|}$).
- $V_s(s)$ is the instantaneous velocity score from `trend_signals` derived from live frequency acceleration:
  $$V_s = \frac{C_t - C_{t-1}}{C_{t-1}}$$

### 2.2 Macroeconomic Scenario Calibration
The net **Role Velocity ($V_{\text{role}}$)** incorporates macroeconomic multipliers based on simulated economic trajectories:

$$V_{\text{role}} = \text{round}\left( V_{\text{skills}}(R) \times M_{\text{scenario}}, 3 \right)$$

Where $M_{\text{scenario}}$ is defined per role industry in `esco_roles.scenario_multipliers`:
- **Moderate Baseline** (`moderate`): $M_{\text{scenario}} = 1.00$
- **Accelerated AI Disruption** (`accelerated_ai`): $M_{\text{scenario}} \in [1.15, 1.35]$ for high-cognitive/AI roles; $[0.65, 0.85]$ for routine clerical roles.
- **Green Economy Transition** (`green_economy`): $M_{\text{scenario}} \in [1.10, 1.30]$ for clean tech/ESG roles.

---

## 3. The 3-Tier Market Viability Classification

Every role is categorized into one of three transparent market tiers:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Role Velocity (V_role)                 │
                  └───────────────────────────┬────────────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              ▼                               ▼                               ▼
       V_role >= +0.25           -0.10 <= V_role < +0.25               V_role < -0.10
   ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
   │  🟢 ON-TREND ROLE    │       │   🔵 STABLE CORE     │       │ 🔴 FALLING BEHIND    │
   │  (High Expansion)    │       │   (Baseline Demand)  │       │ (Automation Risk)    │
   └──────────────────────┘       └──────────────────────┘       └──────────────────────┘
```

| Tier Label | Threshold | Visual Badge | Guidance Provided to User |
| :--- | :--- | :--- | :--- |
| **`on_trend`** | $V_{\text{role}} \ge +0.25$ | 🟢 **`+48.0% On-Trend`** | **Highly Recommended to Pursue.** Labor demand is growing faster than talent supply; future-proof career trajectory. |
| **`stable`** | $-0.10 \le V_{\text{role}} < +0.25$ | 🔵 **`+6.5% Stable Core`** | **Foundational Career Path.** Consistent market absorption; minimal near-term automation volatility. |
| **`falling_behind`** | $V_{\text{role}} < -0.10$ | 🔴 **`-28.4% Falling Behind`** | **Upskilling Advised.** Core tasks face automation displacement; system suggests upskilling toward adjacent AI-augmented roles. |

---

## 4. The 4-Tier Cascading Fallback Hierarchy for Unindexed Skills

When evaluating a role whose required skills are **not yet indexed in `trend_signals`**, the engine uses a **4-Tier Cascading Resolution**:

```
                       [ Unindexed Required Skill ]
                                     │
                                     ▼
       ┌────────────────────────────────────────────────────────┐
       │ Tier 1: BGE-M3 Semantic Vector Transfer                │
       │ Cosine match against all 168 signals in `trend_signals`│
       └─────────────────────────────┬──────────────────────────┘
                                     │
                   ┌─────────────────┴─────────────────┐
                   ▼ (Match >= 0.70)                   ▼ (No vector match < 0.70)
         [ Semantic Neighbor Found ]           ┌────────────────────────────────┐
         e.g. "AI Safety & Alignment"          │ Tier 2: Economic "Stable Core" │
         Transfer discounted velocity:         │ Baseline (Vs = 0.00)           │
         Vs = sim * Vs_neighbor                └───────────────┬────────────────┘
                                                               │
                                                               ▼
                                               ┌────────────────────────────────┐
                                               │ Tier 3: Sector Macro Multiplier│
                                               │ (e.g. AI Sector = +0.15)       │
                                               └───────────────┬────────────────┘
                                                               │
                                                               ▼
                                               ┌────────────────────────────────┐
                                               │ Tier 4: Self-Expanding Intake  │
                                               │ Auto-registers into next sync  │
                                               └────────────────────────────────┘
```

### Tier 1: BGE-M3 Semantic Vector Transfer
Even if a skill string differs from the canonical database name (e.g., `"PyTorch Model Acceleration"` vs. `"AI Safety & Alignment Auditing"`), both exist in the dense 1024-dimensional BGE-M3 vector space.
1. Compute cosine similarity $\text{sim} = \cos(\mathbf{v}_{\text{unknown}}, \mathbf{v}_{\text{signal}})$.
2. If $\text{sim} \ge 0.70$, inherit the neighbor's velocity with a soft discount:
   $$V_s(\text{unknown}) = \text{sim} \times V_s(\text{neighbor})$$

### Tier 2: The "Stable Core Competency" Economic Prior ($V_s = 0.00$)
In labor economics (OECD, BLS), >70% of occupational skills (e.g., *Git, SQL, Project Documentation, Problem Solving*) are foundational competencies. They do not experience extreme surges or abrupt collapse.
- If no emerging or declining trend signal matches, default to **$V_s = 0.00$**.
- This ensures foundational competencies do not penalize emerging roles into negative scores.

### Tier 3: Sector Macro Multiplier Prior ($V_{\text{sector}}$)
If a role consists primarily of specialized niche skills outside the standard catalog, it inherits the industry growth prior from `esco_roles.industry`:
- **Responsible AI & Digital Transformation**: Baseline $V_{\text{base}} = \mathbf{+0.15}$
- **Clean Energy & ESG**: Baseline $V_{\text{base}} = \mathbf{+0.12}$
- **Enterprise Operations**: Baseline $V_{\text{base}} = \mathbf{0.00}$
- **Legacy Clerical / Manual Operations**: Baseline $V_{\text{base}} = \mathbf{-0.15}$

### Tier 4: Self-Expanding Ingestion Backlog
Any unindexed skill encountered in user queries is asynchronously added to an ingestion backlog. On the next scheduled run of `trend_sync_service.py`, RemoteOK and ArXiv live feeds specifically target that competency to establish empirical frequency counts.

---

## 5. Backend Services Update Specification

### 5.1 Service 1: `src/fastapi/services/trends/trend_sync_service.py`
**Trigger**: Periodic cron or `POST /api/v1/trends/sync`.
**Action**:
1. After updating `trend_signals`, fetch all roles from Supabase `esco_roles`.
2. Compute $V_{\text{role}}$ for each role using the active skill velocity lookup map.
3. Batch update `esco_roles.scenario_multipliers` with:
   ```json
   {
     "moderate": 1.0,
     "accelerated_ai": 1.15,
     "green_economy": 1.10,
     "velocityVs": 0.48,
     "trendStatus": "on_trend"
   }
   ```
*(Zero DDL migration required — utilizes existing `Json` column in PostgreSQL).*

### 5.2 Service 2: `src/fastapi/services/analyze/matching_service.py`
**Trigger**: Profile analysis and target role matching (`POST /api/page-analysis/analyze`).
**Action**:
1. In `match_candidate_to_roles`: Read each role's `velocityVs` and `trendStatus`, passing them into `MatchedRole`.
2. In `synthesize_on_demand_role`: For novel roles synthesized by LLM, prompt Tier 1 Qwen / Tier 2 Gemini to evaluate role velocity ($V_{\text{role}}$) and viability reason based on live trend benchmarks.

### 5.3 Service 3: `src/fastapi/services/trends/skill_search_service.py`
**Trigger**: Skill search diagnostics (`GET /api/v1/trends/search`).
**Action**:
1. In `match_closest_esco_roles_via_bge` and `persist_new_roles_to_supabase`:
2. Attach `roleVelocity`, `growthRatePercent`, `trendStatus`, and localized labels to each of the top 5 `EscoRoleSuggested` items.

### 5.4 Schemas: `src/fastapi/schemas/trends.py` & `analysis.py`
Add the following fields:
```python
roleVelocity: float = Field(default=0.0, description="Calculated role velocity Vs (-1.0 to +1.0)")
roleGrowthRatePercent: str = Field(default="+0.0%", description="Formatted percentage string")
roleTrendStatus: str = Field(default="stable", description="on_trend | stable | falling_behind")
roleTrendStatusLocalized: Dict[str, str] = Field(default_factory=dict, description="Trilingual status labels")
pursueRecommendation: Dict[str, str] = Field(default_factory=dict, description="Strategic career advisory")
```

---

## 6. Frontend UI Integration Blueprint

### 6.1 Home Skill Diagnostic (`SkillTrendCheck.tsx`)
On each of the 5 horizontal suggested role cards:
- Render a dynamic status badge alongside the similarity score:
  - 🟢 **`+45% On-Trend`** (Emerald glow)
  - 🔵 **`+5% Stable`** (Slate/Blue border)
  - 🔴 **`-28% Lagging`** (Rose border)
- Display a 1-line guidance banner: *"Strong market expansion — high viability to pursue"* or *"Automation risk — pair with AI tools"*.

### 6.2 Target Role Selector (`RoleSelectorModal.tsx`)
When a user selects a target role or reviews the streaming matching recommendations:
- Each candidate role choice displays its viability badge next to the title.
- Enables the candidate to verify if their chosen career aspiration is growing before committing to roadmap generation.

---

## 7. Trilingual Localization Mapping

| Key | English (`en`) | Bahasa Melayu (`ms`) | Simplified Chinese (`zh`) |
| :--- | :--- | :--- | :--- |
| **`on_trend`** | On-Trend (High Growth) | Trend Meningkat (Pertumbuhan Tinggi) | 强劲增长 (重点推荐) |
| **`stable`** | Stable Core Competency | Stabil (Kompetensi Asas) | 平稳基石 (需求稳健) |
| **`falling_behind`** | Falling Behind (Automation Risk) | Ketinggalan (Berisiko Automasi) | 面临淘汰 (转型预警) |
| **`recommend_pursue`** | Highly viable career path with expanding workforce demand. | Laluan kerjaya yang amat berdaya maju dengan permintaan pasaran yang berkembang pesat. | 具备极高职业拓展前景，企业招聘需求加速扩张。 |
| **`recommend_upskill`** | Core tasks face automation pressure; prioritize AI-augmented tooling. | Tugas teras menghadapi tekanan automasi; utamakan penguasaan alatan berkuasa AI. | 基础工作流面临自动化替代风险，建议重点补充 AI 增效工具链。 |
