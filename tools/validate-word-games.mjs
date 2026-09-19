import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/game-data/word-games');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const bank = read('word-bank.json');
const finder = read('word-finder/puzzles.json');
const guess = read('word-guess/rounds.json');
const accepted = read('word-guess/accepted-five-letter.json');
const definitions = read('definition-guess/rounds.json');
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const unique = (list, label) => check(new Set(list).size === list.length, `Duplicate ${label}`);
const byId = new Map();
const spellings = new Map();
for (const entry of bank.words) {
  check(!byId.has(entry.id), `Duplicate word id: ${entry.id}`); byId.set(entry.id, entry);
  check(entry.length === entry.word.length && /^[a-z]+$/.test(entry.word), `${entry.id}: invalid word/length`);
  check(entry.acceptedSpellings.includes(entry.word), `${entry.id}: missing base spelling`);
  check(entry.translationsPl.length > 0 && entry.definitionEn && entry.exampleEn, `${entry.id}: missing learning content`);
  for (const spelling of entry.acceptedSpellings) {
    check(!spellings.has(spelling) || spellings.get(spelling) === entry.id, `Ambiguous spelling ${spelling}`);
    spellings.set(spelling, entry.id);
  }
}
check(bank.count === bank.words.length, 'Invalid word-bank count');
const reference = (id, label) => check(byId.has(id), `${label}: unknown word ${id}`);
unique(finder.puzzles.map(p => p.id), 'Finder round');
for (const puzzle of finder.puzzles) {
  unique(puzzle.requiredWordIds, `${puzzle.id} required word`); unique(puzzle.bonusWordIds, `${puzzle.id} bonus word`);
  check(puzzle.requiredWordIds.every(id => !puzzle.bonusWordIds.includes(id)), `${puzzle.id}: required/bonus overlap`);
  for (const id of [...puzzle.requiredWordIds, ...puzzle.bonusWordIds]) {
    reference(id, puzzle.id); const word = byId.get(id); if (!word) continue;
    const letters = puzzle.letters.map(l => l.toLowerCase());
    for (const letter of word.word) { const index = letters.indexOf(letter); check(index >= 0, `${puzzle.id}: cannot build ${word.word}`); if (index >= 0) letters.splice(index, 1); }
  }
  check(puzzle.board.cells.length === puzzle.board.rows && puzzle.board.cells.every(r => r.length === puzzle.board.columns), `${puzzle.id}: invalid board dimensions`);
  const covered = new Set();
  for (const placement of puzzle.board.placements) {
    reference(placement.wordId, puzzle.id);
    check(puzzle.requiredWordIds.includes(placement.wordId), `${puzzle.id}: placement not required`);
    check(['horizontal','vertical'].includes(placement.direction), `${puzzle.id}: invalid direction`);
    const word = byId.get(placement.wordId); if (!word) continue;
    [...word.word].forEach((letter,i) => {
      const r = placement.startRow + (placement.direction === 'vertical' ? i : 0);
      const c = placement.startColumn + (placement.direction === 'horizontal' ? i : 0);
      check(puzzle.board.cells[r]?.[c] === letter.toUpperCase(), `${puzzle.id}: invalid placement at ${r},${c}`);
      covered.add(`${r}:${c}`);
    });
  }
  check(puzzle.requiredWordIds.every(id => puzzle.board.placements.some(p => p.wordId === id)), `${puzzle.id}: missing placement`);
  puzzle.board.cells.forEach((row,r) => row.forEach((letter,c) => check(letter === null || covered.has(`${r}:${c}`), `${puzzle.id}: uncovered cell`)));
}
unique(accepted.words, 'accepted word');
const acceptedSet = new Set(accepted.words);
check(accepted.length === 5 && accepted.words.every(w => /^[a-z]{5}$/.test(w)), 'Invalid accepted words');
unique(guess.rounds.map(r => r.id), 'Guess round');
for (const round of guess.rounds) {
  reference(round.targetWordId, round.id); const word = byId.get(round.targetWordId);
  check(round.wordLength === 5 && word?.length === round.wordLength, `${round.id}: invalid target length`);
  check(acceptedSet.has(word?.word), `${round.id}: unaccepted target`);
  check(round.acceptedWordsListId === accepted.id && round.maxAttempts === 5, `${round.id}: invalid rules`);
}
unique(definitions.rounds.map(r => r.id), 'Definition round');
for (const round of definitions.rounds) {
  check(round.questions.length === round.questionsPerRound && round.questionsPerRound === 6, `${round.id}: invalid question count`);
  unique(round.questions.map(q => q.id), `${round.id} question`);
  for (const q of round.questions) {
    [q.wordId, q.correctWordId, ...q.optionWordIds].forEach(id => reference(id, q.id));
    check(q.optionWordIds.length === 4 && new Set(q.optionWordIds).size === 4, `${q.id}: need four distinct options`);
    check(q.wordId === q.correctWordId && q.optionWordIds.includes(q.correctWordId), `${q.id}: invalid correct answer`);
  }
}
check(finder.puzzles.length >= 10 && finder.puzzleCount === finder.puzzles.length, 'Invalid Finder count');
check(guess.rounds.length >= 10 && guess.roundCount === guess.rounds.length, 'Invalid Guess count');
check(definitions.rounds.length >= 10 && definitions.roundCount === definitions.rounds.length, 'Invalid Definition count');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Validated ${bank.words.length} words, ${finder.puzzles.length} Word Finder puzzles, ${guess.rounds.length} Word Guess rounds and ${definitions.rounds.length} Definition Guess rounds.`);
