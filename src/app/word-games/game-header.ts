import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RequestNotice } from '../shared/request-notice';
import { WordGameContentRepository } from './word-game-content';
import { WordGameProgressService } from './word-game-progress';
@Component({ selector: 'app-word-game-header', imports: [RouterLink, RequestNotice], templateUrl: './game-header.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class GameHeader {
  readonly active = input(false);
  readonly title = input.required<string>(); readonly retry = output<void>();
  protected readonly content = inject(WordGameContentRepository); protected readonly progress = inject(WordGameProgressService);
}
