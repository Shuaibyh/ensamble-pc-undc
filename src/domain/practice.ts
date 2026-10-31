import type { Mode } from './session';

export interface PracticeRecord {
  errors: number;
  hints: number;
}
export const emptyPractice = (): PracticeRecord => ({ errors: 0, hints: 0 });
export function recordPractice(
  record: PracticeRecord,
  mode: Mode,
  event: 'error' | 'hint',
): PracticeRecord {
  if (mode !== 'practice') return record;
  const field = event === 'error' ? 'errors' : 'hints';
  return { ...record, [field]: record[field] + 1 };
}
export function restorePractice(raw: string | null): PracticeRecord {
  try {
    const saved = JSON.parse(raw ?? 'null');
    return {
      errors: Number.isSafeInteger(saved?.errors) && saved.errors >= 0 ? saved.errors : 0,
      hints: Number.isSafeInteger(saved?.hints) && saved.hints >= 0 ? saved.hints : 0,
    };
  } catch {
    return emptyPractice();
  }
}
