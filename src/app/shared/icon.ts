import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { gridOutline, shieldOutline, layersOutline, moonOutline, sunnyOutline, arrowForwardOutline, airplaneOutline, restaurantOutline, fitnessOutline, compassOutline, flashOutline, heartOutline, closeOutline, personOutline, trophyOutline, arrowBackOutline, checkmarkOutline } from 'ionicons/icons';
addIcons({ gridOutline, shieldOutline, layersOutline, moonOutline, sunnyOutline, arrowForwardOutline, airplaneOutline, restaurantOutline, fitnessOutline, compassOutline, flashOutline, heartOutline, closeOutline, personOutline, trophyOutline, arrowBackOutline, checkmarkOutline });
@Component({ selector: 'app-icon', imports: [IonIcon], template: '<ion-icon [name]="name()" aria-hidden="true" />', styles: ':host { display: inline-flex; } ion-icon { width: 22px; height: 22px; }', changeDetection: ChangeDetectionStrategy.OnPush })
export class Icon { readonly name = input.required<string>(); }
