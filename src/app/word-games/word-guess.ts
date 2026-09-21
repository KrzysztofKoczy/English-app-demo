import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { IonContent, IonModal } from '@ionic/angular';
import { GuessSession } from './word-game-sessions';
import { GameHeader } from './game-header';
import { RoundPicker } from './round-picker';
@Component({ imports: [IonContent, IonModal, GameHeader, RoundPicker], providers: [GuessSession], templateUrl: './word-guess.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class WordGuess {
  protected readonly session = inject(GuessSession);
  protected readonly keyboard = ['qwertyuiop'.split(''), 'asdfghjkl'.split(''), ['Enter', ...'zxcvbnm', 'Backspace']];
  protected readonly active = signal(false);
  ionViewWillEnter() { this.active.set(true); void this.session.load(); }
  ionViewWillLeave() { this.active.set(false); }
  protected start(id: string) { const round = this.session.content()?.guess.find(r => r.id === id); if (round) this.session.start(round); }
  protected resultClosed(role?: string) {
    const round = this.session.round();
    if (role === 'again' && round && this.active()) this.session.start(round);
    else { this.session.round.set(null); this.session.result.set(null); }
  }
  @HostListener('document:keydown', ['$event'])
  protected keydown(event: KeyboardEvent) {
    if (!this.active() || !this.session.round() || this.session.result() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    // Let Enter activate a focused button instead of submitting twice.
    if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return;
    if (/^[a-z]$/i.test(event.key) || ['Enter', 'Backspace'].includes(event.key)) { event.preventDefault(); this.session.key(event.key); }
  }
}
