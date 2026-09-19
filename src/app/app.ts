import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { IonApp, IonContent, IonModal, IonRouterOutlet, NavController } from '@ionic/angular';
import { ThemeService } from './core/theme.service';
import { Icon } from './shared/icon';
@Component({ selector: 'app-root', imports: [IonApp, IonContent, IonModal, IonRouterOutlet, RouterLink, Icon], templateUrl: './app.html', styleUrl: './app.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class App {
  protected readonly demoOpen = signal(false);
  protected readonly resetConfirm = signal(false);
  protected readonly resetError = signal('');
  protected resetDemo() {
    try {
      const keys = ['english-app-demo.idioms.progress.v1', 'english-app-demo.word-games.v1', 'english-app-demo.battle.highscore', 'english-app-demo.theme'];
      for (const key of keys) localStorage.removeItem(key);
      location.hash = '/activities';
      location.reload();
    } catch { this.resetError.set('Nie udało się usunąć zapisów. Sprawdź ustawienia pamięci przeglądarki i spróbuj ponownie.'); }
  }
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);
  protected readonly url = toSignal(this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(e => e.urlAfterRedirects)), { initialValue: this.router.url });
  protected readonly playing = computed(() => this.url().startsWith('/game/') || this.url().startsWith('/word-games/'));
  protected open(path: string) { void this.nav.navigateRoot(path); }
}
