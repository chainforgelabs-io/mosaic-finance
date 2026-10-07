"use client";

import { create } from "zustand";
import type { ConversationMessage } from "@/types";

interface WalkthroughStore {
  currentSectionIndex: number;
  messages: ConversationMessage[];
  isStreaming: boolean;
  isComplete: boolean;

  setCurrentSectionIndex: (index: number) => void;
  advanceSection: () => void;
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (id: string, content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsComplete: (complete: boolean) => void;
  reset: () => void;
}

export const useWalkthroughStore = create<WalkthroughStore>((set) => ({
  currentSectionIndex: 0,
  messages: [],
  isStreaming: false,
  isComplete: false,

  setCurrentSectionIndex: (index) => set({ currentSectionIndex: index }),
  advanceSection: () =>
    set((state) => ({ currentSectionIndex: Math.min(state.currentSectionIndex + 1, 7) })),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setIsComplete: (isComplete) => set({ isComplete }),
  reset: () =>
    set({ currentSectionIndex: 0, messages: [], isStreaming: false, isComplete: false }),
}));
