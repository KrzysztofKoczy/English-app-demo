import { Injectable, inject } from '@angular/core';
import { DemoContent, DemoQuestion } from './demo-content';
import { AnswerResult, GameView, Profile } from './models';
import { battleQuestions, shuffleOptions, shuffled } from './shuffle';

interface Round {
  id: string; requestId: string; topic: string; title: string; questions: DemoQuestion[];
  answered: number; lives: number; xp: number; receipts: Map<string, { option: number; result: AnswerResult }>;
}
/** Local implementation of the LearningApi contract. No HTTP API or account. */
@Injectable({ providedIn: 'root' })
export class DemoLearningApi {
  private readonly content = inject(DemoContent);
  private round?: Round;
  private pending?: { requestId: string; topic: string; result: Promise<GameView> };
  private readonly known = new Set<string>();
  async topics(page = 0) {
    const file = await this.content.topics();
    const icons: Record<string, string> = { travel: 'airplane-outline', kitchen: 'restaurant-outline', sport: 'fitness-outline' };
    const items = file.topics.map(t => ({ id: t.id, title: t.title, description: t.description, icon: icons[t.id] ?? 'compass-outline', questionCount: t.questions.length }));
    return { items: items.slice(page * 12, (page + 1) * 12), page, hasMore: (page + 1) * 12 < items.length };
  }
  async cards(page = 0) {
    const { cards } = await this.content.cards();
    return { items: cards.slice(page * 12, (page + 1) * 12), page, hasMore: (page + 1) * 12 < cards.length };
  }
  async profile(): Promise<Profile> { return { xp: 0, level: 1, levelXp: 0, nextLevelXp: 100, completedRounds: 0, knownCards: this.known.size }; }
  async review(id: string, known: boolean) {
    if (!(await this.content.cards()).cards.some(c => c.id === id)) throw new Error('Nie znaleziono fiszki.');
    if (known) this.known.add(id); else this.known.delete(id);
    return this.profile();
  }
  start(topic: string, requestId: string): Promise<GameView> {
    if (this.pending) return this.pending.requestId === requestId && this.pending.topic === topic
      ? this.pending.result : Promise.reject(new Error('Poczekaj na rozpoczęcie rundy.'));
    if (this.round?.requestId === requestId) return this.round.topic === topic
      ? Promise.resolve(this.view(this.round)) : Promise.reject(new Error('Ta operacja dotyczy innego tematu.'));
    const result = this.createRound(topic, requestId).finally(() => { this.pending = undefined; });
    this.pending = { requestId, topic, result };
    return result;
  }
  private async createRound(topic: string, requestId: string) {
    let title = 'Battle of Words', questions: DemoQuestion[];
    if (topic === 'battle') {
      const pool = (await this.content.battle()).questions;
      questions = battleQuestions(pool);
    } else {
      const selected = (await this.content.topics()).topics.find(t => t.id === topic);
      if (!selected) throw new Error('Nie znaleziono tematu. Wybierz inną aktywność.');
      title = selected.title; questions = shuffled(selected.questions).slice(0, 5);
    }
    if (!questions.length) throw new Error('Brak pytań w tej próbce.');
    this.round = { id: crypto.randomUUID(), requestId, topic, title, questions: questions.map(shuffleOptions), answered: 0, lives: 3, xp: 0, receipts: new Map() };
    return this.view(this.round);
  }
  async game(id: string) { return this.view(this.find(id)); }
  async answer(id: string, questionId: string, option: number): Promise<AnswerResult> {
    const round = this.find(id);
    const receipt = round.receipts.get(questionId);
    if (receipt) {
      if (receipt.option !== option) throw new Error('Odpowiedź została już zapisana.');
      return structuredClone(receipt.result);
    }
    const question = round.questions[round.answered];
    if (this.complete(round) || question?.id !== questionId || !Number.isInteger(option) || option < 0 || option > 4) throw new Error('To pytanie nie jest już aktywne.');
    const correct = option === question.correctOptionIndex;
    if (correct) round.xp += 10;
    else if (round.topic === 'battle') round.lives--;
    round.answered++;
    const result = { game: this.view(round), feedback: { correct, correctOption: question.correctOptionIndex, explanation: question.explanationPl } };
    round.receipts.set(questionId, { option, result: structuredClone(result) });
    return result;
  }
  private find(id: string) {
    if (!this.round || this.round.id !== id) throw new Error('Ta runda jest już niedostępna. Po odświeżeniu rozpocznij nową z ekranu aktywności.');
    return this.round;
  }
  private complete(round: Round) { return round.answered >= round.questions.length || (round.topic === 'battle' && round.lives === 0); }
  private view(round: Round): GameView {
    const complete = this.complete(round), question = round.questions[round.answered];
    return { id: round.id, topic: round.topic, title: round.title, total: round.questions.length, answered: round.answered,
      lives: round.lives, xp: round.xp, complete, level: Number((question ?? round.questions.at(-1))?.level ?? 0),
      question: complete ? null : { id: question.id, sentence: question.sentence, translationPl: question.translationPl, options: question.options.map((text, id) => ({ id, text })) } };
  }
}
