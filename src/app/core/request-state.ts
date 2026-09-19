import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
export function errorMessage(error: unknown) {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    const detail: unknown = error.error['detail'];
    if (typeof detail === 'string') return detail;
  }
  if (error instanceof Error && !(error instanceof HttpErrorResponse)) return error.message;
  return 'Nie udało się wczytać materiałów demo. Sprawdź połączenie i spróbuj ponownie.';
}
export class RequestState {
  private revision = 0;
  reset() { this.revision++; this.busy.set(false); this.error.set(''); }
  readonly busy = signal(false);
  readonly error = signal('');
  async run(work: () => Promise<void>) {
    if (this.busy()) return;
    const revision = this.revision;
    this.busy.set(true); this.error.set('');
    try { await work(); } catch (error) { if (revision === this.revision) this.error.set(errorMessage(error)); }
    finally { if (revision === this.revision) this.busy.set(false); }
  }
}
