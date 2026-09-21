import type { DefinitionRound, FinderPuzzle, GuessRound, WordEntry } from './word-game-models';
import { cefr, distinct, integer, nonempty, requireContent as check, strings } from '../core/content-validation';
export interface WordBankFile { schemaVersion: string; words: WordEntry[]; count: number; }
export interface FinderFile { schemaVersion: string; puzzles: FinderPuzzle[]; puzzleCount: number; }
export interface GuessFile { schemaVersion: string; rounds: GuessRound[]; roundCount: number; }
export interface DefinitionFile { schemaVersion: string; rounds: DefinitionRound[]; roundCount: number; }
export function validateWordGameContent(bank: WordBankFile, finder: FinderFile, guess: GuessFile, definitions: DefinitionFile): void {
  check([bank, finder, guess, definitions].every(f => f?.schemaVersion === '1.0.0'), 'schema version');
  check(Array.isArray(bank.words) && bank.count === bank.words.length, 'word bank');
  check(Array.isArray(finder.puzzles) && finder.puzzleCount === finder.puzzles.length, 'Finder rounds');
  check(Array.isArray(guess.rounds) && guess.roundCount === guess.rounds.length, 'Guess rounds');
  check(Array.isArray(definitions.rounds) && definitions.roundCount === definitions.rounds.length, 'Definition rounds');
  check(distinct(bank.words.map(w => w.id)), 'duplicate word IDs');
  const byId = new Map(bank.words.map(w => [w.id, w]));
  const bySpelling = new Map<string, string>();
  for (const word of bank.words) {
    check(nonempty(word.id) && nonempty(word.word) && /^[a-z]+$/.test(word.word) && word.length === word.word.length, 'word identity');
    check(cefr(word.cefr) && nonempty(word.partOfSpeech) && nonempty(word.definitionEn) && nonempty(word.exampleEn), 'word learning fields');
    check(strings(word.translationsPl) && word.translationsPl.length && strings(word.topics), 'word translations/topics');
    check(strings(word.acceptedSpellings) && word.acceptedSpellings.includes(word.word), 'spellings');
    for (const spelling of word.acceptedSpellings) {
      check(spelling === spelling.trim().toLowerCase() && (!bySpelling.has(spelling) || bySpelling.get(spelling) === word.id), 'ambiguous spelling');
      bySpelling.set(spelling, word.id);
    }
  }
  for (const rounds of [finder.puzzles, guess.rounds, definitions.rounds]) {
    check(distinct(rounds.map(r => r.id)), 'duplicate round IDs');
    check(rounds.every(r => nonempty(r.id) && integer(r.level, 1) && cefr(r.cefr)), 'round metadata');
  }
  for (const puzzle of finder.puzzles) {
    check(strings(puzzle.letters) && puzzle.letters.length >= 2 && puzzle.letters.every(l => /^[A-Za-z]$/.test(l)), 'Finder letters');
    check(strings(puzzle.requiredWordIds) && puzzle.requiredWordIds.length && strings(puzzle.bonusWordIds), 'Finder references');
    check(distinct([...puzzle.requiredWordIds, ...puzzle.bonusWordIds]), 'duplicate Finder words');
    for (const id of [...puzzle.requiredWordIds, ...puzzle.bonusWordIds]) {
      const word = byId.get(id); check(word, 'missing Finder word'); const pool = puzzle.letters.map(l => l.toLowerCase());
      for (const letter of word.word) { const index = pool.indexOf(letter); check(index >= 0, 'unbuildable Finder word'); pool.splice(index, 1); }
    }
    check(puzzle.hints && integer(puzzle.hints.max) && Array.isArray(puzzle.hints.types) && distinct(puzzle.hints.types) && puzzle.hints.types.every(t => ['reveal_letter', 'reveal_translation'].includes(t)), 'Finder hints');
    const board = puzzle.board;
    check(board && integer(board.rows, 1) && integer(board.columns, 1) && Array.isArray(board.cells) && board.cells.length === board.rows
      && board.cells.every(row => Array.isArray(row) && row.length === board.columns && row.every(c => c === null || typeof c === 'string' && /^[A-Z]$/.test(c))) && Array.isArray(board.placements), 'Finder grid');
    const covered = new Set<string>();
    for (const p of board.placements) {
      check(puzzle.requiredWordIds.includes(p.wordId) && integer(p.startRow) && integer(p.startColumn) && ['horizontal', 'vertical'].includes(p.direction), 'Finder placement');
      const word = byId.get(p.wordId)!;
      [...word.word].forEach((letter, i) => {
        const r = p.startRow + (p.direction === 'vertical' ? i : 0), c = p.startColumn + (p.direction === 'horizontal' ? i : 0);
        check(board.cells[r]?.[c] === letter.toUpperCase(), 'Finder intersection'); covered.add(r + ':' + c);
      });
    }
    check(puzzle.requiredWordIds.every(id => board.placements.some(p => p.wordId === id)), 'missing placement');
    check(board.cells.every((row, r) => row.every((letter: string | null, c: number) => letter === null || covered.has(r + ':' + c))), 'unreachable grid cell');
  }
  for (const round of guess.rounds) {
    const word = byId.get(round.targetWordId);
    check(word && round.wordLength === 5 && word.length === round.wordLength, 'Guess target');
    check(round.maxAttempts === 5 && Array.isArray(round.hintOrder) && distinct(round.hintOrder)
      && round.hintOrder.every(h => ['topic', 'part_of_speech', 'translation_pl'].includes(h)), 'Guess rules');
  }
  for (const round of definitions.rounds) {
    check(nonempty(round.topic) && Array.isArray(round.questions) && round.questions.length === round.questionsPerRound && round.questionsPerRound === 6, 'Definition questions');
    check(distinct(round.questions.map(q => q.id)), 'duplicate question IDs');
    for (const q of round.questions) {
      check(nonempty(q.id) && byId.has(q.wordId) && q.correctWordId === q.wordId && strings(q.optionWordIds)
        && q.optionWordIds.length === 4 && distinct(q.optionWordIds) && q.optionWordIds.includes(q.correctWordId) && q.optionWordIds.every((id: string) => byId.has(id)), 'Definition options');
      check(Array.isArray(q.hints) && distinct(q.hints) && q.hints.every((h: string) => ['first_letter', 'word_length', 'translation_pl'].includes(h)), 'Definition hints');
    }
  }
}
