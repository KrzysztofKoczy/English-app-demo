import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
export type GameCardVariant = 'word-finder' | 'word-guess' | 'definition-guess';
@Component({ selector: 'app-game-card', imports: [RouterLink], templateUrl: './game-card.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class GameCard {
  readonly variant = input.required<GameCardVariant>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly detail = input.required<string>();
}
