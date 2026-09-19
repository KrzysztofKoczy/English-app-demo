import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { CardsService } from './cards.service';
import { Icon } from '../shared/icon';
import { RequestNotice } from '../shared/request-notice';
@Component({ imports: [IonContent, RouterLink, Icon, RequestNotice], providers: [CardsService], templateUrl: './cards.html', styleUrl: './cards.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class Cards {
  readonly deck = input<string>();
  protected readonly state = inject(CardsService);
  ionViewWillEnter() { if (this.deck() === 'idioms') void this.state.selectDeck('idioms'); else void this.state.enter(); }
}
