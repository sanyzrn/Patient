import { describe, it, expect } from 'vitest';
import { normalizeDigits, dateToNumber } from '../helpers';

// ─── normalizeDigits ──────────────────────────────────────────────────────────

describe('normalizeDigits', () => {
  it('passes through ASCII digits unchanged', () => {
    expect(normalizeDigits('1404/10/9')).toBe('1404/10/9');
  });

  it('converts Persian digits to ASCII', () => {
    expect(normalizeDigits('۱۴۰۴/۱۰/۰۹')).toBe('1404/10/09');
  });

  it('converts Arabic-Indic digits to ASCII', () => {
    expect(normalizeDigits('١٤٠٤/١٠/٠٩')).toBe('1404/10/09');
  });

  it('handles mixed Persian and ASCII', () => {
    expect(normalizeDigits('بروزرسانی ۱۴۰۴/10/9')).toBe('بروزرسانی 1404/10/9');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeDigits('')).toBe('');
  });

  it('handles null/undefined gracefully via empty string default', () => {
    // The function coerces with `(input || '')` so passing undefined works
    expect(normalizeDigits(undefined as unknown as string)).toBe('');
  });
});

// ─── dateToNumber ─────────────────────────────────────────────────────────────

describe('dateToNumber', () => {
  it('parses a simple ASCII date string', () => {
    expect(dateToNumber('1404/10/09')).toBe(14041009);
  });

  it('parses a Persian date string with label prefix', () => {
    expect(dateToNumber('آخرین بروزرسانی: ۱۴۰۴/۱۰/۰۹')).toBe(14041009);
  });

  it('parses single-digit month and day', () => {
    expect(dateToNumber('۱۴۰۴/۱/۵')).toBe(14040105);
  });

  it('parses dash-separated date', () => {
    expect(dateToNumber('1404-10-09')).toBe(14041009);
  });

  it('returns 0 for empty string', () => {
    expect(dateToNumber('')).toBe(0);
  });

  it('returns 0 when no date pattern is found', () => {
    expect(dateToNumber('فقط متن بدون تاریخ')).toBe(0);
  });

  it('produces sortable ordering — newer date is larger number', () => {
    const older = dateToNumber('۱۴۰۳/۱۲/۲۹');
    const newer = dateToNumber('۱۴۰۴/۰۱/۰۱');
    expect(newer).toBeGreaterThan(older);
  });

  it('correctly distinguishes months', () => {
    const jan = dateToNumber('1404/01/01');
    const dec = dateToNumber('1404/12/01');
    expect(dec).toBeGreaterThan(jan);
  });

  it('correctly distinguishes days within same month', () => {
    const first = dateToNumber('1404/06/01');
    const last  = dateToNumber('1404/06/31');
    expect(last).toBeGreaterThan(first);
  });
});
