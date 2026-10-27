"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/auth/AuthContext";
import { useProfileModal } from "@/context/auth/ProfileModalContext";
import { usePlanModal } from "@/context/page-analysis/PlanModalContext";
import type { ChatMessage } from "@/components/chatbot/ChatbotModal";
import {
  type AgentActionType,
  type AgentDirective,
  type AgentExecutionResult,
  type AgentActionContext,
  resolveAgentDirective,
  dispatchAgentBranch,
  matchPresetTrigger,
} from "./router/engine";

// Re-export directive types for consumer convenience.
export type { AgentActionType, AgentDirective, AgentExecutionResult, AgentActionContext };
export type AgentAction = AgentDirective;

// ==========================================
// Context Contracts
// ==========================================

// Interface contract exposed by ChatbotContext.
export interface ChatbotContextType {
  // Dialog visibility state and toggle handlers.
  isOpen: boolean;
  openChatbot: () => void;
  closeChatbot: () => void;
  toggleChatbot: () => void;

  // Conversational message state and controls.
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (textToSend?: string) => Promise<void>;
  askAgent: (prompt: string, options?: { autoOpen?: boolean }) => Promise<void>;
  addAssistantMessage: (text: string) => void;
  resetConversation: () => void;

  // Navigation and modal controls for agent page transitions.
  navigateTo: (path: string) => void;
  openModal: (modalType: string) => void;

  // Unified agent action dispatcher evaluating action branches.
  executeAction: (action: AgentDirective) => Promise<AgentExecutionResult>;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

/**
 * Chatbot Context Provider Component
 *
 * Centralizes conversational message streams, dialog modal visibility,
 * and unified route execution for autonomous agent navigation.
 * Localized messages are loaded directly from messages translation files.
 *
 * Component Requirements:
 * - Dialog Control: Provides programmatic open, close, and toggle actions for any page element.
 * - External Inquiries: Enables cross-component prompt dispatch via askAgent API.
 * - Action Dispatcher: Prepares localized routing transitions for agent logic.
 *
 * Workflow:
 * 1. Initialize conversational message streams, dialog visibility, and thinking states.
 * 2. Synchronize default localized welcome greeting when active locale messages change.
 * 3. Provide programmatic visibility handlers to toggle, open, and close the chatbot dialog.
 * 4. Coordinate locale-aware route transitions when agent navigation actions are dispatched.
 * 5. Manage unified modal launching across authentication and career roadmap flows.
 * 6. Dispatch high-level agent directives across workflow branches via chatbotActionRouter.
 * 7. Process user inquiries, resolve action directives, and deliver responses with offline fallback.
 * 8. Expose consolidated chatbot context bundle to consumer trees.
 */
export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  // ==========================================
  // Step 1: Initialize Conversational Message Streams, Dialog Visibility, and Thinking States
  // ==========================================
  const t = useTranslations("chatbot.messages");
  const locale = useLocale();
  const router = useRouter();

  const { isLoggedIn, openAuthModal } = useAuth();
  const { openProfileModal } = useProfileModal();
  const { openUploadOption, openWizardOption, openPathwaySelect } = usePlanModal();

  // Dialog visibility state.
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Conversational message history, input buffer, and thinking indicator states.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Cached localized greeting, offline notice, and authentication gate strings.
  const welcomeText = t("welcome");
  const offlineText = t("offline");
  const requireLoginText = t("require_login");

