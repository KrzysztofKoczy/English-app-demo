const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../.cache/word-game-tests/word-games/word-game-engine.js');
const storage = require('../.cache/word-game-tests/word-games/word-game-storage.js');
const load = name => JSON.parse(fs.readFileSync(path.join(__dirname, '../src/assets/game-data/word-games', name), 'utf8'));
const words = load('word-bank.json').words;
const byId = new Map(words.map(w => [w.id, w]));
const bySpelling = new Map(words.flatMap(w => w.acceptedSpellings.map(s => [s, w])));
const finder = load('word-finder/puzzles.json').puzzles;
const guess = load('word-guess/rounds.json').rounds;
const accepted = new Set(load('word-guess/accepted-five-letter.json').words);
const definitions = load('definition-guess/rounds.json').rounds;
for (const [target, attempt, expected] of [
  ['apple', 'allee', ['correct','present','absent','absent','correct']],
  ['sheep', 'speed', ['correct','present','correct','correct','absent']],
  ['speed', 'sheep', ['correct','absent','correct','correct','present']],
  ['level', 'hello', ['absent','correct','present','present','absent']],
  ['green', 'eerie', ['present','present','present','absent','absent']],
]) test(`duplicate letters: ${attempt} / ${target}`, () => assert.deepEqual(engine.evaluateGuess(attempt, target), expected));

test('normalization and keyboard priority never downgrade a known letter', () => {
  assert.deepEqual(engine.evaluateGuess(' APPLE ', 'apple'), Array(5).fill('correct'));
  assert.equal(engine.keyboardMarks([{word:'apple',marks:engine.evaluateGuess('apple','apple')},{word:'paper',marks:engine.evaluateGuess('paper','apple')}]).a, 'correct');
});
test('Word Guess rejects invalid entries without consuming attempts; ends and locks win/loss', () => {
  const round = guess[0], target = byId.get(round.targetWordId).word;
  let state = engine.newGuess();
  state = engine.submitGuess(state, 'ab', round, target, accepted);
  assert.equal(state.attempts.length, 0);
  state = engine.submitGuess(state, 'zzzzz', round, target, accepted);
  assert.equal(state.message, 'Not a word'); assert.equal(state.attempts.length, 0);
  const won = engine.submitGuess(state, ` ${target.toUpperCase()} `, round, target, accepted);
  assert.equal(won.won, true); assert.equal(won.finished, true);
  assert.equal(engine.submitGuess(won, 'apple', round, target, accepted), won);
  for (let i=0; i<round.maxAttempts; i++) state = engine.submitGuess(state, 'apple', round, target, accepted);
  assert.equal(state.finished, true); assert.equal(state.won, false); assert.equal(state.attempts.length, 5);
});
test('Word Finder: required, duplicate, bonus, unrelated known word and invalid string', () => {
  const round = finder.find(p => p.bonusWordIds.length);
  assert.ok(round);
  let state = engine.submitFinder(engine.newFinder(), byId.get(round.requiredWordIds[0]).word, round, bySpelling);
  assert.equal(state.score, 10); assert.equal(state.found.length, 1);
  state = engine.submitFinder(state, byId.get(round.requiredWordIds[0]).word, round, bySpelling);
  assert.equal(state.score, 10);
  state = engine.submitFinder(state, byId.get(round.bonusWordIds[0]).word, round, bySpelling);
  assert.equal(state.score, 15); assert.equal(state.bonus.length, 1);
  state = engine.submitFinder(state, byId.get(round.bonusWordIds[0]).word, round, bySpelling);
  assert.equal(state.score, 15);
  const unrelated = words.find(w => ![...round.requiredWordIds, ...round.bonusWordIds].includes(w.id));
  state = engine.submitFinder(state, unrelated.word, round, bySpelling);
  assert.match(state.message, /nie znajduje/); assert.equal(state.mistakes, 0);
  state = engine.submitFinder(state, 'zzzz', round, bySpelling);
  assert.equal(state.mistakes, 1);
});
test('Finder hints reveal distinct cells, respect budget and leave source data intact', () => {
  const round = finder[0], original = JSON.stringify(round);
  let state = engine.finderHint(engine.newFinder(), 'reveal_letter', round, byId);
  state = engine.finderHint(state, 'reveal_letter', round, byId);
  assert.equal(new Set(state.revealed).size, 2);
  assert.equal(engine.finderHint(state, 'reveal_letter', round, byId), state);
  let translations = engine.finderHint(engine.newFinder(), 'reveal_translation', round, byId);
  translations = engine.finderHint(translations, 'reveal_translation', round, byId);
  assert.equal(new Set(translations.translated).size, 2);
  assert.equal(JSON.stringify(round), original);
});
test('All Finder boards can be completed and every placement becomes visible', () => {
  for (const round of finder) {
    let state = engine.newFinder();
    for (const id of round.requiredWordIds) state = engine.submitFinder(state, byId.get(id).word, round, bySpelling);
    assert.equal(state.found.length, round.requiredWordIds.length);
    const visible = engine.visibleFinderCells(state, round, byId);
    round.board.placements.forEach(p => engine.placementCells(p, byId.get(p.wordId).length).forEach(cell => assert.ok(visible.has(cell))));
  }
});
test('Definition Guess: correct/wrong, answer locking, next, final score and review list', () => {
  for (const round of definitions) {
    let state = engine.newDefinition();
    assert.equal(engine.nextDefinition(state, round), state);
    for (let i=0; i<round.questions.length; i++) {
      const q = round.questions[i], answer = i % 2 ? q.optionWordIds.find(id => id !== q.correctWordId) : q.correctWordId;
      state = engine.answerDefinition(state, answer, round);
      assert.equal(engine.answerDefinition(state, q.correctWordId, round), state);
      state = engine.nextDefinition(state, round);
    }
    assert.equal(state.score, 3); assert.equal(state.finished, true); assert.equal(state.difficult.length, 3);
    assert.equal(engine.nextDefinition(state, round), state);
  }
});
test('Progress round-trips through adapter and tracks wins, losses and best streak', () => {
  const data = new Map(); const repo = new storage.LocalWordGameProgressRepository(() => ({ getItem:k => data.get(k) ?? null, setItem:(k,v) => data.set(k,v) }));
  let state = repo.load();
  const result = { game:'word_guess', roundId:'WG-001', completed:true, score:20, hintsUsed:0, mistakes:2, difficultWordIds:[], completedAt:'2026-09-18T12:00:00Z' };
  state = storage.recordResult(state, result, true); state = storage.recordResult(state, result, true); state = storage.recordResult(state, result, false);
  assert.deepEqual(state.guess, { currentStreak:0, bestStreak:2, played:3, won:2 });
  repo.save(state); assert.deepEqual(repo.load(), state);
  data.set('english-app-demo.word-games.v1', '{broken'); assert.throws(() => repo.load());
  data.set('english-app-demo.word-games.v1', JSON.stringify({results:{},guess:{}})); assert.throws(() => repo.load());
});

