import { type RouteCategory, findTargetCategory } from "./config/registry";
import { ACTION_HANDLERS } from "./config/handlers";
export * from "./config/presets";
export * from "./config/setup";

// ==========================================
// Runtime Context and Directive Contracts
// ==========================================

// Execution runtime context containing platform callbacks required by action handlers.
export interface AgentActionContext {
  navigateTo: (path: string) => void;
  openModal?: (modalType: string) => void;
  addAssistantMessage?: (text: string) => void;
  locale?: string;
  hasCustomMessage?: boolean;
  toggleTheme?: (theme?: string) => void;
}

// Structured execution result returned after processing an action.
export interface AgentExecutionResult {
  success: boolean;
  category: RouteCategory | "MESSAGE" | "FALLBACK";
  message?: string;
  details?: unknown;
}

// Standardized directive instruction structure resolved from AI responses.
export interface AgentDirective {
  target: string;
  type?: RouteCategory | "MESSAGE" | "FALLBACK";
  args?: Record<string, unknown>;
  message?: string;
  isMessageOnly?: boolean;
}

// Backward-compatible type alias.
export type AgentActionType = RouteCategory | "MESSAGE" | "FALLBACK";

/**
 * Agent Directive Resolver
 *
 * Inspects AI response payloads and extracts normalized target keys and parameters.
 *
 * Workflow:
 * 1. Inspect structured object payloads and extract normalized target keys.
 * 2. Parse embedded or serialized JSON payloads within text responses.
 * 3. Construct and return normalized AgentDirective instance.
 */
export function resolveAgentDirective(rawOutput: unknown): AgentDirective {
  // ==========================================
  // Step 1: Inspect Structured Object Payloads and Extract Normalized Target Keys
  // ==========================================
  if (typeof rawOutput === "object" && rawOutput !== null) {
    const obj = rawOutput as Record<string, unknown>;
    const targetKey =
      (obj.target as string) ||
      (obj.path as string) ||
      (obj.route as string) ||
      (obj.action as string) ||
      (obj.toolName as string) ||
      (obj.tool as string);

    if (targetKey && typeof targetKey === "string") {
      const category = findTargetCategory(targetKey) || (targetKey.startsWith("/") ? "NAVIGATE" : "TOOL");

      return {
        target: targetKey,
        type: category,
        args: typeof obj.args === "object" && obj.args !== null ? (obj.args as Record<string, unknown>) : undefined,
        message: typeof obj.message === "string" ? obj.message : undefined,
        isMessageOnly: false,
      };
    }
  }

  // Convert raw value to string if input is a text stream or serial string.
  const textContent = typeof rawOutput === "string" ? rawOutput.trim() : "";
  if (!textContent) {
    return {
      target: "",
      type: "MESSAGE",
      message: "",
      isMessageOnly: true,
    };
  }

  // ==========================================
  // Step 2: Parse Embedded or Serialized JSON Payloads Within Text Responses
  // ==========================================
  const jsonBlockMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const potentialJson = jsonBlockMatch ? jsonBlockMatch[1] : textContent;

  try {
    const parsed = JSON.parse(potentialJson);
    if (typeof parsed === "object" && parsed !== null) {
      const targetKey =
        parsed.target ||
        parsed.path ||
        parsed.route ||
        parsed.action ||
        parsed.toolName ||
        parsed.tool;

      if (targetKey && typeof targetKey === "string") {
        const category = findTargetCategory(targetKey) || (targetKey.startsWith("/") ? "NAVIGATE" : "TOOL");

        return {
          target: targetKey,
          type: category,
          args: parsed.args || parsed.parameters,
          message: parsed.message || parsed.text,
          isMessageOnly: false,
        };
      }
    }
  } catch {
    // Continue evaluation if text is standard conversational language.
  }

  // ==========================================
  // Step 3: Construct and Return Normalized AgentDirective Instance
  // ==========================================
  return {
    target: "",
    type: "MESSAGE",
    message: textContent,
    isMessageOnly: true,
  };
}

/**
 * Underlying Route Action Execution Engine
 *
 * Runs target actions by invoking configured handlers from handlers.ts with full error handling.
 *
 * Workflow:
 * 1. Validate target identifier and identify category.
 * 2. Execute custom handler if route has a specialized override.
 * 3. Execute standardized category executor.
 * 4. Return structured execution status report.
 */
