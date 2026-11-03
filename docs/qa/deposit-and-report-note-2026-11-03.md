# Named deposits, and the report net worth note — 3 November 2026

**Starting point:** `main` at `c93a6fc`  
**Checked:** `tests/unit/spending-parse.test.ts` (18 tests). Not a new live walk.

## What changed

A deposit paid to a merchant, a booking, or a vendor stays spending. Pay, a benefit, a government deposit, and a bank-channel deposit (direct, mobile, ATM, or branch) still count as income. A line that only says "deposit" keeps the role the parser gave it. "Deposit from" keeps that role too, so a transfer in from another account is not forced into income.

The Progress Report now says, on the report and in the PDF, that net worth in the report is the figure from the day it was generated and can differ from the live number on Net Worth.

## Why the deposit rule changed

The statement parser treated the bare word "deposit" as money in. The upload prompt said the same thing: a line that says "deposit" is income even when it sits among withdrawals. A named deposit paid out was counted as income, including on rows already saved, because totals re-read the description through `resolvedLineRole`.

The fix is the description, not a merchant name. A named deposit that is not pay, a benefit, a government deposit, or a bank-channel deposit is spending. The category becomes a spending category when the parser supplied one, and "other" when it supplied an income category.

## Why the report number was left as it is

The Progress Report is the picture from the day it was generated. Editing an account updates the live Net Worth page. It does not rewrite the stored report. Regenerating is how that stored figure changes, and the button stays limited to accounts allowed to generate a report.

Putting the live number into the report would make one figure current and leave the rest of the report on the old day. The note is there so a difference between the two screens reads as the report's date, not as a broken total.

## Copy changes for compliance review

- Report banner: "Net worth in this report is the figure from the day it was generated. It can differ from the live number on Net Worth."
- Section subtitle and PDF, "Where things stand": "The balances and cash figures in this report. Net worth here is the figure from the day it was generated, so it can differ from the live number on Net Worth."
- PDF, "At a glance": the same banner sentence under the figures.
- Statement parse prompt: a deposit paid to a merchant, a booking, or a vendor is a purchase. Payroll, EI, a direct deposit, and a government deposit stay income. The old line that said any "deposit" is income is gone.

## Left as it was

The tablet rail still hides the word Sign Out and shows the icon, with the accessible name and the confirm. The stored report is still not rewritten when accounts change.
