import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameCard } from './game-card';
import { IonContent } from '@ionic/angular';
@Component({ imports: [IonContent, RouterLink, GameCard], templateUrl: './word-games.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class WordGames {}
