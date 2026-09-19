import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly dark = signal(false);
  constructor() {
    let saved: string | null = null;
    try { saved = localStorage.getItem('english-app-demo.theme'); } catch { /* Storage may be unavailable. */ }
    this.set(saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches));
  }
  toggle() { this.set(!this.dark()); try { localStorage.setItem('english-app-demo.theme', this.dark() ? 'dark' : 'light'); } catch { /* Keep theme in memory. */ } }
  private set(dark: boolean) { this.dark.set(dark); this.document.documentElement.dataset['theme'] = dark ? 'dark' : 'light'; }
}
