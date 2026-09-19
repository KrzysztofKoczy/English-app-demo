import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';

export interface ApiStatus {
  status: string;
  application: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getStatus() {
    return this.http.get<ApiStatus>('/api/status').pipe(timeout(8000));
  }
}
