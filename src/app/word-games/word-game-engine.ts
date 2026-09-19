import type { DefinitionRound, FinderPuzzle, GuessAttempt, GuessRound, LetterMark, Placement, WordEntry } from './word-game-models';

export const normalizeWord = (word: string) => word.trim().toLowerCase();
export function evaluateGuess(attempt: string, answer: string): LetterMark[] {
  const guess = normalizeWord(attempt), target = normalizeWord(answer);
  if (guess.length !== target.length) throw new Error('Word lengths must match');
  const marks: LetterMark[] = Array(guess.length).fill('absent');
  const remaining = new Map<string, number>();
  [...target].forEach((letter, index) => {
    if (guess[index] === letter) marks[index] = 'correct';
    else remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
  });
  [...guess].forEach((letter, index) => {
    if (marks[index] !== 'correct' && (remaining.get(letter) ?? 0) > 0) {
      marks[index] = 'present'; remaining.set(letter, remaining.get(letter)! - 1);
    }
  });
  return marks;
}
export function keyboardMarks(attempts: readonly GuessAttempt[]): Record<string, LetterMark> {
  const priority = { absent: 1, present: 2, correct: 3 };
  const result: Record<string, LetterMark> = {};
  for (const attempt of attempts) [...attempt.word].forEach((letter, i) => {
    if (!result[letter] || priority[attempt.marks[i]] > priority[result[letter]]) result[letter] = attempt.marks[i];
  });
  return result;
}
export interface GuessState { attempts: GuessAttempt[]; finished: boolean; won: boolean; message: string; }
export const newGuess = (): GuessState => ({ attempts: [], finished: false, won: false, message: '' });
export function submitGuess(state: GuessState, value: string, round: GuessRound, target: string, accepted: ReadonlySet<string>): GuessState {
  if (state.finished) return state;
  const word = normalizeWord(value);
  if (word.length !== round.wordLength) return { ...state, message: `Wpisz ${round.wordLength} liter.` };
  if (!accepted.has(word)) return { ...state, message: 'Not a word' };
  const attempts = [...state.attempts, { word, marks: evaluateGuess(word, target) }];
  const won = word === normalizeWord(target);
  return { attempts, won, finished: won || attempts.length >= round.maxAttempts, message: won ? 'Dobra odpowiedź!' : 'Próba zapisana.' };
}
export interface FinderState { found: string[]; bonus: string[]; revealed: string[]; translated: string[]; hintsUsed: number; mistakes: number; score: number; message: string; }
export const newFinder = (): FinderState => ({ found: [], bonus: [], revealed: [], translated: [], hintsUsed: 0, mistakes: 0, score: 0, message: '' });
export function submitFinder(state: FinderState, value: string, puzzle: FinderPuzzle, bySpelling: ReadonlyMap<string, WordEntry>): FinderState {
  const entry = bySpelling.get(normalizeWord(value));
  if (!entry) return { ...state, mistakes: state.mistakes + 1, message: 'Niepoprawne słowo.' };
  if (state.found.includes(entry.id) || state.bonus.includes(entry.id)) return { ...state, message: 'To słowo jest już znalezione.' };
  if (puzzle.requiredWordIds.includes(entry.id)) return { ...state, found: [...state.found, entry.id], score: state.score + 10, message: 'Dobrze! Słowo odkryte.' };
  if (puzzle.bonusWordIds.includes(entry.id)) return { ...state, bonus: [...state.bonus, entry.id], score: state.score + 5, message: 'Słowo bonusowe! +5 punktów.' };
  return { ...state, message: 'Poprawne słowo, ale nie znajduje się na tej planszy' };
}
export function placementCells(placement: Placement, length: number): string[] {
  return Array.from({ length }, (_, i) => `${placement.startRow + (placement.direction === 'vertical' ? i : 0)}:${placement.startColumn + (placement.direction === 'horizontal' ? i : 0)}`);
}
export function visibleFinderCells(state: FinderState, puzzle: FinderPuzzle, byId: ReadonlyMap<string, WordEntry>): Set<string> {
  return new Set([...state.revealed, ...puzzle.board.placements.filter(p => state.found.includes(p.wordId)).flatMap(p => placementCells(p, byId.get(p.wordId)!.length))]);
}
export function finderHint(state: FinderState, type: 'reveal_translation' | 'reveal_letter', puzzle: FinderPuzzle, byId: ReadonlyMap<string, WordEntry>): FinderState {
  if (state.hintsUsed >= puzzle.hints.max || !puzzle.hints.types.includes(type)) return state;
  const missing = puzzle.requiredWordIds.filter(id => !state.found.includes(id));
  if (type === 'reveal_translation') {
    const id = missing.find(id => !state.translated.includes(id));
    if (!id) return { ...state, message: 'Wszystkie dostępne tłumaczenia są już odkryte.' };
    return { ...state, translated: [...state.translated, id], hintsUsed: state.hintsUsed + 1, message: `Szukaj słowa: ${byId.get(id)!.translationsPl.join(', ')}` };
  }
  const visible = visibleFinderCells(state, puzzle, byId);
  const cell = puzzle.board.placements.filter(p => missing.includes(p.wordId)).flatMap(p => placementCells(p, byId.get(p.wordId)!.length)).find(cell => !visible.has(cell));
  if (!cell) return { ...state, message: 'Wszystkie litery są już widoczne. Ułóż pozostałe słowa.' };
  return { ...state, revealed: [...state.revealed, cell], hintsUsed: state.hintsUsed + 1, message: 'Odkryto literę.' };
}
export interface DefinitionState { index: number; selected: string | null; score: number; difficult: string[]; finished: boolean; }
export const newDefinition = (): DefinitionState => ({ index: 0, selected: null, score: 0, difficult: [], finished: false });
export function answerDefinition(state: DefinitionState, answer: string, round: DefinitionRound): DefinitionState {
  const question = round.questions[state.index];
  if (state.finished || state.selected || !question.optionWordIds.includes(answer)) return state;
  const correct = answer === question.correctWordId;
  return { ...state, selected: answer, score: state.score + Number(correct), difficult: correct ? state.difficult : [...new Set([...state.difficult, question.wordId])] };
}
export function nextDefinition(state: DefinitionState, round: DefinitionRound): DefinitionState {
  if (!state.selected || state.finished) return state;
  return state.index + 1 === round.questions.length ? { ...state, finished: true } : { ...state, index: state.index + 1, selected: null };
}
export function shuffleTiles<T>(tiles: readonly T[], random = Math.random): T[] {
  const result = [...tiles];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
