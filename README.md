# Little step — English App Demo

Interaktywna prezentacja aplikacji do nauki angielskiego. Angular 22 i Ionic 9, bez backendu i kont użytkowników.

## Zakres
- Podróże, Kuchnia i Sport: po 20 pytań; każda runda losuje 5 bez powtórzeń. Można odpowiedzieć na wszystkie pytania, także po błędach.
- 20 idiomów, 40 przykładów i 60 ćwiczeń. Domyślna sesja: 3 idiomy i 9 ćwiczeń. Dostępne także dłuższe sesje.
- Odpowiedzi idiomowe i tematyczne są tasowane raz na rundę z zachowaniem klucza odpowiedzi.
- Word Finder, Word Guess, Definition Guess: po 10 zestawów.
- Battle solo: po 5 losowych pytań z poziomów danych 1, 2 i 4 (łącznie 15) w trzech etapach i 3 życia. Koniec po ukończeniu próbki lub utracie żyć.
- 15 zwykłych fiszek oraz idiomy dodane do własnej talii.
- Postać: „Niedostępne w demo”. Brak wspólnego rozwoju postaci i globalnych XP.
- Etykieta demo otwiera opis zakresu oraz reset wyników z potwierdzeniem.

## Uruchomienie
Node.js 22.23.2, npm:

```sh
npm ci
npm start
```

Adres lokalny: http://localhost:4201/English-app-demo/

```sh
npm run test:idioms
npm run test:word-games
npm run test:audit
npm run validate:content
npm run build
```

Build: `dist/english-app/browser`. Konfiguracja zawiera podstawę `/English-app-demo/` i routing hash.

## GitHub Pages
Workflow `.github/workflows/pages.yml` uruchamia istniejące testy, walidację treści i produkcyjny build, a następnie publikuje artefakt.
W Settings → Pages → Build and deployment wybierz źródło **GitHub Actions**.
Docelowy adres: https://krzysztofkoczy.github.io/English-app-demo/

## Dane i zapis
- Paczka użytkownika: `src/assets/data/idioms/{idioms,exercises}.json` oraz `src/assets/demo/topics.json`.
- DemoContent waliduje dane; DemoLearningApi jest lokalną implementacją kontraktu LearningApi wstrzykiwaną w konfiguracji Angulara. Brak wywołań backendowego API w aktywnych ścieżkach demo.
- Tematy nie są hardcodowane w Javie; repo demo nie zawiera backendu. Aplikacja źródłowa nie została zmieniona.
- Zapis lokalny obejmuje postęp idiomów, fiszki idiomowe, wyniki gier słownych i rekord Battle. Wszystkie klucze mają prefiks `english-app-demo.`.
- Aktywne rundy kończą się po odświeżeniu; aplikacja umożliwia powrót do aktywności. Zwykłe fiszki działają w pamięci bieżącej wizyty.
- Reset usuwa wyłącznie klucze demo, nie dane innych aplikacji.
- Odpowiedzi są publicznymi danymi klienta. Wyniki nie stanowią zaufanego rankingu.
- `CONTENT-NOTES.txt`: źródła idiomów nie zostały zweryfikowane; poziomy i częstotliwość są robocze. Nie dodano fikcyjnych źródeł.

## Pochodzenie
Wersja demonstracyjna przygotowana na bazie istniejącego frontendu English App. Pełny katalog Battle pominięto; wybrano po 10 pytań z poprawnych plików poziomów 1, 2 i 4.
Istniejące testy dostosowano do większego zestawu danych i odrębnych kluczy pamięci; zachowano ich scenariusze.

Aplikacja jest projektowana przede wszystkim na małe ekrany telefonów. W widoku aktywnej gry wyświetlamy tylko informacje potrzebne do wykonania zadania. Każdy nowy nagłówek, opis, przycisk i odstęp należy ocenić pod kątem dostępnego miejsca oraz konieczności przewijania.
