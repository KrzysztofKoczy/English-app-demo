import { Injectable, computed, inject, signal } from '@angular/core';
import { WordGameContentRepository } from './word-game-content';
import { WordGameProgressService } from './word-game-progress';
import type { DefinitionHint, DefinitionRound, FinderHint, FinderPuzzle, GuessRound, WordGameContent, WordGameProgress } from './word-game-models';
import { answerDefinition, finderHint, keyboardMarks, newDefinition, newFinder, newGuess, nextDefinition, placementCells, shuffleTiles, submitFinder, submitGuess, visibleFinderCells } from './word-game-engine';

export abstract class WordGameSession {
  readonly repository = inject(WordGameContentRepository);
  readonly progress = inject(WordGameProgressService);
  readonly content = signal<WordGameContent | null>(null);
  readonly result = signal<WordGameProgress | null>(null);
  async load() { try { this.content.set(await this.repository.load()); } catch { /* Repository exposes retryable error. */ } }
  protected finish(result: Omit<WordGameProgress, 'completed' | 'completedAt'>, won = false) {
    if (this.result()) return;
    const completed = { ...result, completed: true, completedAt: new Date().toISOString() };
    this.result.set(completed); this.progress.finish(completed, won);
  }
}
@Injectable()
export class FinderSession extends WordGameSession {
  readonly round = signal<FinderPuzzle | null>(null);
  readonly state = signal(newFinder());
  readonly tiles = signal<{ id: number; letter: string }[]>([]);
  readonly selected = signal<number[]>([]);
  readonly currentWord = computed(() => this.selected().map(id => this.tiles().find(t => t.id === id)!.letter).join(''));
  readonly visible = computed(() => this.round() ? visibleFinderCells(this.state(), this.round()!, this.repository.byId) : new Set<string>());
  start(round: FinderPuzzle) {
    this.round.set(round); this.state.set(newFinder()); this.result.set(null); this.selected.set([]);
    this.tiles.set(round.letters.map((letter, id) => ({ id, letter })));
  }
  select(id: number) {
    if (this.result() || !this.tiles().some(t => t.id === id)) return;
    this.selected.update(ids => ids.includes(id) ? ids : [...ids, id]);
  }
  undo() { this.selected.update(ids => ids.slice(0, -1)); }
  clear() { this.selected.set([]); }
  shuffle() { this.clear(); this.tiles.update(tiles => shuffleTiles(tiles)); }
  submit() {
    const round = this.round(); if (!round || this.result() || !this.currentWord()) return;
    this.state.update(state => submitFinder(state, this.currentWord(), round, this.repository.bySpelling)); this.clear();
    const s = this.state();
    if (s.found.length === round.requiredWordIds.length) this.finish({ game: 'word_finder', roundId: round.id, score: s.score, hintsUsed: s.hintsUsed, mistakes: s.mistakes,
      difficultWordIds: [...new Set([...s.translated, ...round.board.placements.filter(p => {
        const word = this.repository.word(p.wordId);
        return placementCells(p, word.length).some(cell => s.revealed.includes(cell));
      }).map(p => p.wordId)])] });
  }
  hint(type: FinderHint) { const round = this.round(); if (round && !this.result()) this.state.update(state => finderHint(state, type, round, this.repository.byId)); }
}
@Injectable()
export class GuessSession extends WordGameSession {
  readonly round = signal<GuessRound | null>(null);
  readonly state = signal(newGuess());
  readonly draft = signal('');
  readonly hints = signal<string[]>([]);
  readonly keys = computed(() => keyboardMarks(this.state().attempts));
  readonly rows = computed(() => {
    const round = this.round(); if (!round) return [];
    return Array.from({ length: round.maxAttempts }, (_, i) => Array.from({ length: round.wordLength }, (_, j) => ({
      letter: this.state().attempts[i]?.word[j] ?? (i === this.state().attempts.length ? this.draft()[j] ?? '' : ''),
      mark: this.state().attempts[i]?.marks[j] ?? '',
    })));
  });
  start(round: GuessRound) { this.round.set(round); this.state.set(newGuess()); this.draft.set(''); this.hints.set([]); this.result.set(null); }
  key(key: string) {
    const round = this.round(); if (!round || this.state().finished) return;
    if (key === 'Enter') { this.submit(); return; }
    if (key === 'Backspace') { this.draft.update(s => s.slice(0, -1)); return; }
    if (/^[a-z]$/i.test(key) && this.draft().length < round.wordLength) this.draft.update(s => s + key.toLowerCase());
  }
  submit() {
    const round = this.round(), content = this.content(); if (!round || !content || this.state().finished) return;
    const count = this.state().attempts.length;
    this.state.update(s => submitGuess(s, this.draft(), round, this.repository.word(round.targetWordId).word, content.accepted));
    const s = this.state(); if (s.attempts.length > count) this.draft.set('');
    if (s.finished) this.finish({ game: 'word_guess', roundId: round.id, score: s.won ? (round.maxAttempts - s.attempts.length + 1) * 10 : 0,
      hintsUsed: this.hints().length, mistakes: s.attempts.length - Number(s.won), difficultWordIds: !s.won || this.hints().length > 0 ? [round.targetWordId] : [] }, s.won);
  }
  hint() {
    const round = this.round(); if (!round || this.state().finished) return;
    const type = round.hintOrder[this.hints().length]; if (!type) return;
    const word = this.repository.word(round.targetWordId);
    const hints = { topic: `Temat: ${word.topics.join(', ')}`, part_of_speech: `Część mowy: ${word.partOfSpeech}`, translation_pl: `Tłumaczenie: ${word.translationsPl.join(', ')}` };
    this.hints.update(values => [...values, hints[type]]);
  }
}
@Injectable()
export class DefinitionSession extends WordGameSession {
  readonly round = signal<DefinitionRound | null>(null);
  readonly state = signal(newDefinition());
  readonly hints = signal<string[]>([]);
  readonly hintsUsed = signal(0);
  readonly hintedWords = signal<string[]>([]);
  readonly question = computed(() => this.round()?.questions[this.state().index] ?? null);
  start(round: DefinitionRound) { this.round.set(round); this.state.set(newDefinition()); this.hints.set([]); this.hintsUsed.set(0); this.hintedWords.set([]); this.result.set(null); }
  answer(id: string) { const round = this.round(); if (round) this.state.update(s => answerDefinition(s, id, round)); }
  next() {
    const round = this.round(); if (!round || !this.state().selected) return;
    this.state.update(s => nextDefinition(s, round)); this.hints.set([]);
    const s = this.state();
    if (s.finished) this.finish({ game: 'definition_guess', roundId: round.id, score: s.score, hintsUsed: this.hintsUsed(), mistakes: round.questions.length - s.score,
      difficultWordIds: [...new Set([...s.difficult, ...this.hintedWords()])] });
  }
  hint() {
    const q = this.question(); if (!q || this.state().selected || this.result()) return;
    const type = q.hints[this.hints().length]; if (!type) return;
    const word = this.repository.word(q.wordId);
    const labels: Record<DefinitionHint, string> = { first_letter: `Pierwsza litera: ${word.word[0].toUpperCase()}`, word_length: `Liczba liter: ${word.length}`, translation_pl: word.translationsPl.join(', ') };
    this.hints.update(h => [...h, labels[type]]); this.hintsUsed.update(n => n + 1);
    this.hintedWords.update(ids => [...new Set([...ids, q.wordId])]);
  }
}

