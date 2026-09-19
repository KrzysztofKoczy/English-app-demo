import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { DefinitionSession } from './word-game-sessions';
import { GameHeader } from './game-header';
import { RoundPicker } from './round-picker';
import { GameResult } from './game-result';
@Component({ imports: [IonContent, GameHeader, RoundPicker, GameResult], providers: [DefinitionSession], templateUrl: './definition-guess.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class DefinitionGuess {
  protected readonly session = inject(DefinitionSession);
  ionViewWillEnter() { void this.session.load(); }
  protected start(id: string) { const round = this.session.content()?.definitions.find(r => r.id === id); if (round) this.session.start(round); }
}
