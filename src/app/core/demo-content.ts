import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { Card } from './models';
import { distinct, integer, nonempty, requireContent as check } from './content-validation';

export interface DemoQuestion {
  id: string; sentence: string; options: string[]; correctOptionIndex: number;
  explanationPl: string; level: string; translationPl?: string;
}
export interface DemoTopic { id: string; title: string; description: string; questions: DemoQuestion[]; }
export interface TopicFile { version: number; topics: DemoTopic[]; }
export interface BattleFile { version: number; questions: DemoQuestion[]; }

export function validateQuestions(questions: DemoQuestion[]): void {
  check(Array.isArray(questions) && questions.length > 0, 'question list');
  check(distinct(questions.map(q => q.id)), 'question IDs');
  for (const q of questions) {
    check(nonempty(q.id) && nonempty(q.sentence) && nonempty(q.explanationPl), 'question fields');
    check(q.sentence.split('___').length === 2, 'one question gap');
    check(Array.isArray(q.options) && q.options.length === 5 && q.options.every(nonempty)
      && distinct(q.options.map(o => o.trim().toLowerCase())), 'five distinct options');
    check(integer(q.correctOptionIndex) && q.correctOptionIndex < 5, 'answer key');
  }
}

@Injectable({ providedIn: 'root' })
export class DemoContent {
  private readonly http = inject(HttpClient);
  private topicRequest?: Promise<TopicFile>;
  private battleRequest?: Promise<BattleFile>;
  private cardRequest?: Promise<{ version: number; cards: Card[] }>;
  topics() {
    return this.topicRequest ??= firstValueFrom(this.http.get<TopicFile>('assets/demo/topics.json').pipe(timeout(15000)))
      .then(file => {
        check(file?.version === 1 && Array.isArray(file.topics) && file.topics.length > 0, 'topic file');
        check(distinct(file.topics.map(t => t.id)), 'topic IDs');
        for (const topic of file.topics) {
          check(nonempty(topic.id) && nonempty(topic.title) && nonempty(topic.description), 'topic fields');
          validateQuestions(topic.questions);
        }
        return file;
      }).catch(error => { this.topicRequest = undefined; throw error; });
  }
  battle() {
    return this.battleRequest ??= firstValueFrom(this.http.get<BattleFile>('assets/demo/battle.json').pipe(timeout(15000)))
      .then(file => { check(file?.version === 1, 'battle version'); validateQuestions(file.questions); return file; })
      .catch(error => { this.battleRequest = undefined; throw error; });
  }
  cards() {
    return this.cardRequest ??= firstValueFrom(this.http.get<{ version: number; cards: Card[] }>('assets/demo/cards.json').pipe(timeout(15000)))
      .then(file => {
        check(file?.version === 1 && Array.isArray(file.cards) && file.cards.length > 0, 'card file');
        check(distinct(file.cards.map(c => c.id)) && file.cards.every(c => nonempty(c.id) && nonempty(c.front) && nonempty(c.back) && nonempty(c.example)), 'card fields');
        return file;
      }).catch(error => { this.cardRequest = undefined; throw error; });
  }
}
