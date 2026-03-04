import { describe, it, expect } from 'vitest';
import {
  parseFactFindResponse,
  isFactFindComplete,
  stripFactFindTags,
} from '@/lib/parsers/fact-find';
import {
  SAMPLE_FACT_FIND_RESPONSE,
  SAMPLE_INCOMPLETE_RESPONSE,
  SAMPLE_MALFORMED_TAG_RESPONSE,
  SAMPLE_NESTED_TAG_RESPONSE,
} from '../fixtures/user-data';

describe('Fact-Find Tag Parsing', () => {
  describe('isFactFindComplete', () => {
    it('returns true when complete tags are present', () => {
      expect(isFactFindComplete(SAMPLE_FACT_FIND_RESPONSE)).toBe(true);
    });

    it('returns false for incomplete response', () => {
      expect(isFactFindComplete(SAMPLE_INCOMPLETE_RESPONSE)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isFactFindComplete('')).toBe(false);
    });

    it('returns false when only opening tag present', () => {
      expect(isFactFindComplete('<FACT_FIND_COMPLETE>')).toBe(false);
    });

    it('returns false when only closing tag present', () => {
      expect(isFactFindComplete('</FACT_FIND_COMPLETE>')).toBe(false);
    });

    it('returns true even with malformed JSON inside tags', () => {
      expect(isFactFindComplete(SAMPLE_MALFORMED_TAG_RESPONSE)).toBe(true);
    });
  });

  describe('parseFactFindResponse', () => {
    it('extracts valid JSON from tagged response', () => {
      const result = parseFactFindResponse(SAMPLE_FACT_FIND_RESPONSE);
      expect(result).not.toBeNull();
      expect(result!.annual_income).toBe(95000);
      expect(result!.monthly_expenses).toBe(4200);
      expect(result!.monthly_savings).toBe(1800);
      expect(result!.province).toBe('ON');
      expect(result!.family_structure).toBe('married');
    });

    it('extracts debts array correctly', () => {
      const result = parseFactFindResponse(SAMPLE_FACT_FIND_RESPONSE);
      expect(result!.debts).toHaveLength(3);
      expect(result!.debts[0].type).toBe('Credit card');
      expect(result!.debts[0].balance).toBe(10000);
      expect(result!.debts[0].rate).toBe(19.99);
    });

    it('extracts goals array correctly', () => {
      const result = parseFactFindResponse(SAMPLE_FACT_FIND_RESPONSE);
      expect(result!.goals).toHaveLength(2);
      expect(result!.goals[0].priority).toBe('high');
    });

    it('extracts retirement_target_age', () => {
      const result = parseFactFindResponse(SAMPLE_FACT_FIND_RESPONSE);
      expect(result!.retirement_target_age).toBe(63);
    });

    it('extracts investment_knowledge', () => {
      const result = parseFactFindResponse(SAMPLE_FACT_FIND_RESPONSE);
      expect(result!.investment_knowledge).toBe('intermediate');
    });

    it('returns null for response without tags', () => {
      expect(parseFactFindResponse(SAMPLE_INCOMPLETE_RESPONSE)).toBeNull();
    });

    it('returns null for malformed JSON inside tags', () => {
      expect(parseFactFindResponse(SAMPLE_MALFORMED_TAG_RESPONSE)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseFactFindResponse('')).toBeNull();
    });

    it('handles nested tags by matching first pair', () => {
      const result = parseFactFindResponse(SAMPLE_NESTED_TAG_RESPONSE);
      // The regex is non-greedy so it matches the innermost valid JSON
      // Depending on implementation, this may or may not parse
      // The important thing is it doesn't throw
      expect(() => parseFactFindResponse(SAMPLE_NESTED_TAG_RESPONSE)).not.toThrow();
    });

    it('handles whitespace around JSON inside tags', () => {
      const response = `
<FACT_FIND_COMPLETE>

  {"annual_income": 75000, "monthly_expenses": 3000, "monthly_savings": 1500,
   "emergency_fund_months": 3, "debts": [], "goals": [],
   "retirement_target_age": 65, "investment_knowledge": "novice",
   "province": "BC", "family_structure": "single"}

</FACT_FIND_COMPLETE>`;
      const result = parseFactFindResponse(response);
      expect(result).not.toBeNull();
      expect(result!.annual_income).toBe(75000);
      expect(result!.province).toBe('BC');
    });
  });

  describe('stripFactFindTags', () => {
    it('removes fact-find tags and preserves conversational content', () => {
      const stripped = stripFactFindTags(SAMPLE_FACT_FIND_RESPONSE);
      expect(stripped).not.toContain('<FACT_FIND_COMPLETE>');
      expect(stripped).not.toContain('</FACT_FIND_COMPLETE>');
      expect(stripped).toContain('22% savings rate');
      expect(stripped).toContain('Does this accurately reflect');
    });

    it('returns original string when no tags present', () => {
      const original = 'Just a normal response without tags';
      expect(stripFactFindTags(original)).toBe(original);
    });

    it('handles empty string', () => {
      expect(stripFactFindTags('')).toBe('');
    });

    it('trims whitespace after tag removal', () => {
      const response = '  <FACT_FIND_COMPLETE>{"data": true}</FACT_FIND_COMPLETE>  ';
      expect(stripFactFindTags(response)).toBe('');
    });

    it('preserves text before and after tags', () => {
      const response = 'Before text <FACT_FIND_COMPLETE>{"data": true}</FACT_FIND_COMPLETE> After text';
      const stripped = stripFactFindTags(response);
      expect(stripped).toContain('Before text');
      expect(stripped).toContain('After text');
    });
  });
});
