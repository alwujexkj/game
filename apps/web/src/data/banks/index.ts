import type { LevelId } from '@sujia/shared';
import M1 from './M1.json';
import M2 from './M2.json';
import M4 from './M4.json';
import E1 from './E1.json';
import E3 from './E3.json';

export type BankQuestion = Record<string, unknown> & {
  id: string;
  type: string;
};

export interface QuestionBank {
  levelId: LevelId;
  title: string;
  timed?: boolean;
  timeLimitSec?: number;
  questions: BankQuestion[];
}

const BANKS: Record<LevelId, QuestionBank> = {
  M1: M1 as QuestionBank,
  M2: M2 as QuestionBank,
  M4: M4 as QuestionBank,
  E1: E1 as QuestionBank,
  E3: E3 as QuestionBank,
};

export function getBank(levelId: string): QuestionBank | null {
  if (levelId in BANKS) return BANKS[levelId as LevelId];
  return null;
}

export { BANKS };
