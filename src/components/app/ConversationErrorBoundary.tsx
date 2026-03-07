"use client";

import { Component, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
  timedOut: boolean;
}

const TIMEOUT_MS = 120_000;

export class ConversationErrorBoundary extends Component<Props, State> {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null, timedOut: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: error.message };
  }

  componentWillUnmount() {
    this.clearTimeout();
  }

  startTimeout() {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      this.setState({
        hasError: true,
        timedOut: true,
        errorMessage: "The conversation is taking longer than expected.",
      });
    }, TIMEOUT_MS);
  }

  clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  resetTimeout() {
    this.startTimeout();
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null, timedOut: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--warm-200)] bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--error)]/10">
              <RotateCcw className="size-5 text-[var(--error)]" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              Something went wrong
            </h3>
            <p className="mt-2 font-body text-[14px] text-[var(--text-secondary)]">
              {this.state.timedOut
                ? "The conversation is taking longer than expected. Please try again."
                : "An error occurred during the conversation. Please try again."}
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--emerald)] px-5 py-2.5 font-display text-[14px] font-semibold text-white transition-colors hover:bg-[var(--emerald-dark)]"
            >
              <RotateCcw className="size-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
