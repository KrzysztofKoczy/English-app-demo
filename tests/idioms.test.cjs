const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { selectIdioms, newProgress, assessIdiom, recordAnswer, saveIdiomCard, idiomCards, exercisesFor } = require('../.cache/idiom-tests/idioms/idiom-learning.js');
const { LocalIdiomProgressRepository } = require('../.cache/idiom-tests/idioms/idiom-storage.js');
const data = name => JSON.parse(readFileSync(path.join(__dirname, '../src/assets/data/idioms', name), 'utf8'));
const idioms = data('idioms.json').idioms;
const exercises = data('exercises.json').exercises;
const now = '2026-09-18T12:00:00.000Z';
const fixture = (id, overrides = {}) => ({ ...idioms[0], id, ...overrides });

test('category filter uses primary category, excludes inactive records and handles Mix', () => {
  const list = [fixture('a', { category: 'work' }), fixture('b', { category: 'relationships' }), fixture('c', { category: 'work', active: false })];
  assert.deepEqual(selectIdioms(list, {}, 'work', 10).map(i => i.id), ['a']);
  assert.equal(selectIdioms(list, {}, 'mix', 10).length, 2);
  assert.deepEqual(selectIdioms(list, {}, 'travel', 5), []);
});
test('frequency priority is very_common, common, less_common', () => {
  const list = [fixture('a', { frequency: 'less_common' }), fixture('b', { frequency: 'common' }), fixture('c')];
  assert.deepEqual(selectIdioms(list, {}, 'mix', 20).map(i => i.id), ['c', 'b', 'a']);
});
for (const limit of [5, 10, 20]) test(`limit ${limit} selects unique records without mutating content`, () => {
  const list = Array.from({ length: 25 }, (_, index) => fixture(`item-${index}`));
  const before = JSON.stringify(list);
  const selected = selectIdioms(list, {}, 'mix', limit);
  assert.equal(selected.length, limit);
  assert.equal(new Set(selected.map(i => i.id)).size, limit);
  assert.equal(JSON.stringify(list), before);
});
test('small dataset returns actual size, never duplicates to fill requested limit', () => {
  for (const limit of [5, 10, 20]) assert.equal(selectIdioms(idioms.slice(0, 2), {}, 'mix', limit).length, 2);
});
test('within frequency, new and review precede learning and mastered; oldest seen wins ties', () => {
  const list = ['mastered', 'learning', 'new', 'review'].map(id => fixture(id));
  const progress = { mastered: { ...newProgress('mastered'), status: 'mastered' }, learning: { ...newProgress('learning'), status: 'learning' }, review: { ...newProgress('review'), status: 'review', lastSeenAt: now } };
  assert.deepEqual(selectIdioms(list, progress, 'mix', 5).map(i => i.id), ['new', 'review', 'learning', 'mastered']);
});
test('Znam only changes self-assessment, never raises mastery or exercise counters', () => {
  const initial = newProgress('a');
  const known = assessIdiom(initial, true, now);
  assert.equal(known.selfAssessment, 'known');
  assert.notEqual(known.status, 'mastered');
  assert.equal(known.mastery, 0);
  assert.equal(known.correctAnswers, 0);
  assert.equal(initial.status, 'new');
  assert.equal(assessIdiom(initial, false, now).status, 'review');
});
test('exercise answers update counters, dates, score and review status with bounded mastery', () => {
  let state = newProgress('a');
  for (let i = 0; i < 4; i++) state = recordAnswer(state, true, now);
  assert.equal(state.status, 'mastered'); assert.equal(state.mastery, 100); assert.equal(state.correctAnswers, 4);
  state = recordAnswer(state, false, now);
  assert.equal(state.status, 'review'); assert.equal(state.mastery, 75); assert.equal(state.incorrectAnswers, 1); assert.equal(state.lastSeenAt, now);
  for (let i = 0; i < 5; i++) state = recordAnswer(state, false, now);
  assert.equal(state.mastery, 0);
});
test('saved idiom is projected into existing Card model with stable reference, without duplicates', () => {
  const idiom = idioms[0];
  const saved = saveIdiomCard(saveIdiomCard(newProgress(idiom.id)));
  const cards = idiomCards(idioms, { [idiom.id]: saved });
  assert.equal(cards.length, 1); assert.equal(cards[0].type, 'idiom');
  assert.equal(cards[0].idiomId, idiom.id); assert.equal(cards[0].front, idiom.idiom);
  assert.equal(cards[0].back, idiom.meaningPl); assert.ok(cards[0].example.includes(idiom.examples[0].translationPl));
  assert.equal(saved.mastery, 0); assert.ok(!('meaningPl' in saved));
});
test('LocalStorage adapter restores counters and card references after recreation', () => {
  const memory = new Map();
  const storage = () => ({ getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) });
  const original = saveIdiomCard(recordAnswer(assessIdiom(newProgress(idioms[0].id), true, now), false, now));
  new LocalIdiomProgressRepository(storage).save({ [original.idiomId]: original });
  const reloaded = new LocalIdiomProgressRepository(storage).load();
  assert.deepEqual(reloaded[original.idiomId], original);
  assert.equal(idiomCards(idioms, reloaded).length, 1);
});
test('adapter rejects damaged data and propagates unavailable storage for UI warning', () => {
  assert.throws(() => new LocalIdiomProgressRepository(() => ({ getItem: () => '{bad', setItem() {} })).load());
  assert.throws(() => new LocalIdiomProgressRepository(() => ({ getItem: () => '[{"idiomId":"bad"}]', setItem() {} })).load());
  assert.throws(() => new LocalIdiomProgressRepository(() => { throw Error('Storage disabled'); }).save({}));
});
test('exercises are limited to selected idioms, cover all three supported kinds and valid choices', () => {
  const selected = exercisesFor([idioms[0]], exercises);
  assert.deepEqual(selected.map(e => e.type), ['meaning-choice', 'gap-fill', 'context-choice']);
  assert.equal(exercisesFor([fixture('missing-idiom')], exercises).length, 0);
  for (const exercise of selected) { assert.ok(exercise.correctOptionIndex >= 0 && exercise.correctOptionIndex < exercise.options.length); assert.equal(exercise.idiomId, idioms[0].id); }
});
