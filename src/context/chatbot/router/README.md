# Chatbot Action Router

A strictly decoupled routing and action execution system for autonomous agent navigation, modal triggering, and tool calling.

---

## 1. Directory Structure

All files that you **freely edit, configure, or extend** live inside the **`config/`** folder:

```text
src/context/chatbot/router/
├── 📂 config/
│   ├── ⚙️ registry.ts       # Module 1: Route and action manifests
│   ├── ⚙️ handlers.ts       # Module 2: Action execution logic
│   ├── ⚙️ presets.ts        # Module 3: Preset keyword trigger rules
│   └── ⚙️ setup.ts          # Module 4: Customizable AI header & persona setup
│
├── 🔒 engine.ts            # Underlying engine (parsing, try/catch, dispatch)
└── 📄 README.md            # System documentation
```

<br />

### File Responsibilities

| File | Role | Description |
| :--- | :--- | :--- |
| **`config/registry.ts`** | **Registration Manifest** | • Pure dictionary listing all available routes, modals, and tools.<br />• Contains human and AI readable descriptions.<br />• Zero runtime execution logic. |
| **`config/handlers.ts`** | **Action Handlers** | • Execution definitions for each category and custom action.<br />• Contains business logic without engine boilerplate. |
| **`config/presets.ts`** | **Preset Keyword Triggers** | • Separate configuration file mapping user input keywords to deterministic actions.<br />• Triggers instantly without waiting for network AI models. |
| **`config/setup.ts`** | **AI Header Setup** | • Customizable AI persona, tone, rules, and preamble in English, Chinese, and Malay.<br />• Calls `generateRegistryCatalogText()` to automatically attach the dynamic tool list. |
| **`engine.ts`** | **Execution Engine** | • Background plumbing for JSON parsing and dispatching.<br />• Handles error catching and category matching.<br />• Locked file: does not need daily edits. |

---

<br />

## 2. How to Register Services

Whenever you want to add a new page route, anchor link, modal dialog, or custom tool, configure it in **`config/`**.

<br />

### 2.1 Register a Page Route or Anchor Link

Open **`config/registry.ts`** and add your route under `NAVIGATE`:

```typescript
NAVIGATE: {
  // Existing routes...
  "/settings": {
    en: "User account settings and preferences page.",
    zh: "用户账户设置与偏好偏好页面。",
    ms: "Halaman tetapan dan keutamaan akaun pengguna.",
  },
}
```

> **Automatic Execution**:<br />
> Navigation routes automatically invoke the locale-aware platform router (`context.navigateTo(path)`).<br />
> You **do not** need to touch `handlers.ts`.

---

<br />

### 2.2 Register a Modal Dialog

Open **`config/registry.ts`** and declare the modal identifier under `MODAL`:

```typescript
MODAL: {
  // Existing modals...
  "feedback": {
    en: "User feedback submission dialog.",
    zh: "用户意见反馈提交弹窗。",
    ms: "Dialog penyerahan maklum balas pengguna.",
  },
}
```

> **Automatic Execution**:<br />
> Modals automatically invoke `context.openModal(modalId)`.<br />
> You **do not** need to touch `handlers.ts`.

---

<br />

### 2.3 Register a Custom Tool or Action

#### Step 1: Declare the tool in `config/registry.ts` under `TOOL`

```typescript
TOOL: {
  "calculate_roi": {
    en: "Calculate career transformation return on investment.",
    zh: "计算职业转型投资回报率。",
    ms: "Kira pulangan pelaburan transformasi kerjaya.",
  },
}
```

<br />

#### Step 2: Implement its logic in `config/handlers.ts` inside `ACTION_HANDLERS`

```typescript
export const ACTION_HANDLERS = {
  // Custom tool implementation with multilingual context awareness
  "calculate_roi": async (args, context) => {
    // 1. Run your custom business computation
    const score = (args?.investment as number) * 1.8;

    // 2. Optionally display updates in the chat bubble stream
    context.addAssistantMessage?.(
      context.locale === "zh"
        ? `计算的 ROI 得分：${score}%`
        : context.locale === "ms"
        ? `Skor ROI dikira: ${score}%`
        : `Calculated ROI score: ${score}%`
    );

    return { score, timestamp: Date.now() };
  },
};
```

---

<br />

