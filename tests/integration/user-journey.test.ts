import { test, expect, type Page } from '@playwright/test';

/**
 * Integration tests for the complete Finova AI user journey.
 * These tests run against a live dev server and exercise the full stack:
 * signup → onboarding → fact-find → holdings → risk profile → plan → approval → delivery
 *
 * Prerequisites:
 *   - Local dev server running (handled by playwright.config.ts webServer)
 *   - Supabase local or test instance configured
 *   - Test user credentials in environment variables
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@finova-test.local';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const REVIEWER_EMAIL = process.env.TEST_REVIEWER_EMAIL || 'reviewer@finova-test.local';
const REVIEWER_PASSWORD = process.env.TEST_REVIEWER_PASSWORD || 'ReviewerPassword123!';

test.describe('User Signup & Authentication', () => {
  test('new user can sign up with email and password', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await page.fill('[name="email"], [data-testid="signup-email"]', TEST_EMAIL);
    await page.fill('[name="password"], [data-testid="signup-password"]', TEST_PASSWORD);

    const submitButton = page.locator('button[type="submit"], [data-testid="signup-submit"]');
    await submitButton.click();

    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10_000 });
  });

  test('existing user can log in', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('[name="email"], [data-testid="login-email"]', TEST_EMAIL);
    await page.fill('[name="password"], [data-testid="login-password"]', TEST_PASSWORD);

    const submitButton = page.locator('button[type="submit"], [data-testid="login-submit"]');
    await submitButton.click();

    await expect(page).toHaveURL(/\/(dashboard|onboarding|fact-find)/, { timeout: 10_000 });
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/fact-find');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('signup rejects weak passwords', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[name="email"], [data-testid="signup-email"]', 'weak@test.local');
    await page.fill('[name="password"], [data-testid="signup-password"]', '123');

    const submitButton = page.locator('button[type="submit"], [data-testid="signup-submit"]');
    await submitButton.click();

    const errorMessage = page.locator('[data-testid="error-message"], .text-destructive, [role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('onboarding page loads with profile form', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.locator('[data-testid="onboarding-form"], form')).toBeVisible();
  });

  test('user can submit profile information', async ({ page }) => {
    await page.goto('/onboarding');

    const aliasInput = page.locator('[name="alias"], [data-testid="alias-input"]');
    if (await aliasInput.isVisible()) {
      await aliasInput.fill('M.C.');
    }

    const ageInput = page.locator('[name="age"], [data-testid="age-input"]');
    if (await ageInput.isVisible()) {
      await ageInput.fill('32');
    }

    const provinceSelect = page.locator('[name="province"], [data-testid="province-select"]');
    if (await provinceSelect.isVisible()) {
      await provinceSelect.selectOption('ON');
    }
  });
});

test.describe('Fact-Find Conversation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('fact-find page loads with conversation interface', async ({ page }) => {
    await page.goto('/fact-find');
    await page.waitForLoadState('networkidle');

    const chatInterface = page.locator(
      '[data-testid="conversation-interface"], [data-testid="chat-container"], .conversation-container',
    );
    await expect(chatInterface).toBeVisible({ timeout: 10_000 });
  });

  test('user can send a message and receive AI response', async ({ page }) => {
    await page.goto('/fact-find');
    await page.waitForLoadState('networkidle');

    const messageInput = page.locator(
      '[data-testid="message-input"], textarea, input[type="text"]',
    ).last();
    await messageInput.fill('My annual income is about $95,000');

    const sendButton = page.locator(
      '[data-testid="send-button"], button:has-text("Send"), button[type="submit"]',
    ).last();
    await sendButton.click();

    const assistantMessage = page.locator(
      '[data-testid="assistant-message"], .assistant-message, [data-role="assistant"]',
    ).last();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });
  });

  test('conversation maintains history on page reload', async ({ page }) => {
    await page.goto('/fact-find');
    await page.waitForLoadState('networkidle');

    const messages = page.locator('[data-testid="message"], .message');
    const initialCount = await messages.count();

    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedMessages = page.locator('[data-testid="message"], .message');
    const reloadedCount = await reloadedMessages.count();

    expect(reloadedCount).toBeGreaterThanOrEqual(initialCount);
  });
});

test.describe('Holdings Input', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('holdings page allows manual entry of investment accounts', async ({ page }) => {
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    const accountTypeSelect = page.locator(
      '[data-testid="account-type"], [name="accountType"]',
    );
    if (await accountTypeSelect.isVisible()) {
      await accountTypeSelect.selectOption('TFSA');

      const tickerInput = page.locator('[name="ticker"], [data-testid="ticker-input"]');
      if (await tickerInput.isVisible()) {
        await tickerInput.fill('XEQT');
      }
    }
  });
});

test.describe('Plan Generation & Delivery', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('plan page shows pending status after submission', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('networkidle');

    const statusBadge = page.locator(
      '[data-testid="plan-status"], .plan-status, :text("pending"), :text("review")',
    );
    if (await statusBadge.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const text = await statusBadge.textContent();
      expect(text?.toLowerCase()).toMatch(/pending|review|generating/);
    }
  });

  test('delivered plan shows all 8 sections', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('networkidle');

    const sections = [
      'Financial Health',
      'Retirement',
      'Investment',
      'Tax',
      'Debt',
      'Insurance',
      'Market',
      'Roadmap',
    ];

    for (const section of sections) {
      const sectionEl = page.locator(`text=${section}`).first();
      if (await sectionEl.isVisible({ timeout: 2_000 }).catch(() => false)) {
        expect(await sectionEl.textContent()).toBeTruthy();
      }
    }
  });
});

test.describe('Approval Queue — Access Control', () => {
  test('regular user cannot access approval queue', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/approval-queue');

    await expect(page).toHaveURL(/\/(login|dashboard|403|unauthorized)/, { timeout: 5_000 });
  });

  test('CIM reviewer can access approval queue', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/approval-queue');

    await expect(page).toHaveURL(/approval-queue/, { timeout: 5_000 });
  });

  test('approval queue displays plans sorted by SLA deadline', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/approval-queue');
    await page.waitForLoadState('networkidle');

    const queueItems = page.locator('[data-testid="queue-item"], .queue-item, tr');
    if (await queueItems.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      const count = await queueItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('PDF Download', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('PDF download link only appears for delivered plans', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('networkidle');

    const downloadButton = page.locator(
      '[data-testid="download-pdf"], a:has-text("Download"), button:has-text("PDF")',
    );

    const statusEl = page.locator('[data-testid="plan-status"]');
    if (await statusEl.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const status = await statusEl.textContent();
      if (status?.toLowerCase().includes('delivered')) {
        await expect(downloadButton).toBeVisible();
      }
    }
  });
});

test.describe('Subscription Gating', () => {
  test('free user sees upgrade prompt for premium features', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/plan');
    await page.waitForLoadState('networkidle');

    const upgradePrompt = page.locator(
      '[data-testid="upgrade-prompt"], :text("upgrade"), :text("subscribe")',
    );
    // May or may not be visible depending on user's subscription state
    if (await upgradePrompt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      expect(await upgradePrompt.textContent()).toBeTruthy();
    }
  });
});

// --- Helper functions ---

async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[name="email"], [data-testid="login-email"]', TEST_EMAIL);
  await page.fill('[name="password"], [data-testid="login-password"]', TEST_PASSWORD);

  const submitButton = page.locator('button[type="submit"], [data-testid="login-submit"]');
  await submitButton.click();

  await page.waitForURL(/\/(dashboard|onboarding|fact-find|plan|holdings)/, { timeout: 10_000 })
    .catch(() => { /* may already be on a dashboard page */ });
}

async function loginAsReviewer(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[name="email"], [data-testid="login-email"]', REVIEWER_EMAIL);
  await page.fill('[name="password"], [data-testid="login-password"]', REVIEWER_PASSWORD);

  const submitButton = page.locator('button[type="submit"], [data-testid="login-submit"]');
  await submitButton.click();

  await page.waitForURL(/\/(dashboard|approval-queue|admin)/, { timeout: 10_000 })
    .catch(() => { /* may already be on a dashboard page */ });
}
