import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'activities' },
  { path: 'activities', title: 'Aktywności — Little step', loadComponent: () => import('./activities/activities').then(m => m.Activities) },
  { path: 'idioms', title: 'Idiomy — Little step', loadComponent: () => import('./idioms/idioms').then(m => m.Idioms) },
  { path: 'word-games', loadChildren: () => import('./word-games/word-games.routes').then(m => m.routes) },
  { path: 'topics', title: 'Twój świat po angielsku', loadComponent: () => import('./topics/topics').then(m => m.Topics) },
  { path: 'battle', title: 'Battle of Words', loadComponent: () => import('./game/battle-modes').then(m => m.BattleModes) },
  { path: 'game/:id', title: 'Runda — Little step', loadComponent: () => import('./game/game').then(m => m.Game) },
  { path: 'cards', title: 'Fiszki — Little step', loadComponent: () => import('./cards/cards').then(m => m.Cards) },
  { path: 'character', title: 'Twoja postać — Little step', loadComponent: () => import('./character/character').then(m => m.Character) },
  { path: '**', title: 'Nie znaleziono strony', loadComponent: () => import('./shared/not-found').then(m => m.NotFound) }
];
