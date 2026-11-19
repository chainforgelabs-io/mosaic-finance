/** A finished fact-find can take one more user message so a correction can continue. */
export function canReopenCompletedFactFind(input: {
  status: string;
  sessionType: string;
  requestedType: string;
  hasMessage: boolean;
}): boolean {
  return (
    input.status === "completed" &&
    input.sessionType === "fact-find" &&
    input.requestedType === "fact-find" &&
    input.hasMessage
  );
}
