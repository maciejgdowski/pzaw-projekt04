# INSTRUKCJE URUCHOMIENIA

1. W konsoli:

```bash
npm install
```

2. Pierwsze uruchomienie programu:

```bash
npm run dev:populate
```

3. Pozostałe uruchomienia:

```bash
npm run dev
```

4. Na potrzeby doświadczenia deweloperskiego zostały utworzone 3 konta z przykładowymi danymi:
   - konto administratorskie:
     - login: admin
     - hasło: admin
   - konto użytkownika:
     - login: user1
     - hasło: 1234
   - konto użytkownika:
     - login: user2
     - hasło: qwerty

# OPIS APLIKACJI

- Aplikacja jest programem do wyświetlania informacji o grach wideo.
- Użytkownicy mogą dodawać gry oraz informacje na ich temat:
   + Tytuł gry
   + Data wydania
   + Deweloper
   + Opis gry
   + Platformy, na których jest dostępna (PC, konsole, itp.)
   + Gatunki gry (FPS, RPG, itp.)
   + Link do strony internetowej gry
   + Adres URL obrazu (logo) gry
- Użytkownik ma dostęp tylko do listy gier dodanych przez siebie. Może również edytować i usuwać tylko swoje gry
- Administrator widzi wszystkie gry dodane przez użytkowników wraz z informacją o tym, przez kogo została dodana
- Aplikacja wykorzystuje relacje wiele-do-wielu przy niektórych połączeniach danych:
   + lista platform, na które gra została wydana
   + lista gatunków gry

# ŚCIEŻKI APLIKACJI
- GET `/` - strona startowa aplikacji
- GET `/games` - lista wszystkich gier (dodanych przez użytkownika) -> główna strona aplikacji
- GET `/games/random` - losuje jedną grę -> użytkownik zostaje przeniesiony do `/games/<uuid_losowej_gry>`
- GET `/games/<game_uuid>` - lista informacji na temat danej gry
- GET `/games/<game_uuid>/edit` - formularz edycji danych gry
- POST `/games/<game_uuid>/edit` - aktualizacja danych gry
- GET `/games/<game_uuid>/delete` - usunięcie gry wraz z jej danymi z bazy danych
- GET `/games/new` - formularz dodania gry
- POST `/games/new` - dodanie gry do bazy danych
- GET `/auth/login` - formularz logowania do aplikacji
- GET `/auth/register` - formularz rejstracji do aplikacji
- POST `/auth/login`
- POST `/auth/register`

#### ścieżki /games/<...> znajdują się w pliku `/routes/games.routes.js`
#### ścieżki /auth/<...> znajdują się w pliku `/routes/auth.routes.js`
#### pozostałe ścieżki znajdują się w pliku `index.js`


# CODE REVIEW

#### sposób czytania: {uwaga na temat programu} &rarr; {podjęte czynności odnośnie uwagi}

### REVIEWER 1: pan Daniel
- README zawiera tylko instrukcję uruchomienia, pamiętaj że to jest wizytówka projektu: warto dodać chociaż jedno zdanie opisujące projekt, a można dodatkowo udokumentować zaimplementowane funkcjonalności, obsługiwane ścieżki etc. &rarr; README zostało zaktualizowane o opis aplikacji oraz obsługiwane ścieżki

- O ile dodanie danych testowych przy pomocy flagi środowiskowej jest okej, o tyle polecam zrobić do tego osobne narzędzie &rarr; utworzyłem skrypt `dev:populate` w package.json aby zautomatyzować dodawanie danych

- Dorbny detal, ale dlaczego oglądanie gier pozwala je w ścieżce odnaleźć po nazwie, a ścieżka do edycji zawiera numeryczne id? &rarr; przepisałem większość ścieżek, aby w URL zawierały UUID gry, a nie jej tytuł/id

- Stworzenie dwóch gier o tej samej nazwie powoduje, że drugiej nie da się zobaczyć wchodząc na ścieżkę /games/:nazwa_gry &rarr; dzięki UUID ten błąd został naprawiony

- Nie działa edycja nazwy, opisu czy nazwy developera gry &rarr; naprawiłem wszystkie ścieżki

- Błąd implementacji autoryzacji: Można modyfikować i usuwać wpisy innych osób, wystarczy znać/zgadnąć numeryczne ID, co nie jest trudne &rarr; użytkownicy teraz nie są wstanie zobaczyć/modyfikować innych wpisów, gdyż z bazy danych zostają wyjęte tylko dane związane z 
użytkownikiem

- UX: Wizualnie jest spójnie i ładnie.

- bcrypt jest już przestarzały, przerzuć się na argon &rarr; wg. opinii osób na google argon jest nowocześniejszy i lepszy, ale bcrypt nie zawiera podatności na złośliwe oprogramowania, więc bibliotekę zostawiam

- w index.js jest wszystko ze wszystkim, wyciągnij powiązane funkcjonalności do osobnych plików &rarr; ścieżki zostały przeniesione odpowiednio do `/routes/auth.routes.js` oraz `/routes/games.routes.js`


### REVIEWER 2: Kacper

- README ładnie podzielone na części i czytelne.

- Instalacja przebiega bez problemu.

- Styl: 
  + Czytelny, UI trochę "rozstrzelone".
  + Przycisk 'Logout' jest niżej niż przycisk 'Back'. &rarr; naprawiłem UI, aby przyciski były na tej samej wysokości
  + Na wąskich ekranach góra na siebie nachodzi. &rarr; dodałem responsywność dla górnego paska

- Funkcjonalność i błędy: 
  + Aplikacja działa jak powinna.
  + Brak JAKIEJKOLWIEK walidacji danych przy rejestracji i logowaniu, można stworzyć konto nie wpisując nic w pola tekstowe. &rarr; wprowadziłem walidację loginu i hasła (min. 4 znaki)
  + Przy wpisaniu niepoprawnego hasła, brak komunikatu. &rarr; dodałem komunikat o błędzie hasła
  + Podobnie przy edytowaniu gier, po zostawieniu niektórych pól pustych wywala błąd, że gameId is not defined. &rarr; dodałem error handling dla formularza w EditGame
  + Przy dodawaniu gier program sprawdza już niepustość pól edycyjnych.
  + Gdy wpisałem długi ciąg znaków do opisu, UI rozszerza się poza ekran, brak zawijania linijek przy zbyt długim ciągu znaków. &rarr; dodałem walidatory długości z bazą danych oraz odpowienio dopasowałem styl css
  + Przy rejestracji da się wpisać zbyt wiele znaków, do tego stopnia że aplikacja się zawiesza a potem, gdy klikam register pokazuje     'PayloadTooLargeError: request entity too large' &rarr; teraz login użytkownika nie może być dłuższy niż 24 znaki
  + Gdy dam trochę krótszą nazwę, ale jednak dlugą na jakies 1000 znaków, panel górny się mocno rozjeżdża. &rarr; teraz nie można dodać nazwy dłuższej niż 50 znaków ze względu na limity bazy danych
  + Podobnie przy dodawaniu gry, efekt jest ten sam. &rarr; naprawiłem to poprzez dodanie walidacji pól z max długością z bazy danych
  + Przy edycji gry tak samo.
  + Trochę nie rozumiem czemu jako użytkownik nie jestem w stanie przeglądać cudzych gier, ale takie jest założenie strony więc się nie kłócę.

- Kod:
  + Czytelny, ładnie podzielony na parę plików.

---

styl css został wykonany przy pomocy biblioteki bootstrap oraz preprocesora scss.
