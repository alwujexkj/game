import {
  LEVEL_DEFAULT_KNOWLEDGE_TAG,
  PACK_MANIFEST_VERSION,
  resolvePack,
  type AgeBand,
  type PackId,
} from '@sujia/shared';
import { getBank, type BankQuestion, type QuestionBank } from '../banks';

import M1k from './M1.k.json';
import M1g4 from './M1.g4.json';
import M1g5 from './M1.g5.json';
import M2k from './M2.k.json';
import M2g4 from './M2.g4.json';
import M2g5 from './M2.g5.json';
import M4g4 from './M4.g4.json';
import M4g5 from './M4.g5.json';
import E1k from './E1.k.json';
import E1g4 from './E1.g4.json';
import E1g5 from './E1.g5.json';
import E3g4 from './E3.g4.json';
import E3g5 from './E3.g5.json';
import T1k from './T1.k.json';
import T1g4 from './T1.g4.json';
import T1g5 from './T1.g5.json';

/** Wave0 question schema: knowledgeTags only (string[]). */
export type PackQuestion = BankQuestion & {
  knowledgeTags: string[];
};

export interface QuestionPackFile {
  packId: PackId;
  levelId: string;
  ageBand: AgeBand;
  version?: number;
  title?: string;
  timed?: boolean;
  timeLimitSec?: number;
  questions: Array<BankQuestion & { knowledgeTags?: string[] }>;
  stub?: boolean;
}

const PACK_FILES: Record<string, QuestionPackFile> = {
  'M1.k': M1k as QuestionPackFile,
  'M1.g4': M1g4 as QuestionPackFile,
  'M1.g5': M1g5 as QuestionPackFile,
  'M2.k': M2k as QuestionPackFile,
  'M2.g4': M2g4 as QuestionPackFile,
  'M2.g5': M2g5 as QuestionPackFile,
  'M4.g4': M4g4 as QuestionPackFile,
  'M4.g5': M4g5 as QuestionPackFile,
  'E1.k': E1k as QuestionPackFile,
  'E1.g4': E1g4 as QuestionPackFile,
  'E1.g5': E1g5 as QuestionPackFile,
  'E3.g4': E3g4 as QuestionPackFile,
  'E3.g5': E3g5 as QuestionPackFile,
  'T1.k': T1k as QuestionPackFile,
  'T1.g4': T1g4 as QuestionPackFile,
  'T1.g5': T1g5 as QuestionPackFile,
};

export { PACK_MANIFEST_VERSION, resolvePack };

function withKnowledgeTags(levelId: string, questions: QuestionPackFile['questions']): PackQuestion[] {
  const fallback = LEVEL_DEFAULT_KNOWLEDGE_TAG[levelId] ?? '综合练习';
  return questions.map((q) => {
    const tags = Array.isArray(q.knowledgeTags)
      ? q.knowledgeTags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    const { knowledgeTag: _legacy, ...rest } = q as BankQuestion & {
      knowledgeTags?: string[];
      knowledgeTag?: string;
    };
    return {
      ...rest,
      knowledgeTags: tags.length ? tags : [fallback],
    };
  });
}

/**
 * Web JSON loader — packId resolution is @sujia/shared resolvePack.
 * Missing / disabled pack → legacy bank + console.warn.
 */
export function loadPackQuestions(
  levelId: string,
  ageBand: AgeBand,
): {
  packId: PackId;
  questions: PackQuestion[];
  fromLegacyBank: boolean;
  timed?: boolean;
  timeLimitSec?: number;
  title?: string;
  reason?: string;
} {
  const resolved = resolvePack(levelId, ageBand);
  const file = PACK_FILES[resolved.packId];

  if (file?.questions?.length) {
    if (resolved.fallback || file.stub) {
      console.warn(
        `[loadPackQuestions] ${resolved.reason || `stub pack ${resolved.packId}`}; using ${resolved.packId}`,
      );
    }
    return {
      packId: resolved.packId,
      questions: withKnowledgeTags(levelId, file.questions),
      fromLegacyBank: false,
      timed: file.timed,
      timeLimitSec: file.timeLimitSec,
      title: file.title,
      reason: resolved.reason,
    };
  }

  const bank: QuestionBank | null = getBank(levelId);
  const reason =
    resolved.reason ||
    `pack JSON missing for ${resolved.packId}; fallback legacy bank`;
  console.warn(`[loadPackQuestions] ${reason}`);

  return {
    packId: resolved.packId,
    questions: withKnowledgeTags(levelId, (bank?.questions ?? []) as QuestionPackFile['questions']),
    fromLegacyBank: true,
    timed: bank?.timed,
    timeLimitSec: bank?.timeLimitSec,
    title: bank?.title,
    reason,
  };
}

export function listLoadedPackIds(): string[] {
  return Object.keys(PACK_FILES);
}
