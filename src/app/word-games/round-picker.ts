import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { Round, WordGame } from './word-game-models';
import { WordGameProgressService } from './word-game-progress';
@Component({ selector: 'app-round-picker', templateUrl: './round-picker.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class RoundPicker {
  readonly rounds = input.required<readonly Round[]>(); readonly game = input.required<WordGame>(); readonly choose = output<string>();
  protected readonly progress = inject(WordGameProgressService);
  protected completed(id: string) { return this.progress.value().results[`${this.game()}:${id}`]?.completed ?? false; }
}
