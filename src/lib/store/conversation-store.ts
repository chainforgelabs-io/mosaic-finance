import { create } from "zustand";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ConversationStore {
  sessionId: string | null;
  sessionType:
    | "fact-find"
    | "risk-profile"
    | "walkthrough"
    | "followup"
    | null;
  messages: ConversationMessage[];
  isLoading: boolean;
  sessionComplete: boolean;
  extractedData: Record<string, unknown> | null;
  setSession: (id: string, type: ConversationStore["sessionType"]) => void;
  addMessage: (msg: ConversationMessage) => void;
  setLoading: (loading: boolean) => void;
  completeSession: (data: Record<string, unknown>) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  sessionId: null,
  sessionType: null,
  messages: [],
  isLoading: false,
  sessionComplete: false,
  extractedData: null,
  setSession: (id, type) => set({ sessionId: id, sessionType: type }),
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
  completeSession: (data) =>
    set({ sessionComplete: true, extractedData: data }),
  reset: () =>
    set({
      sessionId: null,
      sessionType: null,
      messages: [],
      isLoading: false,
      sessionComplete: false,
      extractedData: null,
    }),
}));
