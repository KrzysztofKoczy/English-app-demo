import { Injectable, computed, inject, signal } from '@angular/core';
import { LearningApi } from '../core/learning-api';
import { Card } from '../core/models';
import { RequestState } from '../core/request-state';
import { IdiomContentService } from '../idioms/idiom-content.service';
import { IdiomProgressService } from '../idioms/idiom-progress.service';
import { idiomCards } from '../idioms/idiom-learning';

@Injectable()
export class CardsService {
  private readonly api = inject(LearningApi);
  private readonly idiomContent = inject(IdiomContentService);
  readonly idiomProgress = inject(IdiomProgressService);
  readonly deck = signal<'words' | 'idioms'>('words');
  readonly request = new RequestState();
  readonly items = signal<Card[]>([]);
  readonly index = signal(0);
  readonly flipped = signal(false);
  readonly done = signal(false);
  readonly current = computed(() => this.items()[this.index()] ?? null);
  readonly savedIdioms = computed(() => Object.values(this.idiomProgress.progress()).filter(p => p.savedToFlashcards).length);
  private page = 0;
  private more = false;
  private pendingPage: number | null = null;
  load() { return this.request.run(async () => {
    if (this.deck() === 'idioms') {
      const content = await this.idiomContent.load();
      this.items.set(idiomCards(content.idioms, this.idiomProgress.progress())); this.more = false;
    } else {
      const nextPage = this.pendingPage ?? this.page;
      const response = await this.api.cards(nextPage);
      this.page = nextPage; this.pendingPage = null;
      this.items.set(response.items); this.more = response.hasMore;
    }
    this.index.set(0); this.flipped.set(false); this.done.set(!this.items().length);
  }); }
  review(known: boolean) {
    const card = this.current();
    if (!card || !this.flipped() || this.done() || this.pendingPage !== null) return;
    return this.request.run(async () => {
      if (card.type === 'idiom' && card.idiomId) this.idiomProgress.assess(card.idiomId, known);
      else await this.api.review(card.id, known);
      this.flipped.set(false);
      if (this.index() + 1 < this.items().length) this.index.update(i => i + 1);
      else if (this.more) {
        this.pendingPage = this.page + 1;
        const response = await this.api.cards(this.pendingPage);
        this.page = this.pendingPage; this.pendingPage = null;
        this.items.set(response.items); this.index.set(0); this.more = response.hasMore;
        this.done.set(!response.items.length);
      } else this.done.set(true);
    });
  }
  selectDeck(deck: 'words' | 'idioms') {
    if (this.request.busy()) return;
    this.deck.set(deck); this.items.set([]); return this.restart();
  }
  enter() { if (this.deck() === 'idioms') return this.restart(); if (!this.items().length) return this.load(); return undefined; }
  retry() { return this.load(); }
  restart() { if (this.request.busy()) return; this.pendingPage = null; this.page = 0; this.done.set(false); this.flipped.set(false); return this.load(); }
}
