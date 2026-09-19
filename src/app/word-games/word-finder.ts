import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { FinderSession } from './word-game-sessions';
import { GameHeader } from './game-header';
import { RoundPicker } from './round-picker';
import { GameResult } from './game-result';
@Component({ imports: [IonContent, GameHeader, RoundPicker, GameResult], providers: [FinderSession], templateUrl: './word-finder.html', styleUrl: './word-games.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class WordFinder {
  protected readonly session = inject(FinderSession);
  protected readonly tapMode = signal(false);
  protected readonly cursor = signal<{ x: number; y: number } | null>(null);
  private pointer: number | null = null;
  private wheel: HTMLElement | null = null;
  protected readonly positions = computed(() => this.session.tiles().map((tile, i, tiles) => ({ ...tile,
    x: 50 + 36 * Math.cos((i / tiles.length) * Math.PI * 2 - Math.PI / 2),
    y: 50 + 36 * Math.sin((i / tiles.length) * Math.PI * 2 - Math.PI / 2),
  })));
  protected readonly line = computed(() => {
    const points = this.session.selected().map(id => this.positions().find(tile => tile.id === id)!).map(p => `${p.x},${p.y}`);
    const cursor = this.cursor(); if (cursor) points.push(`${cursor.x},${cursor.y}`);
    return points.join(' ');
  });
  ionViewWillEnter() { void this.session.load(); }
  ionViewWillLeave() { this.cancel(); }
  ngOnDestroy() { this.cancel(); }
  protected start(id: string) { this.cancel(); const round = this.session.content()?.finder.find(r => r.id === id); if (round) this.session.start(round); }
  protected mode() { this.cancel(); this.tapMode.update(v => !v); }
  protected down(event: PointerEvent) {
    if (this.tapMode() || this.session.result() || this.pointer !== null || !event.isPrimary || event.button !== 0) return;
    const wheel = event.currentTarget;
    if (!(wheel instanceof HTMLElement)) return;
    const id = this.hit(event, wheel); if (id === null) return;
    event.preventDefault(); this.session.clear(); this.pointer = event.pointerId; this.wheel = wheel;
    wheel.setPointerCapture(event.pointerId); this.session.select(id); this.move(event);
  }
  protected move(event: PointerEvent) {
    if (event.pointerId !== this.pointer || !this.wheel) return;
    const rect = this.wheel.getBoundingClientRect();
    this.cursor.set({ x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 });
    const id = this.hit(event, this.wheel); if (id !== null) this.session.select(id);
  }
  protected up(event: PointerEvent) {
    if (event.pointerId !== this.pointer) return;
    this.move(event); this.release(); this.session.submit();
  }
  protected cancelPointer(event: PointerEvent) { if (event.pointerId === this.pointer) this.cancel(); }
  protected cancel() { this.release(); this.session.clear(); }
  protected tileClick(id: number, event: MouseEvent) {
    // Keyboard activation (detail 0) also works without switching input mode.
    if (this.tapMode() || event.detail === 0) this.session.select(id);
  }
  @HostListener('document:visibilitychange') protected visibility() { if (document.hidden) this.cancel(); }
  @HostListener('window:blur') protected blur() { this.cancel(); }
  private release() {
    const pointer = this.pointer, wheel = this.wheel; this.pointer = null; this.wheel = null; this.cursor.set(null);
    if (pointer !== null && wheel?.hasPointerCapture(pointer)) wheel.releasePointerCapture(pointer);
  }
  private hit(event: PointerEvent, wheel: HTMLElement): number | null {
    for (const button of wheel.querySelectorAll<HTMLElement>('[data-tile]')) {
      const rect = button.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) return Number(button.dataset['tile']);
    }
    return null;
  }
}