### 2.4 Customize AI Header Setup & Tool Synchronization

You can freely edit the AI's persona, preamble, instructions, and response format rules in **`config/setup.ts`**.

<br />

#### Editing Header Information in `config/setup.ts`

Open **`config/setup.ts`** and adjust `AGENT_HEADER_SETUP` for any language:

```typescript
export const AGENT_HEADER_SETUP: LocalizedHeaderSetup = {
  en: `You are SkillVerse AI Agent, an intelligent career navigator...`,
  zh: `您是 SkillVerse AI Agent，专注于职业领航与技能重塑的智能顾问...`,
  ms: `Anda adalah Ejen AI SkillVerse, pakar pintar navigasi kerjaya...`,
};
```

<br />

#### Automatic Tool Catalog Integration

`compileAgentSystemInstruction(locale)` in `setup.ts` automatically calls `generateRegistryCatalogText(locale)` to generate and attach the latest registered tools, modals, and navigation routes:

```typescript
import { compileAgentSystemInstruction } from "@/context/chatbot/router/config/setup";

// Generates complete System Instruction: Editable Header + Auto-generated Tool Catalog
const systemInstruction = compileAgentSystemInstruction(locale);
```

<br />

#### Multilingual System Prompts

| Locale | Generated Preamble (from `setup.ts`) | Auto-Attached Tool Catalog (from `registry.ts`) |
| :--- | :--- | :--- |
| **`"en"`** | English AI persona and JSON schema guidelines. | English routes, modals, and custom tools. |
| **`"zh"`** | 中文智能顾问角色设定与 JSON 约束指令。 | 中文页面路由、弹窗与工具清单。 |
| **`"ms"`** | Persona panduan kerjaya Bahasa Melayu & format JSON. | Laluan, modal, dan alat dalam Bahasa Melayu. |

<br />

> **Automatic Sync**:<br />
> Any time you add a new service to `config/registry.ts`, the prompts for all 3 languages are **automatically kept in sync**!

---

<br />

### 2.5 Configure Preset Input Triggers (Trilingual Keyword Fast-Path)

If you want specific words typed by the user in **English, Chinese, or Malay** to **immediately trigger an action without waiting for the AI network model**, configure them in **`config/presets.ts`**.

<br />

#### Adding a New Preset Trigger Rule

Open **`config/presets.ts`** and append your rule to `PRESET_INPUT_RULES`:

```typescript
export const PRESET_INPUT_RULES: PresetTriggerRule[] = [
  // Existing rules...

  // New Rule: Trilingual custom quick trigger
  {
    keywords: ["/demo", "run demo", "演示", "tunjuk demo"],
    action: {
      target: "/#transformation-plan",
      message: {
        en: "Navigating to transformation plan demo.",
        zh: "正在为您导航至转型规划方案演示区块。",
        ms: "Mengarahkan ke demo pelan transformasi.",
      },
    },
  },
];
```

<br />

#### Built-in Trilingual Preset Triggers

The following triggers are ready to use out-of-the-box in `config/presets.ts`:

| Trilingual Keywords (EN / ZH / MS) | Target | Action Executed |
| :--- | :--- | :--- |
| `"/analysis"`, `"analysis"`, `"技能分析"`, `"analisis"` | `"/analysis"` | Jumps directly to Skill Gap Analysis dashboard. |
| `"/upload"`, `"upload"`, `"上传简历"`, `"muat naik"` | `"upload"` | Opens resume file upload modal instantly. |
| `"/login"`, `"login"`, `"登录"`, `"log masuk"` | `"login"` | Opens authentication login modal. |
| `"/register"`, `"register"`, `"注册"`, `"daftar"` | `"register"` | Opens new user registration modal. |
| `"/profile"`, `"profile"`, `"个人资料"`, `"profil"` | `"profile"` | Opens user profile settings dialog. |
| `"/market"`, `"market"`, `"趋势"`, `"pasaran"` | `"/#labor-market"` | Scrolls to live labor market telemetry section. |
| `"/radar"`, `"radar"`, `"雷达"`, `"radar kemahiran"` | `"/#skill-trend-check"` | Scrolls to skill trend diagnostic radar. |
| `"/shared"`, `"shared"`, `"社区"`, `"komuniti"` | `"/shared"` | Navigates to community shared roadmaps. |

