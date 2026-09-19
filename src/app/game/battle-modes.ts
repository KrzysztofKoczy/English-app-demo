import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { StartGameService } from './start-game.service';
import { BattleRecord } from './battle-record';
import { RequestNotice } from '../shared/request-notice';
@Component({ imports: [IonContent, RouterLink, RequestNotice], templateUrl: './battle-modes.html', styleUrl: './battle-modes.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class BattleModes {
  protected readonly games = inject(StartGameService);
  protected readonly record = inject(BattleRecord);
  ionViewWillEnter() { this.record.refresh(); }
}
