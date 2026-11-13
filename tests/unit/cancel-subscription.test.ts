import { describe, expect, it, vi } from "vitest";
import {
  cancelSubscriptionsForDeletion,
  isAlreadyGoneSubscription,
  subscriptionIdsToCancel,
} from "@/lib/account/cancel-subscription";
import { EXPORT_TABLES } from "@/lib/account/export-tables";

describe("subscriptionIdsToCancel", () => {
  it("cancels live subscriptions and a stored id that is still billing", () => {
    expect(
      subscriptionIdsToCancel("sub_stored", [
        { id: "sub_active", status: "active" },
        { id: "sub_past_due", status: "past_due" },
        { id: "sub_trial", status: "trialing" },
        { id: "sub_paused", status: "paused" },
        { id: "sub_done", status: "canceled" },
        { id: "sub_expired", status: "incomplete_expired" },
      ]),
    ).toEqual(["sub_active", "sub_past_due", "sub_trial", "sub_paused", "sub_stored"]);
  });

  it("skips a stored subscription that Stripe already lists as canceled", () => {
    expect(
      subscriptionIdsToCancel("sub_done", [{ id: "sub_done", status: "canceled" }]),
    ).toEqual([]);
  });
});

describe("cancelSubscriptionsForDeletion", () => {
  it("does nothing when the account has no Stripe ids", async () => {
    const listByCustomer = vi.fn();
    const cancel = vi.fn();
    await cancelSubscriptionsForDeletion({
      subscriptionId: null,
      customerId: null,
      listByCustomer,
      cancel,
    });
    expect(listByCustomer).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("cancels the live subscription and ignores one Stripe already removed", async () => {
    const cancel = vi.fn(async (id: string) => {
      if (id === "sub_missing") {
        throw Object.assign(new Error("No such subscription"), { code: "resource_missing" });
      }
    });
    await cancelSubscriptionsForDeletion({
      subscriptionId: "sub_missing",
      customerId: "cus_123",
      listByCustomer: async () => [{ id: "sub_active", status: "active" }],
      cancel,
    });
    expect(cancel).toHaveBeenCalledWith("sub_active");
    expect(cancel).toHaveBeenCalledWith("sub_missing");
  });

  it("stops when Stripe refuses the cancel", async () => {
    await expect(
      cancelSubscriptionsForDeletion({
        subscriptionId: "sub_active",
        customerId: null,
        listByCustomer: async () => [],
        cancel: async () => {
          throw new Error("stripe down");
        },
      }),
    ).rejects.toThrow("stripe down");
  });
});

describe("isAlreadyGoneSubscription", () => {
  it("treats a missing or already canceled subscription as gone", () => {
    expect(isAlreadyGoneSubscription(Object.assign(new Error("nope"), { code: "resource_missing" }))).toBe(true);
    expect(isAlreadyGoneSubscription(new Error("This subscription has already been canceled"))).toBe(true);
    expect(isAlreadyGoneSubscription(new Error("card declined"))).toBe(false);
  });
});

describe("export tables", () => {
  it("includes score history, achievements, and tracked-finance tables", () => {
    expect(EXPORT_TABLES).toEqual(
      expect.arrayContaining([
        "health_score_history",
        "user_achievements",
        "category_budgets",
        "user_categories",
        "balance_checks",
        "cash_anchors",
        "spending_baselines",
        "document_uploads",
      ]),
    );
  });
});
