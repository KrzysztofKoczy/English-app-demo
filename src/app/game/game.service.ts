import { Injectable, computed, inject, signal } from '@angular/core';
import { BattleRecord } from './battle-record';
import { LearningApi } from '../core/learning-api';
import { Feedback, GameView, Question } from '../core/models';
import { errorMessage, RequestState } from '../core/request-state';

@Injectable()
export class GameService {
  private readonly api = inject(LearningApi);
  readonly record = inject(BattleRecord);
  readonly displayedLevel = signal(0);
  readonly request = new RequestState();
  readonly game = signal<GameView | null>(null);
  readonly question = signal<Question | null>(null);
  readonly feedback = signal<Feedback | null>(null);
  readonly selected = signal<number | null>(null);
  readonly showResult = computed(() => !!this.game()?.complete && !this.feedback());
  readonly progress = computed(() => { const g = this.game(); return g && g.total > 0 ? g.answered / g.total * 100 : 0; });
  private revision = 0;
  async load(id: string) {
    const revision = ++this.revision;
    this.request.reset();
    this.request.busy.set(true); this.request.error.set('');
    this.game.set(null); this.question.set(null); this.feedback.set(null); this.selected.set(null);
    try {
      const game = await this.api.game(id);
      if (revision === this.revision) { this.game.set(game); this.question.set(game.question); this.displayedLevel.set(game.level); this.saveRecord(); }
    } catch (error) { if (revision === this.revision) this.request.error.set(errorMessage(error)); }
    finally { if (revision === this.revision) this.request.busy.set(false); }
  }
  answer(option: number) {
    const game = this.game(), question = this.question(), revision = this.revision;
    if (!game || !question || this.feedback()) return;
    return this.request.run(async () => {
      this.selected.set(option);
      const result = await this.api.answer(game.id, question.id, option);
      if (revision !== this.revision) return;
      this.game.set(result.game); this.feedback.set(result.feedback);
      if (result.game.topic === "battle") this.record.reach(result.game.answered);
    });
  }
  private saveRecord() {
    const game = this.game();
    if (game?.topic === "battle") this.record.reach(game.answered + (game.complete ? 0 : 1));
  }
  next() { this.displayedLevel.set(this.game()?.level ?? 0); this.saveRecord(); this.question.set(this.game()?.question ?? null); this.feedback.set(null); this.selected.set(null); }
}
