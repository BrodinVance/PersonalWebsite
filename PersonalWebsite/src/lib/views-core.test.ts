import { describe, expect, it } from 'vitest';
import {
  dayKey,
  dayHashKey,
  fieldFor,
  lastNDays,
  seenHash,
  seenKey,
} from './views-core';

describe('fieldFor', () => {
  it('joins type and slug', () => {
    expect(fieldFor('writing', 'first-post')).toBe('writing/first-post');
    expect(fieldFor('projects', 'brine')).toBe('projects/brine');
  });
});

describe('dayKey', () => {
  it('formats as UTC YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-07-15T23:59:59Z'))).toBe('2026-07-15');
    // 01:00 UTC is still the same UTC day regardless of local zone
    expect(dayKey(new Date('2026-01-02T01:00:00Z'))).toBe('2026-01-02');
  });
});

describe('key builders', () => {
  it('builds redis key names', () => {
    expect(dayHashKey('2026-07-15')).toBe('views:day:2026-07-15');
    expect(seenKey('2026-07-15', 'abc')).toBe('views:seen:2026-07-15:abc');
  });
});

describe('lastNDays', () => {
  it('returns n days oldest-first ending today, crossing month boundaries', () => {
    const days = lastNDays(3, new Date('2026-07-01T12:00:00Z'));
    expect(days).toEqual(['2026-06-29', '2026-06-30', '2026-07-01']);
  });
  it('handles n=1', () => {
    expect(lastNDays(1, new Date('2026-07-15T00:30:00Z'))).toEqual(['2026-07-15']);
  });
});

describe('seenHash', () => {
  it('is a deterministic 64-char hex sha256', async () => {
    const a = await seenHash('1.2.3.4', 'writing/foo');
    const b = await seenHash('1.2.3.4', 'writing/foo');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('differs for different ip or field', async () => {
    const a = await seenHash('1.2.3.4', 'writing/foo');
    expect(await seenHash('5.6.7.8', 'writing/foo')).not.toBe(a);
    expect(await seenHash('1.2.3.4', 'writing/bar')).not.toBe(a);
  });
});
