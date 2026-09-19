import { ProgressDocument } from '../core/progress-document';
import type { IdiomProgressMap, UserIdiomProgress } from './idiom-models';

export interface IdiomProgressRepository { load(): IdiomProgressMap; save(progress: IdiomProgressMap): void; }
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; }
function isProgress(value: unknown): value is UserIdiomProgress {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return typeof p['idiomId'] === 'string' && ['new', 'learning', 'review', 'mastered'].includes(String(p['status']))
    && ['correctAnswers', 'incorrectAnswers', 'mastery'].every(key => typeof p[key] === 'number' && Number.isFinite(p[key]) && Number(p[key]) >= 0)
    && Number(p['mastery']) <= 100 && typeof p['savedToFlashcards'] === 'boolean'
    && (p['selfAssessment'] === undefined || p['selfAssessment'] === 'known' || p['selfAssessment'] === 'unknown')
    && (p['lastSeenAt'] === undefined || typeof p['lastSeenAt'] === 'string')
    && (p['nextReviewAt'] == null || typeof p['nextReviewAt'] === 'string');
}

export class LocalIdiomProgressRepository implements IdiomProgressRepository {
  private readonly key = 'english-app-demo.idioms.progress.v1';
  private readonly document: ProgressDocument;
  constructor(storage: () => StoragePort) { this.document = new ProgressDocument(storage, this.key); }
  load(): IdiomProgressMap {
    return this.document.load(raw => {
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isProgress) || new Set(parsed.map(p => p.idiomId)).size !== parsed.length) throw new Error('Invalid idiom progress');
    return Object.fromEntries(parsed.map(p => [p.idiomId, p]));
    });
  }
  save(progress: IdiomProgressMap): void { this.document.save(Object.values(progress)); }
}
