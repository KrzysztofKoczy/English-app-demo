import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
@Component({ imports: [IonContent, RouterLink], template: '<ion-content><main class="page"><h1>Nie ma takiej strony.</h1><a class="button" routerLink="/activities">Wróć do aktywności</a></main></ion-content>', changeDetection: ChangeDetectionStrategy.OnPush })
export class NotFound {}