  // ==========================================
  // Step 2: Synchronize Default Localized Welcome Greeting When Active Locale Messages Change
  // ==========================================
  useEffect(() => {
    setMessages([
      {
        id: "welcome-1",
        sender: "bot",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [welcomeText]);

  // ==========================================
  // Step 3: Provide Programmatic Visibility Handlers to Toggle, Open, and Close the Chatbot Dialog
  // ==========================================
  const openChatbot = useCallback(() => setIsOpen(true), []);

  const closeChatbot = useCallback(() => setIsOpen(false), []);

  const toggleChatbot = useCallback(() => setIsOpen((prev) => !prev), []);

  // ==========================================
  // Step 4: Coordinate Locale-Aware Route Transitions When Agent Navigation Actions Are Dispatched
  // ==========================================
  const navigateTo = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  // Append assistant message directly to the conversational history.
  const addAssistantMessage = useCallback((text: string) => {
    const assistantMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: "bot",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, assistantMsg]);
  }, []);

  // ==========================================
  // Step 5: Manage Unified Modal Launching Across Authentication and Career Roadmap Flows
  // ==========================================
  const openModal = useCallback(
    (modalType: string) => {
      switch (modalType) {
        case "login":
          openAuthModal("login");
          break;
        case "register":
          openAuthModal("register");
          break;
        case "forgot_password":
        case "forgot-password":
        case "forgot":
          openAuthModal("forgot");
          break;
        case "profile":
          openProfileModal();
          break;
        case "upload":
          openUploadOption();
          break;
        case "wizard":
          openWizardOption();
          break;
        case "pathway_select":
        case "pathway-select":
          openPathwaySelect();
          break;
        default:
          window.dispatchEvent(new CustomEvent("chatbot-open-modal", { detail: { modalType } }));
          break;
      }
    },
    [openAuthModal, openProfileModal, openUploadOption, openWizardOption, openPathwaySelect]
  );

  // ==========================================
  // Step 6: Dispatch High-Level Agent Directives Across Workflow Branches via ChatbotActionRouter
  // ==========================================
  const executeAction = useCallback(
    async (action: AgentDirective): Promise<AgentExecutionResult> => {
      return await dispatchAgentBranch(action, {
        navigateTo,
        openModal,
        addAssistantMessage,
        locale,
      });
    },
    [navigateTo, openModal, addAssistantMessage, locale]
  );

  // ==========================================
  // Step 7: Process User Inquiries, Resolve Action Directives, and Deliver Responses With Offline Fallback
  // ==========================================
  const sendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? inputValue).trim();
      if (!text) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputValue("");

      // Activate thinking loading state.
      setIsTyping(true);

      // Verify user authentication status before granting access to AI services.
      if (!isLoggedIn) {
        setTimeout(() => {
          const authNoticeMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: requireLoginText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, authNoticeMsg]);
          setIsTyping(false);
          openAuthModal("login");
        }, 400);
        return;
      }

      // Evaluate deterministic preset keyword rules from presets.ts.
      const presetDirective = matchPresetTrigger(text, locale);
      if (presetDirective) {
        setTimeout(async () => {
          await dispatchAgentBranch(presetDirective, {
            navigateTo,
            openModal,
            addAssistantMessage,
            locale,
          });
          setIsTyping(false);
        }, 300);
        return;
      }

      // Simulate network response latency before processing AI output and action directives.
      setTimeout(async () => {
        // Resolve agent directive directly from AI returned output.
        const directive = resolveAgentDirective(offlineText);

        if (!directive.isMessageOnly && directive.target) {
          await dispatchAgentBranch(directive, {
            navigateTo,
            openModal,
            addAssistantMessage,
            locale,
          });
        } else {
          const botResponse: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: directive.message || offlineText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages((prev) => [...prev, botResponse]);
        }

        setIsTyping(false);
      }, 1200);
    },
    [inputValue, isLoggedIn, requireLoginText, offlineText, locale, navigateTo, openModal, openAuthModal, addAssistantMessage]
  );

  // Dispatch programmatic inquiries with optional automatic dialog opening.
  const askAgent = useCallback(
    async (prompt: string, options?: { autoOpen?: boolean }) => {
      if (options?.autoOpen !== false) {
        setIsOpen(true);
      }
      await sendMessage(prompt);
    },
    [sendMessage]
  );

  // Reset conversational message history to default greeting.
  const resetConversation = useCallback(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "bot",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [welcomeText]);

  // ==========================================
  // Step 8: Expose Consolidated Chatbot Context Bundle to Consumer Trees
  // ==========================================
  const contextValue: ChatbotContextType = {
    isOpen,
    openChatbot,
    closeChatbot,
    toggleChatbot,
    messages,
    isTyping,
    inputValue,
    setInputValue,
    sendMessage,
    askAgent,
    addAssistantMessage,
    resetConversation,
    navigateTo,
    openModal,
    executeAction,
  };

  return <ChatbotContext.Provider value={contextValue}>{children}</ChatbotContext.Provider>;
}

// ==========================================
// Custom Consumer Hook
// ==========================================

/**
 * useChatbot Hook
 *
 * Ingests shared chatbot context to control dialog visibility, dispatch inquiries,
 * and access agent navigation primitives.
 */
export function useChatbot(): ChatbotContextType {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within a ChatbotProvider.");
  }
  return context;
}
