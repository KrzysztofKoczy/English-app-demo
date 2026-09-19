import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class BattleRecord {
  private readonly key = 'english-app-demo.battle.highscore';
  private persisted = 0;
  readonly best = signal(0);
  readonly storageUnavailable = signal(false);
  constructor() { this.refresh(); }
  refresh() {
    try {
      const value = Number(localStorage.getItem(this.key));
      this.persisted = Number.isSafeInteger(value) && value > 0 ? value : 0;
      if (this.persisted > this.best()) this.best.set(this.persisted);
      this.storageUnavailable.set(false);
    } catch { this.storageUnavailable.set(true); }
  }
  reach(question: number) {
    this.refresh();
    if (!Number.isSafeInteger(question) || question < 1) return;
    this.best.set(Math.max(question, this.best()));
    if (this.best() <= this.persisted) return;
    try { localStorage.setItem(this.key, String(this.best())); this.persisted = this.best(); }
    catch { this.storageUnavailable.set(true); }
  }
}
