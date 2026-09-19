import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { IonContent, IonModal } from '@ionic/angular';
import { Icon } from '../shared/icon';
import { IdiomsService } from './idioms.service';
import { IdiomExercise, SourceSupport } from './idiom-models';

@Component({
  imports: [IonContent, IonModal, RouterLink, Icon, FormField], providers: [IdiomsService],
  templateUrl: './idioms.html', styleUrl: './idioms.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Idioms {
  protected readonly state = inject(IdiomsService);
  protected readonly settings = signal({ count: '3', category: 'mix' });
  protected readonly settingsForm = form(this.settings);
  protected readonly available = computed(() => this.state.available(this.settings().category));
  protected readonly actualCount = computed(() => Math.min(Number(this.settings().count), this.available()));
  protected readonly sourcesOpen = signal(false);
  protected readonly exerciseLabels: Record<IdiomExercise['type'], string> = {
    'meaning-choice': 'Wybierz znaczenie', 'gap-fill': 'Uzupełnij zdanie', 'context-choice': 'Wybierz sytuację',
  };
  private readonly supportLabels: Record<SourceSupport, string> = {
    meaning: 'znaczenie', usage: 'użycie', level: 'poziom', frequency: 'częstotliwość', example: 'przykład',
  };
  ionViewWillEnter() { void this.state.load(); }
  ionViewDidLeave() { this.sourcesOpen.set(false); }
  protected start() { this.state.start(Number(this.settings().count), this.settings().category); }
  protected supports(values: SourceSupport[]) { return values.map(v => this.supportLabels[v]).join(', '); }
  protected safeUrl(value?: string | null): string | null {
    if (!value) return null;
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
}
