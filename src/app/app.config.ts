import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, RouteReuseStrategy, withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular';
import { routes } from './app.routes';
import { LearningApi } from './core/learning-api';
import { DemoLearningApi } from './core/demo-learning-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideIonicAngular({ mode: 'md' }),
    provideHttpClient(),
    { provide: LearningApi, useExisting: DemoLearningApi },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withComponentInputBinding(), withHashLocation())
  ]
};
