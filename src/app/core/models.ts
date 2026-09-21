export interface Page<T> { items: T[]; page: number; hasMore: boolean; }
export interface Topic { id: string; title: string; description: string; icon: string; questionCount: number; }
export interface Card { id: string; front: string; back: string; example: string; type?: 'word' | 'idiom' | 'phrase'; idiomId?: string; }
export interface Profile { xp: number; level: number; levelXp: number; nextLevelXp: number; completedRounds: number; knownCards: number; }
export interface Question { id: string; sentence: string; translationPl?: string; options: { id: number; text: string }[]; }
export interface GameView { id: string; topic: string; title: string; total: number; answered: number; lives: number; xp: number; complete: boolean; question: Question | null; level: number; }
export interface Feedback { correct: boolean; correctOption: number; explanation: string; }
export interface AnswerResult { game: GameView; feedback: Feedback; }
