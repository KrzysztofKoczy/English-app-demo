export interface IdiomExample { sentence: string; translationPl: string; }
export type SourceSupport = 'meaning' | 'usage' | 'level' | 'frequency' | 'example';
export interface IdiomSource {
  name: string;
  type: 'dictionary' | 'corpus' | 'book' | 'research' | 'other';
  url?: string | null;
  supports: SourceSupport[];
  verified: boolean;
}
export interface Idiom {
  id: string;
  idiom: string;
  meaningPl: string;
  definitionEn: string;
  level: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  frequency: 'very_common' | 'common' | 'less_common';
  category: string;
  tags?: string[];
  literalMeaningPl?: string | null;
  examples: IdiomExample[];
  usageNotePl?: string | null;
  sources: IdiomSource[];
  active: boolean;
}
export interface IdiomCategory { id: string; label: string; selectable: boolean; description?: string; }
export interface IdiomExercise {
  id: string;
  idiomId: string;
  type: 'meaning-choice' | 'gap-fill' | 'context-choice';
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[];
  correctOptionIndex: number;
}
export type IdiomLearningStatus = 'new' | 'learning' | 'review' | 'mastered';
export interface UserIdiomProgress {
  idiomId: string;
  status: IdiomLearningStatus;
  selfAssessment?: 'known' | 'unknown';
  correctAnswers: number;
  incorrectAnswers: number;
  mastery: number;
  savedToFlashcards: boolean;
  lastSeenAt?: string;
  nextReviewAt?: string | null;
}
export interface IdiomAnswer { exerciseId: string; idiomId: string; selected: number; correct: boolean; }
export interface IdiomLearningSession {
  idiomIds: string[];
  exerciseIds: string[];
  requestedCount: number;
  category: string;
  stage: 'learning' | 'exercises' | 'summary';
  learningIndex: number;
  exerciseIndex: number;
  answers: IdiomAnswer[];
  unknownIds: string[];
}
export interface IdiomContent { idioms: Idiom[]; categories: IdiomCategory[]; exercises: IdiomExercise[]; note?: string; }
export type IdiomProgressMap = Readonly<Record<string, UserIdiomProgress>>;
