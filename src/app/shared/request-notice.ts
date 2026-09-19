import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({ selector: 'app-request-notice', template: '@if (busy()) { <p role="status" class="muted">Ładowanie…</p> } @if (error()) { <p role="alert" class="error-message">{{ error() }}</p> }', changeDetection: ChangeDetectionStrategy.OnPush })
export class RequestNotice { readonly busy = input(false); readonly error = input(''); }
