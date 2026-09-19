import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { WordGameProgress } from './word-game-models';
import { WordGameContentRepository } from './word-game-content';
@Component({ selector: 'app-word-game-result', imports: [RouterLink], templateUrl: './game-result.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class GameResult {
  readonly result = input.required<WordGameProgress>(); readonly again = output<void>(); readonly levels = output<void>();
  protected readonly content = inject(WordGameContentRepository);
}
