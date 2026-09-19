import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { assessIdiom, newProgress, recordAnswer, saveIdiomCard } from './idiom-learning';
import { IdiomProgressMap, UserIdiomProgress } from './idiom-models';
import { IdiomProgressRepository, LocalIdiomProgressRepository } from './idiom-storage';

export const IDIOM_PROGRESS_REPOSITORY = new InjectionToken<IdiomProgressRepository>('Idiom progress repository', {
  providedIn: 'root', factory: () => new LocalIdiomProgressRepository(() => localStorage),
});

@Injectable({ providedIn: 'root' })
export class IdiomProgressService {
  private readonly repository = inject(IDIOM_PROGRESS_REPOSITORY);
  private readonly data = signal<IdiomProgressMap>({});
  readonly progress = this.data.asReadonly();
  readonly storageWarning = signal('');
  constructor() {
    try { this.data.set(this.repository.load()); }
    catch { this.storageWarning.set('Nie udało się odczytać postępu idiomów. Chronimy poprzedni zapis przed nadpisaniem; nowe wyniki pozostają w pamięci.'); }
  }
  assess(id: string, known: boolean) { this.update(id, p => assessIdiom(p, known, new Date().toISOString())); }
  answer(id: string, correct: boolean) { this.update(id, p => recordAnswer(p, correct, new Date().toISOString())); }
  saveCard(id: string) { this.update(id, saveIdiomCard); }
  private update(id: string, change: (p: UserIdiomProgress) => UserIdiomProgress) {
    const updated = { ...this.data(), [id]: change(this.data()[id] ?? newProgress(id)) };
    this.data.set(updated);
    try { this.repository.save(updated); this.storageWarning.set(''); }
    catch { this.storageWarning.set('Nie udało się zapisać postępu idiomów. Wyniki i zapisane fiszki pozostaną tylko do zamknięcia lub odświeżenia aplikacji.'); }
  }
}
