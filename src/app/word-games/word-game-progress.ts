import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { emptyProgress, LocalWordGameProgressRepository, recordResult, WordGameProgressRepository } from './word-game-storage';
import type { WordGameProgress } from './word-game-models';
export const WORD_GAME_PROGRESS = new InjectionToken<WordGameProgressRepository>('Word game progress', {
  providedIn: 'root', factory: () => new LocalWordGameProgressRepository(() => localStorage),
});
@Injectable({ providedIn: 'root' })
export class WordGameProgressService {
  private readonly repository = inject(WORD_GAME_PROGRESS);
  readonly value = signal(emptyProgress());
  readonly unavailable = signal(false);
  constructor() { try { this.value.set(this.repository.load()); } catch { this.unavailable.set(true); } }
  finish(progress: WordGameProgress, won = false) {
    this.value.update(value => recordResult(value, progress, won));
    try { this.repository.save(this.value()); this.unavailable.set(false); } catch { this.unavailable.set(true); }
  }
}
