import { ProgressDocument } from '../core/progress-document';
import type { SavedWordGames, WordGameProgress } from './word-game-models';
export interface WordGameProgressRepository { load(): SavedWordGames; save(value: SavedWordGames): void; }
export interface WordGameStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export const emptyProgress = (): SavedWordGames => ({ results: {}, guess: { currentStreak: 0, bestStreak: 0, played: 0, won: 0 } });
export function recordResult(previous: SavedWordGames, progress: WordGameProgress, won = false): SavedWordGames {
  const guess = { ...previous.guess };
  if (progress.game === 'word_guess' && progress.completed) {
    guess.played++; guess.won += Number(won); guess.currentStreak = won ? guess.currentStreak + 1 : 0;
    guess.bestStreak = Math.max(guess.bestStreak, guess.currentStreak);
  }
  return { results: { ...previous.results, [`${progress.game}:${progress.roundId}`]: progress }, guess };
}
function validProgress(value: unknown): value is WordGameProgress {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return ['word_finder', 'word_guess', 'definition_guess'].includes(String(p['game']))
    && typeof p['roundId'] === 'string' && typeof p['completed'] === 'boolean'
    && ['score', 'hintsUsed', 'mistakes'].every(k => Number.isSafeInteger(p[k]) && Number(p[k]) >= 0)
    && Array.isArray(p['difficultWordIds']) && p['difficultWordIds'].every(id => typeof id === 'string')
    && (p['completedAt'] === undefined || typeof p['completedAt'] === 'string');
}
export class LocalWordGameProgressRepository implements WordGameProgressRepository {
  private readonly key = 'english-app-demo.word-games.v1';
  private readonly document: ProgressDocument;
  constructor(storage: () => WordGameStorage) { this.document = new ProgressDocument(storage, this.key); }
  load(): SavedWordGames {
    return this.document.load(raw => {
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid progress');
    const value = parsed as Record<string, unknown>;
    const stats = value['guess']; const results = value['results'];
    if (!stats || typeof stats !== 'object' || !results || typeof results !== 'object' || Array.isArray(results)) throw new Error('Invalid progress');
    const s = stats as Record<string, unknown>;
    if (!['currentStreak', 'bestStreak', 'played', 'won'].every(k => Number.isSafeInteger(s[k]) && Number(s[k]) >= 0)
      || Number(s['won']) > Number(s['played']) || Number(s['currentStreak']) > Number(s['bestStreak']) || Number(s['bestStreak']) > Number(s['won'])
      || !Object.entries(results).every(([key, result]) => validProgress(result) && key === result.game + ':' + result.roundId)) throw new Error('Invalid progress');
    return parsed as SavedWordGames;
    });
  }
  save(value: SavedWordGames) { this.document.save(value); }
}