export async function executeRouteAction(
  target: string,
  args: Record<string, unknown> | undefined,
  context: AgentActionContext
): Promise<AgentExecutionResult> {
  // ==========================================
  // Step 1: Validate Target Identifier and Identify Category
  // ==========================================
  const cleanTarget = target.trim();
  if (!cleanTarget) {
    return {
      success: false,
      category: "FALLBACK",
      message: "Target route or action identifier is empty.",
    };
  }

  const category = findTargetCategory(cleanTarget);
  if (!category) {
    if (cleanTarget.startsWith("/")) {
      context.navigateTo(cleanTarget);
      return {
        success: true,
        category: "NAVIGATE",
        message: `Navigated to unregistered path "${cleanTarget}".`,
        details: { path: cleanTarget },
      };
    }

    return {
      success: false,
      category: "FALLBACK",
      message: `Unrecognized route or action "${cleanTarget}".`,
    };
  }

  // ==========================================
  // Step 2: Execute Custom Handler if Route Has a Specialized Override
  // ==========================================
  const cleanKey = cleanTarget.replace(/^(modal:|tool:|\/+)/, "");
  if (ACTION_HANDLERS[cleanKey]) {
    try {
      const details = await ACTION_HANDLERS[cleanKey](args, context);
      return {
        success: true,
        category,
        message: `Executed custom action "${cleanKey}".`,
        details,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        category,
        message: `Execution failed for custom action "${cleanKey}": ${errorMsg}`,
      };
    }
  }

  // ==========================================
  // Step 3: Execute Standardized Category Executor
  // ==========================================
  try {
    const categoryHandler = ACTION_HANDLERS[category];
    if (categoryHandler) {
      const targetParam = category === "MODAL" ? cleanKey : cleanTarget;
      const details = await categoryHandler(targetParam, context, args);
      return {
        success: true,
        category,
        message: `Successfully executed ${category} action "${cleanTarget}".`,
        details,
      };
    }

    // ==========================================
    // Step 4: Return Structured Execution Status Report
    // ==========================================
    return {
      success: false,
      category,
      message: `No handler defined for category "${category}".`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      category,
      message: `Execution failed for ${category} action "${cleanTarget}": ${errorMsg}`,
    };
  }
}

/**
 * Unified Agent Directive Dispatcher
 *
 * Routes a resolved directive to the category and route execution engine.
 *
 * Workflow:
 * 1. Validate incoming action directive and handle message-only payloads.
 * 2. Execute target route or tool via executeRouteAction.
 * 3. Deliver accompanying conversational message to assistant message stream.
 * 4. Return structured execution status result.
 */
export async function dispatchAgentBranch(
  directive: AgentDirective,
  context: AgentActionContext
): Promise<AgentExecutionResult> {
  // ==========================================
  // Step 1: Validate Incoming Action Directive and Handle Message-Only Payloads
  // ==========================================
  if (!directive) {
    return {
      success: false,
      category: "FALLBACK",
      message: "No action directive provided for execution.",
    };
  }

  // Deliver conversational message directly without execution.
  if (directive.isMessageOnly || directive.type === "MESSAGE" || !directive.target) {
    if (directive.message && context.addAssistantMessage) {
      context.addAssistantMessage(directive.message);
    }
    return {
      success: true,
      category: "MESSAGE",
      message: directive.message || "",
    };
  }

  // ==========================================
  // Step 2: Execute Target Route or Tool via executeRouteAction
  // ==========================================
  const execContext: AgentActionContext = {
    ...context,
    hasCustomMessage: Boolean(directive.message && directive.message.trim().length > 0),
  };
  const result = await executeRouteAction(directive.target, directive.args, execContext);

  // ==========================================
  // Step 3: Deliver Accompanying Conversational Message to Assistant Message Stream
  // ==========================================
  if (directive.message && context.addAssistantMessage) {
    context.addAssistantMessage(directive.message);
  }

  // ==========================================
  // Step 4: Return Structured Execution Status Result
  // ==========================================
  return result;
}
