import type { Idiom, IdiomCategory, IdiomExercise } from './idiom-models';
import { cefr, distinct, integer, nonempty, requireContent as check, strings } from '../core/content-validation';
export interface IdiomFile { version: number; idioms: Idiom[]; note?: string; }
export interface CategoryFile { version: number; categories: IdiomCategory[]; }
export interface ExerciseFile { version: number; exercises: IdiomExercise[]; }
export function validateIdiomContent(content: IdiomFile, categories: CategoryFile, exercises: ExerciseFile): void {
  check([content, categories, exercises].every(f => f?.version === 1), 'idiom version');
  check(Array.isArray(content.idioms) && Array.isArray(categories.categories) && Array.isArray(exercises.exercises), 'idiom arrays');
  check(distinct(content.idioms.map(i => i.id)) && distinct(categories.categories.map(c => c.id)) && distinct(exercises.exercises.map(e => e.id)), 'duplicate idiom/category/exercise IDs');
  check(categories.categories.every(c => nonempty(c.id) && nonempty(c.label) && typeof c.selectable === 'boolean'), 'category fields');
  check(categories.categories.some(c => c.id === 'mix' && c.selectable), 'default Mix category');
  const ids = new Set(content.idioms.map(i => i.id));
  for (const idiom of content.idioms) {
    check(nonempty(idiom.id) && nonempty(idiom.idiom) && nonempty(idiom.meaningPl) && nonempty(idiom.definitionEn)
      && cefr(idiom.level) && ['very_common', 'common', 'less_common'].includes(idiom.frequency) && typeof idiom.active === 'boolean', 'idiom fields');
    check(categories.categories.some(c => c.id === idiom.category && c.id !== 'mix'), 'idiom category');
    check(Array.isArray(idiom.examples) && idiom.examples.length && idiom.examples.every(e => nonempty(e.sentence) && nonempty(e.translationPl)), 'idiom examples');
    check(Array.isArray(idiom.sources) && idiom.sources.every(s => nonempty(s.name) && ['dictionary', 'corpus', 'book', 'research', 'other'].includes(s.type)
      && typeof s.verified === 'boolean' && Array.isArray(s.supports) && s.supports.every(v => ['meaning', 'usage', 'level', 'frequency', 'example'].includes(v))
      && (s.url == null || typeof s.url === 'string')), 'idiom sources');
  }
  for (const exercise of exercises.exercises) {
    check(nonempty(exercise.id) && ids.has(exercise.idiomId) && ['meaning-choice', 'gap-fill', 'context-choice'].includes(exercise.type)
      && [1, 2, 3].includes(exercise.difficulty) && nonempty(exercise.question), 'exercise fields');
    check(strings(exercise.options) && exercise.options.length >= 2 && distinct(exercise.options.map(o => o.trim().toLowerCase()))
      && integer(exercise.correctOptionIndex) && exercise.correctOptionIndex < exercise.options.length, 'exercise choices');
  }
}