<br />

> **Deterministic & Instant**:<br />
> Matching occurs client-side in `sendMessage` before any LLM API call.<br />
> If a keyword in any of the 3 languages matches, the target modal or route triggers in ~300ms with a localized response!

---

<br />

## 3. How to Use

<br />

### 3.1 Expected AI Return Format (JSON)

When the AI decides to perform an action, it must reply with this JSON format:

```json
{
  "target": "/analysis",
  "message": "I found 3 skill gap recommendations. Redirecting you to the analysis page now!",
  "args": {
    "roleId": "sustainable-energy-specialist",
    "filter": "sdg-8"
  }
}
```

<br />

#### JSON Field Specifications

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`target`** | `string` | **Yes** | Destination route, modal, or custom tool name.<br />Examples: `"/analysis"`, `"/#skill-trend-check"`, `"upload"`, `"export_report"`. |
| **`message`** | `string` | No | Accompanying text displayed to the user in the chat bubble. |
| **`args`** | `object` | No | Optional key-value parameters forwarded to custom action handlers. |

<br />

> **Conversational Only**:<br />
> If the AI is only chatting without actions, omit `target` (e.g. `{ "message": "Hello! How can I assist you?" }` or plain text).<br />
> The message bubble appears without triggering navigation.

---

<br />

### 3.2 How AI Responses are Executed Automatically

#### Workflow A: Chatbot Conversational Flow (`sendMessage`)

When a user chats in the floating chatbot window:

1. User enters text and sends message.<br />
2. `sendMessage(prompt)` dispatches inquiry to backend LLM.<br />
3. Backend LLM responds with the action JSON.<br />
4. The engine **automatically** executes:
   - `resolveAgentDirective(aiJson)`: Parses target, message, and args.<br />
   - `dispatchAgentBranch(directive, context)`: Matches category and executes route or tool.<br />
   - User is redirected to target page and sees the confirmation chat bubble.

<br />

#### Workflow B: Feeding AI JSON Directly (`executeAction`)

If your component or backend client receives an AI response JSON directly, simply pass it into `executeAction(json)`:

```tsx
const { executeAction } = useChatbot();

// Automatically detects category ("NAVIGATE", "MODAL", "TOOL") and runs it
await executeAction(aiResponseJson);
```

---

<br />

### 3.3 Component Integration Examples

Import `useChatbot` in any React component to trigger actions or display chat dialogs:

```tsx
"use client";

import React from "react";
import { useChatbot } from "@/context/chatbot/ChatbotContext";

export function SkillActionButtons() {
  const { askAgent, executeAction, sendMessage } = useChatbot();

  return (
    <div className="flex gap-4">
      {/* Pattern 1: Conversational prompt (opens chatbot and asks AI) */}
      <button
        onClick={() => askAgent("Analyze my skill gaps for SDG 8 roles", { autoOpen: true })}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        Ask AI to Analyze
      </button>

      {/* Pattern 2: Direct route navigation (executes immediately with confirmation bubble) */}
      <button
        onClick={() => executeAction({
          target: "/analysis",
          message: "Navigating directly to Skill Gap Analysis...",
        })}
        className="px-4 py-2 bg-teal-600 text-white rounded-lg"
      >
        Go to Analysis
      </button>

      {/* Pattern 3: Direct tool call with custom parameters */}
      <button
        onClick={() => executeAction({
          target: "export_report",
          args: { format: "pdf", includeBenchmarks: true },
          message: "Exporting your benchmark report as PDF...",
        })}
        className="px-4 py-2 bg-slate-800 text-white rounded-lg"
      >
        Export Report
      </button>
    </div>
  );
}
```

---

<br />

### 3.4 How Information and Messages are Displayed

1. **Automatic Message Bubble**:<br />
   Any `message` in the AI JSON is automatically inserted into the chat stream via `context.addAssistantMessage(message)` with formatted timestamps.

<br />

2. **Tool Progress Updates**:<br />
   Inside custom tool handlers in `config/handlers.ts`, call `context.addAssistantMessage?.("Custom status update...")` at any time to stream progress updates directly into the user's chat modal.

<br />

3. **Reading History**:<br />
   Any component can access `const { messages, isTyping } = useChatbot();` to read the active conversation stream.
