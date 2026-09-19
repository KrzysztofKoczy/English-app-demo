import type { Card } from '../core/models';
import type { Idiom, IdiomExercise, IdiomProgressMap, UserIdiomProgress } from './idiom-models';

const frequencyRank = { very_common: 0, common: 1, less_common: 2 };

export function selectIdioms(idioms: readonly Idiom[], progress: IdiomProgressMap, category: string, count: number, now = new Date().toISOString()): Idiom[] {
  const priority = (id: string) => {
    const state = progress[id];
    if (!state || state.status === 'new' || state.status === 'review' || (state.nextReviewAt && state.nextReviewAt <= now)) return 0;
    return state.status === 'learning' ? 1 : 2;
  };
  return idioms.filter(i => i.active && (category === 'mix' || i.category === category))
    .sort((a, b) => frequencyRank[a.frequency] - frequencyRank[b.frequency]
      || priority(a.id) - priority(b.id)
      || (progress[a.id]?.lastSeenAt ?? '').localeCompare(progress[b.id]?.lastSeenAt ?? '')
      || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, Math.floor(count)));
}

export function newProgress(idiomId: string): UserIdiomProgress {
  return { idiomId, status: 'new', correctAnswers: 0, incorrectAnswers: 0, mastery: 0, savedToFlashcards: false };
}

export function assessIdiom(state: UserIdiomProgress, known: boolean, now: string): UserIdiomProgress {
  return { ...state, selfAssessment: known ? 'known' : 'unknown', lastSeenAt: now,
    status: known ? (state.status === 'new' ? 'learning' : state.status) : 'review' };
}

// A small MVP score, not a spaced-repetition algorithm. Only exercises raise mastery.
export function recordAnswer(state: UserIdiomProgress, correct: boolean, now: string): UserIdiomProgress {
  const mastery = Math.max(0, Math.min(100, state.mastery + (correct ? 25 : -25)));
  return { ...state, mastery, correctAnswers: state.correctAnswers + Number(correct),
    incorrectAnswers: state.incorrectAnswers + Number(!correct), lastSeenAt: now,
    status: correct ? (mastery === 100 ? 'mastered' : 'learning') : 'review' };
}

export function saveIdiomCard(state: UserIdiomProgress): UserIdiomProgress {
  return { ...state, savedToFlashcards: true };
}

// The existing card view receives a projection. Persistence stores only the idiom reference.
export function idiomCards(idioms: readonly Idiom[], progress: IdiomProgressMap): Card[] {
  return idioms.filter(i => i.active && progress[i.id]?.savedToFlashcards).map(i => ({
    id: `idiom:${i.id}`, type: 'idiom', idiomId: i.id,
    front: i.idiom, back: i.meaningPl,
    example: `${i.examples[0]?.sentence ?? ''} — ${i.examples[0]?.translationPl ?? ''}`,
  }));
}

export function exercisesFor(idioms: readonly Idiom[], exercises: readonly IdiomExercise[]): IdiomExercise[] {
  return idioms.flatMap(idiom => exercises.filter(e => e.idiomId === idiom.id)
    .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id)));
}
