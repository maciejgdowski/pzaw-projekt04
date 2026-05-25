import express from "express";
import morgan from "morgan";
import fs from "node:fs";
import * as bcrypt from "bcrypt";
import session from "express-session";
import {
  getGameTitles,
  getGameData,
  getAllGameImages,
  getGameGenres,
  getGamePlatforms,
  getAllGenres,
  getAllPlatforms,
  getGameDataID,
  db,
} from "./models/videogames.js";
import { randomBytes } from "node:crypto";
const port = 8000;

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(
  session({
    secret: randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false, // don't create empty sessions for unauthenticated users
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

const html = fs.readFileSync("public/index.html");
app.get("/", (req, res) => {
  res.end(html);
});
app.get("/games", (req, res) => {
  console.log("User session:", req.session.user);
  if (req.session.user) {
    res.render("games", {
      title: "List of Video Games",
      games: getGameTitles(getUserId(req.session.user.id).user_id, req.session.user.is_admin),
      images: getAllGameImages(getUserId(req.session.user.id).user_id, req.session.user.is_admin),
      user: req.session.user,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/games/:game_uuid", (req, res) => {
  const gameId = getGameId(req.params.game_uuid).game_id;
  if (!getGameTitles(req.session.user.id, req.session.user.is_admin).includes(gameId)) {
    res.status(404).end("Game not found");
  } else {
    res.render("game", {
      title: title,
      gameData: getGameData(title),
      genres: getGameGenres(title),
      platforms: getGamePlatforms(title),
    });
  }
});
app.get("/new", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/login");
  }
  res.render("newGame", {
    title: "Add New Game",
    genres: getAllGenres(),
    platforms: getAllPlatforms(),
    form: {},
  });
});
app.post("/new", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/login");
  }
  const { title, release_date, developer, description, link, logo } = req.body;

  const genres = getAllGenres();
  const platforms = getAllPlatforms();

  const keys = Object.keys(req.body);
  const newGenres = [];
  const newPlatforms = [];

  //znalezienie wszystkich zaznaczonych gatunkow i platform
  keys.forEach((key) => {
    if (genres.includes(key)) newGenres.push(key);
    if (platforms.includes(key)) newPlatforms.push(key);
  });

  //form error handling
  const errors = [];
  if (!title || title.trim() === "") errors.push("Title is required.");
  if (newGenres.length === 0)
    errors.push("At least one genre must be selected.");
  if (newPlatforms.length === 0)
    errors.push("At least one platform must be selected.");
  if (!release_date || release_date.trim() === "")
    errors.push("Release date is required.");
  if (!developer || developer.trim() === "")
    errors.push("Developer is required.");
  if (!description || description.trim() === "")
    errors.push("Description is required.");

  if (errors.length > 0) {
    return res.render("newGame", {
      title: "Add New Game",
      genres,
      platforms,
      errors,
      form: req.body,
    });
  }

  db.prepare(
    "INSERT INTO game_data (game_title, release_date, developer, description, link, image, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    title,
    release_date,
    developer,
    description,
    link || null,
    logo || null,
    getUserId(req.session.user.id)
  );

  //pobieranie id nowo dodanej gry
  const newGameId = db
    .prepare("SELECT game_id FROM game_data ORDER BY game_id DESC LIMIT 1")
    .get();
  const id = newGameId.game_id;

  newGenres.forEach((newGenre) => {
    //pobieranie id gatunku na podstawie nazwy
    const genreRow = db
      .prepare("SELECT genre_id FROM genres WHERE genre_name = ?")
      .get(newGenre);
    //dodawanie do relacji M-M nowo dodanej gry i wybranego gatunku
    db.prepare(
      "INSERT INTO games_genres (game_id, genre_id) VALUES (?, ?)"
    ).run(id, genreRow.genre_id);
  });

  //tak samo jak z gatunkami
  newPlatforms.forEach((newPlatform) => {
    const platformRow = db
      .prepare("SELECT platform_id FROM platforms WHERE platform_name = ?")
      .get(newPlatform);
    db.prepare(
      "INSERT INTO games_platforms (game_id, platform_id) VALUES (?, ?)"
    ).run(id, platformRow.platform_id);
  });

  res.redirect(`/games/`);
});

app.get("/delete/:game_id", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/login");
  }
  const gameId = req.params.game_id;

  //usuniecie powiazan M-M
  db.prepare("DELETE FROM games_genres WHERE game_id = ?").run(gameId);
  db.prepare("DELETE FROM games_platforms WHERE game_id = ?").run(gameId);
  //usuniecie gry
  db.prepare("DELETE FROM game_data WHERE game_id = ?").run(gameId);
  res.redirect(`/games/`);
});

app.get("/edit/:game_id", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/login");
  }
  const gameId = getGameId(req.params.game_id).game_id;
  const allGenres = getAllGenres();
  const allPlatforms = getAllPlatforms();

  const gameData = getGameDataID(gameId);

  const gameGenres = getGameGenres(gameData.game_title);
  const gamePlatforms = getGamePlatforms(gameData.game_title);

  const form = {
    title: gameData.game_title,
    release_date: gameData.release_date,
    developer: gameData.developer,
    description: gameData.description,
    link: gameData.link,
    logo: gameData.image,
  };

  // Set checked flags for genres and platforms
  allGenres.forEach((g) => (form[g] = gameGenres.includes(g)));
  allPlatforms.forEach((p) => (form[p] = gamePlatforms.includes(p)));

  res.render("editGame", {
    title: `Edit ${gameData.game_title}`,
    gameId: gameId,
    genres: allGenres,
    platforms: allPlatforms,
    form: form,
  });
});

