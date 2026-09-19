import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import { AnswerResult, Card, GameView, Page, Profile, Topic } from './models';
@Injectable({ providedIn: 'root' })
export class LearningApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1';
  private request<T>(request: Observable<T>) { return firstValueFrom(request.pipe(timeout(15000))); }
  topics(page = 0) { return this.request(this.http.get<Page<Topic>>(`${this.base}/topics`, { params: { page, size: 12 } })); }
  cards(page = 0) { return this.request(this.http.get<Page<Card>>(`${this.base}/cards`, { params: { page, size: 12 } })); }
  profile() { return this.request(this.http.get<Profile>(`${this.base}/profile`)); }
  start(topic: string, requestId: string) { return this.request(this.http.post<GameView>(`${this.base}/games`, { topic, requestId })); }
  game(id: string) { return this.request(this.http.get<GameView>(`${this.base}/games/${encodeURIComponent(id)}`)); }
  answer(id: string, questionId: string, option: number) { return this.request(this.http.post<AnswerResult>(`${this.base}/games/${encodeURIComponent(id)}/answers`, { questionId, option })); }
  review(id: string, known: boolean) { return this.request(this.http.put<Profile>(`${this.base}/cards/${encodeURIComponent(id)}/review`, { known })); }
}
