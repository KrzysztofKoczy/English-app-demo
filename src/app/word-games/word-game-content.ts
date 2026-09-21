import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import type { WordEntry, WordGameContent } from './word-game-models';
import { normalizeWord } from './word-game-engine';
import { DefinitionFile, FinderFile, GuessFile, WordBankFile, validateWordGameContent } from './word-game-validation';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
@Injectable({ providedIn: 'root' })
export class WordGameContentRepository {
  private readonly http = inject(HttpClient);
  private pending?: Promise<WordGameContent>;
  private readonly files = new Map<string, Promise<unknown>>();
  private readonly idIndex = new Map<string, WordEntry>();
  private readonly spellingIndex = new Map<string, WordEntry>();
  readonly byId: ReadonlyMap<string, WordEntry> = this.idIndex;
  readonly bySpelling: ReadonlyMap<string, WordEntry> = this.spellingIndex;
  readonly status = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly error = signal('');
  word(id: string): WordEntry { const word = this.byId.get(id); if (!word) throw new Error(`Unknown word: ${id}`); return word; }
  load(): Promise<WordGameContent> {
    return this.pending ??= this.read().catch(error => {
      this.pending = undefined; this.status.set('error'); this.error.set('Nie udało się wczytać gier. Spróbuj ponownie.'); throw error;
    });
  }
  private file<T>(path: string): Promise<T> {
    let request = this.files.get(path);
    if (!request) {
      request = firstValueFrom(this.http.get<T>(`assets/game-data/word-games/${path}`).pipe(timeout(15000)))
        .catch(error => { this.files.delete(path); throw error; });
      this.files.set(path, request);
    }
    return request as Promise<T>;
  }
  private async read(): Promise<WordGameContent> {
    this.status.set('loading'); this.error.set('');
    const [bank, finder, guess, definitions] = await Promise.all([
      this.file<WordBankFile>('word-bank.json'),
      this.file<FinderFile>('word-finder/puzzles.json'),
      this.file<GuessFile>('word-guess/rounds.json'),
      this.file<DefinitionFile>('definition-guess/rounds.json'),
    ]);
    try { validateWordGameContent(bank, finder, guess, definitions); }
    catch (error) { this.files.clear(); throw error; }
    this.idIndex.clear(); this.spellingIndex.clear();
    for (const word of bank.words) {
      this.idIndex.set(word.id, word);
      for (const spelling of word.acceptedSpellings) this.spellingIndex.set(normalizeWord(spelling), word);
    }
    const content = freeze({ words: bank.words, finder: finder.puzzles, guess: guess.rounds, definitions: definitions.rounds });
    this.status.set('loaded'); return content;
  }
}
