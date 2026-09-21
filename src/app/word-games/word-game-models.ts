export type WordGame = 'word_finder' | 'word_guess' | 'definition_guess';
export interface WordEntry {
  readonly id: string; readonly word: string; readonly lemma: string; readonly length: number;
  readonly cefr: string; readonly partOfSpeech: string; readonly topics: readonly string[];
  readonly translationsPl: readonly string[]; readonly definitionEn: string; readonly exampleEn: string;
  readonly acceptedSpellings: readonly string[]; readonly allowedAsTarget: boolean;
  readonly allowedAsGuess: boolean; readonly contentSource: string;
}
export interface Round { readonly id: string; readonly level: number; readonly cefr: string; }
export interface Placement { readonly wordId: string; readonly startRow: number; readonly startColumn: number; readonly direction: 'horizontal' | 'vertical'; }
export type FinderHint = 'reveal_translation' | 'reveal_letter';
export interface FinderPuzzle extends Round {
  readonly difficulty: number; readonly letters: readonly string[];
  readonly requiredWordIds: readonly string[]; readonly bonusWordIds: readonly string[];
  readonly board: { readonly rows: number; readonly columns: number; readonly cells: readonly (readonly (string | null)[])[]; readonly placements: readonly Placement[] };
  readonly hints: { readonly max: number; readonly types: readonly FinderHint[] };
}
export type GuessHint = 'topic' | 'part_of_speech' | 'translation_pl';
export interface GuessRound extends Round {
  readonly targetWordId: string; readonly wordLength: number; readonly maxAttempts: number;
  readonly hintOrder: readonly GuessHint[];
}
export type DefinitionHint = 'first_letter' | 'word_length' | 'translation_pl';
export interface DefinitionQuestion {
  readonly id: string; readonly wordId: string; readonly optionWordIds: readonly string[];
  readonly correctWordId: string; readonly hints: readonly DefinitionHint[];
}
export interface DefinitionRound extends Round { readonly topic: string; readonly questionsPerRound: number; readonly questions: readonly DefinitionQuestion[]; }
export interface WordGameContent {
  readonly words: readonly WordEntry[]; readonly finder: readonly FinderPuzzle[];
  readonly guess: readonly GuessRound[]; readonly definitions: readonly DefinitionRound[];
}
export interface WordGameProgress {
  game: WordGame; roundId: string; completed: boolean; score: number; hintsUsed: number;
  mistakes: number; completedAt?: string; difficultWordIds: string[];
}
export interface GuessStatistics { currentStreak: number; bestStreak: number; played: number; won: number; }
export interface SavedWordGames { results: Record<string, WordGameProgress>; guess: GuessStatistics; }
export type LetterMark = 'correct' | 'present' | 'absent';
export interface GuessAttempt { word: string; marks: LetterMark[]; }
