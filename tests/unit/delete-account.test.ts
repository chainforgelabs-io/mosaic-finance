import { describe, expect, it } from "vitest";
import { ACCOUNT_DATA_TABLES } from "@/lib/account/delete-account";

describe("account deletion order", () => {
  it("clears messages, plans, and transactions before the profile row", () => {
    expect(ACCOUNT_DATA_TABLES[0]).toBe("conversation_messages");
    expect(ACCOUNT_DATA_TABLES.indexOf("conversation_messages")).toBeLessThan(
      ACCOUNT_DATA_TABLES.indexOf("conversation_sessions"),
    );
    expect(ACCOUNT_DATA_TABLES.indexOf("approval_queue")).toBeLessThan(
      ACCOUNT_DATA_TABLES.indexOf("financial_plans"),
    );
    expect(ACCOUNT_DATA_TABLES.indexOf("transactions")).toBeLessThan(
      ACCOUNT_DATA_TABLES.indexOf("document_uploads"),
    );
    expect(ACCOUNT_DATA_TABLES).not.toContain("user_profiles");
  });
});
