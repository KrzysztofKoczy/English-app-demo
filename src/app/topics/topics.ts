import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { LearningApi } from '../core/learning-api';
import { Topic } from '../core/models';
import { RequestState } from '../core/request-state';
import { StartGameService } from '../game/start-game.service';
import { Icon } from '../shared/icon';
import { RequestNotice } from '../shared/request-notice';
@Component({ imports: [IonContent, RouterLink, Icon, RequestNotice], templateUrl: './topics.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class Topics {
  private readonly api = inject(LearningApi);
  protected readonly games = inject(StartGameService);
  protected readonly request = new RequestState();
  protected readonly topics = signal<Topic[]>([]);
  protected readonly more = signal(false);
  private page = 0;
  ionViewWillEnter() { if (!this.topics().length) void this.load(); }
  protected load() { return this.request.run(async () => { const result = await this.api.topics(this.page); this.topics.update(items => [...items, ...result.items]); this.more.set(result.hasMore); this.page++; }); }
}
