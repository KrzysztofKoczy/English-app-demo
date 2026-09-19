import { Injectable, computed, inject, signal } from '@angular/core';
import { IdiomContentService } from './idiom-content.service';
import { IdiomProgressService } from './idiom-progress.service';
import { exercisesFor } from './idiom-learning';
import { shuffleOptions, shuffled } from '../core/shuffle';
import { Idiom, IdiomContent, IdiomLearningSession, IdiomExercise } from './idiom-models';

@Injectable()
export class IdiomsService {
  private readonly contentService = inject(IdiomContentService);
  readonly progress = inject(IdiomProgressService);
  readonly content = signal<IdiomContent | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly session = signal<IdiomLearningSession | null>(null);
  readonly categories = computed(() => this.content()?.categories.filter(c => c.selectable && this.available(c.id) > 0) ?? []);
  private readonly sessionExercises = signal<IdiomExercise[]>([]);
  readonly idioms = computed(() => {
    const content = this.content();
    return this.session()?.idiomIds.flatMap(id => content?.idioms.filter(i => i.id === id) ?? []) ?? [];
  });
  readonly currentIdiom = computed(() => this.idioms()[this.session()?.learningIndex ?? 0] ?? null);
  readonly currentExercise = computed(() => {
    const session = this.session();
    return this.sessionExercises().find(e => e.id === session?.exerciseIds[session.exerciseIndex]) ?? null;
  });
  readonly feedback = computed(() => this.session()?.answers.find(a => a.exerciseId === this.currentExercise()?.id) ?? null);
  readonly correct = computed(() => this.session()?.answers.filter(a => a.correct).length ?? 0);
  readonly incorrect = computed(() => this.session()?.answers.filter(a => !a.correct).length ?? 0);
  readonly saved = computed(() => this.idioms().filter(i => this.progress.progress()[i.id]?.savedToFlashcards).length);
  readonly difficult = computed(() => this.idioms().filter(i => this.session()?.unknownIds.includes(i.id)
    || this.session()?.answers.some(a => a.idiomId === i.id && !a.correct)));
  readonly withoutExercises = computed(() => this.idioms().filter(i => !this.content()?.exercises.some(e => e.idiomId === i.id)));
  async load() {
    if (this.busy() || this.content()) return;
    this.busy.set(true); this.error.set('');
    try { this.content.set(await this.contentService.load()); }
    catch { this.error.set('Nie udało się wczytać materiałów do idiomów. Spróbuj ponownie.'); }
    finally { this.busy.set(false); }
  }
  available(category: string) { return this.content()?.idioms.filter(i => i.active && (category === 'mix' || i.category === category)).length ?? 0; }
  start(count: number, category: string) {
    if (![3, 5, 10, 20].includes(count) || !this.categories().some(c => c.id === category)) return;
    const selected = shuffled(this.content()?.idioms.filter(i => i.active && (category === 'mix' || i.category === category)) ?? []).slice(0, count);
    this.begin(selected, count, category);
  }
  private begin(idioms: Idiom[], requestedCount: number, category: string) {
    if (!idioms.length) return;
    this.sessionExercises.set(exercisesFor(idioms, this.content()?.exercises ?? []).map(shuffleOptions));
    this.session.set({ idiomIds: idioms.map(i => i.id), exerciseIds: this.sessionExercises().map(e => e.id),
      requestedCount, category, stage: 'learning', learningIndex: 0, exerciseIndex: 0, answers: [], unknownIds: [] });
  }
  assess(known: boolean) {
    const session = this.session(), idiom = this.currentIdiom();
    if (!session || session.stage !== 'learning' || !idiom) return;
    this.progress.assess(idiom.id, known);
    const learningIndex = session.learningIndex + 1;
    this.session.set({ ...session, learningIndex, unknownIds: known ? session.unknownIds : [...session.unknownIds, idiom.id],
      stage: learningIndex < session.idiomIds.length ? 'learning' : session.exerciseIds.length ? 'exercises' : 'summary' });
  }
  saveCurrent() { const idiom = this.currentIdiom(); if (idiom) this.progress.saveCard(idiom.id); }
  answer(selected: number) {
    const session = this.session(), exercise = this.currentExercise();
    if (!session || session.stage !== 'exercises' || !exercise || this.feedback()
      || !Number.isInteger(selected) || selected < 0 || selected >= exercise.options.length) return;
    const correct = selected === exercise.correctOptionIndex;
    this.progress.answer(exercise.idiomId, correct);
    this.session.set({ ...session, answers: [...session.answers, { exerciseId: exercise.id, idiomId: exercise.idiomId, selected, correct }] });
  }
  nextExercise() {
    const session = this.session();
    if (!session || session.stage !== 'exercises' || !this.feedback()) return;
    const exerciseIndex = session.exerciseIndex + 1;
    this.session.set({ ...session, exerciseIndex, stage: exerciseIndex < session.exerciseIds.length ? 'exercises' : 'summary' });
  }
  repeatDifficult() { this.begin(this.difficult(), this.difficult().length, this.session()?.category ?? 'mix'); }
  reset() { this.session.set(null); }
}
