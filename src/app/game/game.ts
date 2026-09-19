import { ChangeDetectionStrategy, Component, inject, input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, NavController } from '@ionic/angular';
import { GameService } from './game.service';
import { Icon } from '../shared/icon';
import { RequestNotice } from '../shared/request-notice';

@Component({ imports: [IonContent, RouterLink, Icon, RequestNotice], providers: [GameService], templateUrl: './game.html', styleUrl: './game.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class Game implements OnChanges {
  readonly id = input.required<string>();
  protected readonly state = inject(GameService);
  private readonly nav = inject(NavController);
  ngOnChanges() { void this.state.load(this.id()); }
  protected reload() { void this.state.load(this.id()); }
  protected exit() { void this.nav.navigateRoot('/activities'); }
}
