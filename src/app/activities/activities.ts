import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Icon } from '../shared/icon';
import { RequestNotice } from '../shared/request-notice';
import { StartGameService } from '../game/start-game.service';
@Component({ imports: [IonContent, Icon, RouterLink, RequestNotice], templateUrl: './activities.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class Activities { protected readonly games = inject(StartGameService); }
