/** xAI rejected the configured key. An ops problem, not an application bug. */
export class GrokConfigError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("Grok API key is disabled or unauthorized");
    this.name = "GrokConfigError";
    this.status = status;
  }
}
