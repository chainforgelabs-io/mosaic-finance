import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachmentName?: string;
}

export interface ExtractedTopics {
  income: boolean;
  expenses: boolean;
  debts: boolean;
  goals: boolean;
  retirement: boolean;
  investments: boolean;
  knowledge: boolean;
  risk: boolean;
}

export interface ExtractedSummary {
  monthly_income?: string;
  annual_income?: string;
  monthly_expenses?: string;
  total_debts?: string;
  financial_goals?: string[];
  target_retirement_age?: number;
  current_investments?: string;
  knowledge_level?: string;
  risk_score?: string;
  conversational_summary?: string;
}

interface ConversationState {
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  extractedTopics: ExtractedTopics;
  sessionComplete: boolean;
  summaryData: ExtractedSummary | null;
  error: string | null;

  setSessionId: (id: string) => void;
  addMessage: (message: Message) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setExtractedTopics: (topics: Partial<ExtractedTopics>) => void;
  setSessionComplete: (complete: boolean) => void;
  setSummaryData: (data: ExtractedSummary | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialTopics: ExtractedTopics = {
  income: false,
  expenses: false,
  debts: false,
  goals: false,
  retirement: false,
  investments: false,
  knowledge: false,
  risk: false,
};

export const useConversationStore = create<ConversationState>((set) => ({
  sessionId: null,
  messages: [],
  isStreaming: false,
  extractedTopics: { ...initialTopics },
  sessionComplete: false,
  summaryData: null,
  error: null,

  setSessionId: (id) => set({ sessionId: id }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIdx = messages.findLastIndex((m) => m.role === "assistant");
      if (lastIdx !== -1) {
        messages[lastIdx] = { ...messages[lastIdx], content };
      }
      return { messages };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setExtractedTopics: (topics) =>
    set((state) => ({
      extractedTopics: { ...state.extractedTopics, ...topics },
    })),

  setSessionComplete: (complete) => set({ sessionComplete: complete }),

  setSummaryData: (data) => set({ summaryData: data }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      sessionId: null,
      messages: [],
      isStreaming: false,
      extractedTopics: { ...initialTopics },
      sessionComplete: false,
      summaryData: null,
      error: null,
    }),
}));
