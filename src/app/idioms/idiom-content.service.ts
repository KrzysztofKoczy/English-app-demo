import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { IdiomContent } from './idiom-models';
import { CategoryFile, ExerciseFile, IdiomFile, validateIdiomContent } from './idiom-validation';

@Injectable({ providedIn: 'root' })
export class IdiomContentService {
  private readonly http = inject(HttpClient);
  private cached?: Promise<IdiomContent>;
  load(): Promise<IdiomContent> {
    return this.cached ??= this.read().catch(error => { this.cached = undefined; throw error; });
  }
  private async read(): Promise<IdiomContent> {
    const base = 'assets/data/idioms';
    const [content, categories, exercises] = await Promise.all([
      firstValueFrom(this.http.get<IdiomFile>(`${base}/idioms.json`).pipe(timeout(15000))),
      firstValueFrom(this.http.get<CategoryFile>(`${base}/categories.json`).pipe(timeout(15000))),
      firstValueFrom(this.http.get<ExerciseFile>(`${base}/exercises.json`).pipe(timeout(15000))),
    ]);
    validateIdiomContent(content, categories, exercises);
    return { idioms: content.idioms, categories: categories.categories, exercises: exercises.exercises, note: content.note };
  }
}
