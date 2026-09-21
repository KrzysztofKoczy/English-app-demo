import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { LearningApi } from '../core/learning-api';
import { RequestState } from '../core/request-state';
@Injectable({ providedIn: 'root' })
export class StartGameService {
  private readonly api = inject(LearningApi);
  private readonly nav = inject(NavController);
  private readonly router = inject(Router);
  readonly request = new RequestState();
  private pending: { topic: string; id: string } | null = null;
  start(topic: string) { return this.request.run(async () => {
    if (this.pending?.topic !== topic) this.pending = { topic, id: crypto.randomUUID() };
    const navigation = this.router.lastSuccessfulNavigation()?.id;
    const game = await this.api.start(topic, this.pending.id);
    // A response arriving after Back must not reopen the game.
    if (this.router.lastSuccessfulNavigation()?.id !== navigation || this.router.currentNavigation()) { this.pending = null; return; }
    await this.nav.navigateForward(['/game', game.id]); this.pending = null;
  }); }
}