app.post("/edit/:game_id", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/login");
  }
  const { title, release_date, developer, description, link, logo } = req.body;
  const id = getGameId(req.params.game_id).game_id;

  const genres = getAllGenres();
  const platforms = getAllPlatforms();

  const keys = Object.keys(req.body);
  const newGenres = [];
  const newPlatforms = [];

  //znalezienie wszystkich zaznaczonych gatunkow i platform
  keys.forEach((key) => {
    if (genres.includes(key)) newGenres.push(key);
    if (platforms.includes(key)) newPlatforms.push(key);
  });

  //form error handling
  const errors = [];
  if (!title || title.trim() === "") errors.push("Title is required.");
  if (newGenres.length === 0)
    errors.push("At least one genre must be selected.");
  if (newPlatforms.length === 0)
    errors.push("At least one platform must be selected.");
  if (!release_date || release_date.trim() === "")
    errors.push("Release date is required.");
  if (!developer || developer.trim() === "")
    errors.push("Developer is required.");
  if (!description || description.trim() === "")
    errors.push("Description is required.");

  if (errors.length > 0) {
    return res.render("newGame", {
      title: "Add New Game",
      genres,
      platforms,
      errors,
      form: req.body,
    });
  }

  db.prepare(
    "UPDATE game_data SET game_title = ?, release_date = ?, developer = ?, description = ?, link = ?, image = ? WHERE game_id = ?"
  ).run(
    title,
    release_date,
    developer,
    description,
    link || null,
    logo || null
  );

  db.prepare("DELETE FROM games_genres WHERE game_id = ?").run(id);
  newGenres.forEach((newGenre) => {
    const genreRow = db
      .prepare("SELECT genre_id FROM genres WHERE genre_name = ?")
      .get(newGenre);

    db.prepare(
      "INSERT INTO games_genres (game_id, genre_id) VALUES (?, ?)"
    ).run(id, genreRow.genre_id);
  });

  db.prepare("DELETE FROM games_platforms WHERE game_id = ?").run(id);
  newPlatforms.forEach((newPlatform) => {
    const platformRow = db
      .prepare("SELECT platform_id FROM platforms WHERE platform_name = ?")
      .get(newPlatform);
    db.prepare(
      "INSERT INTO games_platforms (game_id, platform_id) VALUES (?, ?)"
    ).run(id, platformRow.platform_id);
  });

  res.redirect(`/games/`);
});
app.get("/random", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/login");
  }
  const titles = getGameTitles(req.session.user.id, req.session.user.is_admin);
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  res.redirect(`/games/${randomTitle}`);
});

//accounts management

app.get("/login", (req, res) => {
  res.render("login", {
    title: "Login form",
    form: {},
  });
});

app.post("/login", async (req, res) => {
  const login = req.body.login;
  const password = req.body.password;
  const user = getExistingUser(login);
  if (!user) {
    console.error("User not found");
    return res.redirect(`/games/`);
  }
  const passwordMatch = await bcrypt.compare(password, user.user_password);
  if (!passwordMatch) {
    console.error("Incorrect password");
    return res.redirect(`/games/`);
  }
  req.session.regenerate((err) => {
    if (err) {
      console.error("Session regenerate error:", err);
      return res.redirect(`/games/`);
    }
    req.session.user = {
      login: user.user_login,
      id: user.user_uuid,
      is_admin: user.is_admin,
    };
    console.log("User logged in successfully");
    res.redirect(`/games/`);
  });
});

app.get("/register", (req, res) => {
  res.render("register", {
    title: "Register form",
    form: {},
  });
});

app.post("/register", async (req, res) => {
  const login = req.body.login;

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  //check if user with the same login already exists
  const existingUser = getExistingUser(login);
  if (existingUser) {
    console.error("User with this login already exists");
    res.redirect(`/games/`);
    return;
  }

  db.prepare("INSERT INTO users (user_uuid, user_login, user_password) VALUES (?, ?)").run(
    crypto.randomUUID(),
    login,
    hashedPassword
  );

  const newUser = getExistingUser(login);

  req.session.regenerate((err) => {
    if (err) {
      console.error("Session regenerate error:", err);
      return res.redirect(`/games/`);
    }

    req.session.user = {
      login: newUser.user_login,
      id: newUser.user_uuid,
    };
    console.log("User registered successfully");
    res.redirect(`/games/`);
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
    res.clearCookie("connect.sid"); //domyslna nazwa dla express-session
    res.redirect("/games/");
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

const getExistingUser = (login) => {
  return db.prepare("SELECT * FROM users WHERE user_login = ?").get(login);
};

const getUserId = (user_uuid) =>{
  return db.prepare("SELECT user_id FROM users WHERE user_uuid = ?").get(user_uuid);
};
const getGameId = (game_uuid) => {
  return db.prepare("SELECT game_id FROM game_data WHERE game_uuid = ?").get(game_uuid);
};