import type { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', title: 'Gry słowne — Little step', loadComponent: () => import('./word-games').then(m => m.WordGames) },
  { path: 'word-finder', title: 'Word Finder — Little step', loadComponent: () => import('./word-finder').then(m => m.WordFinder) },
  { path: 'word-guess', title: 'Word Guess — Little step', loadComponent: () => import('./word-guess').then(m => m.WordGuess) },
  { path: 'definition-guess', title: 'Definition Guess — Little step', loadComponent: () => import('./definition-guess').then(m => m.DefinitionGuess) },
];
