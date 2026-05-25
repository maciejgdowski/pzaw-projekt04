# INSTRUKCJE URUCHOMIENIA

1. W konsoli:

   - npm install

2. Przed pierwszym uruchomieniem programu w katalogu głównym należy skopoiować dane pliku `.env.example` do pliku `.env`:

   LINUX

   ```sh
   cat .env.example > .env
   ```

   WINDOWS

   ```cmd
   copy .env.example .env
   ```

   Lub po prostu utworzyć plik `.env` i skopiować dane manualnie

3. W konsoli:

   - node index.js

4. Po pierwszym uruchomieniu aplikacji plik `.env` należy usunąć

5. Na potrzeby doświadczenia deweloperskiego zostały utworzone 3 konta:
   - konto administratorskie:
     - login: admin
     - hasło: admin
   - konto użytkownika:
     - login: user1
     - hasło: 1234
   - konto użytkownika:
     - login: user2
     - hasło: qwerty

---

styl css został wykonany przy pomocy biblioteki bootstrap oraz preprocesora scss.
