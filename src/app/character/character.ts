import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Icon } from '../shared/icon';
@Component({ imports: [IonContent, RouterLink, Icon], templateUrl: './character.html', styleUrl: './character.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class Character {}
