import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { GuessSession } from './word-game-sessions';
import { GameHeader } from './game-header';
import { RoundPicker } from './round-picker';
import { GameResult } from './game-result';
@Component({ imports: [IonContent, GameHeader, RoundPicker, GameResult], providers: [GuessSession], templateUrl: './word-guess.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class WordGuess {
  protected readonly session = inject(GuessSession);
  protected readonly keyboard = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  private active = false;
  ionViewWillEnter() { this.active = true; void this.session.load(); }
  ionViewWillLeave() { this.active = false; }
  protected start(id: string) { const round = this.session.content()?.guess.find(r => r.id === id); if (round) this.session.start(round); }
  @HostListener('document:keydown', ['$event'])
  protected keydown(event: KeyboardEvent) {
    if (!this.active || !this.session.round() || this.session.result() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    // Let Enter activate a focused button instead of submitting twice.
    if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return;
    if (/^[a-z]$/i.test(event.key) || ['Enter', 'Backspace'].includes(event.key)) { event.preventDefault(); this.session.key(event.key); }
  }
}
