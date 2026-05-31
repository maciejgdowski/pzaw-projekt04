import { Router } from "express";
import {
  getGameData,
  getGamesData,
  getAllGenres,
  getAllPlatforms,
  checkIfGameExists,
  getGameGenres,
  getGamePlatforms,
  db,
  getGamesUUIDs,
  checkIsAdmin,
} from "../models/videogames.js";
import { getExistingUser, getGameId, getUserData, getUserId } from "../index.js";

export const gamesRouter = Router();

gamesRouter.get("/", (req, res) => {
  if (req.session.user) {
    const allGameData = getGamesData(req.session.user.id);

    res.render("games", {
      title: "List of Video Games",
      games: allGameData,
      user: req.session.user,
    });
  } else {
    res.redirect("/auth/login");
  }
});

gamesRouter.get("/random", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/auth/login");
  }
  const UUIDs = getGamesUUIDs(req.session.user.id);
  const randomUUID = UUIDs[Math.floor(Math.random() * UUIDs.length)];
  res.redirect(`/games/${randomUUID}`);
});

gamesRouter.get("/new", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/auth/login");
  }
  res.render("newGame", {
    title: "Add New Game",
    genres: getAllGenres(),
    platforms: getAllPlatforms(),
    errors: null,
    form: {},
  });
});

gamesRouter.post("/new", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/auth/login");
  }
  const { title, release_date, developer, description, link, logo } = req.body;

  const DBErrors = validateDataWithDB(title, developer, description, link, logo);

  const genres = getAllGenres();
  const platforms = getAllPlatforms();

  if (DBErrors) {
    return res.render("newGame", {
      title: "Add New Game",
      genres: genres,
      platforms: platforms,
      errors: Array(DBErrors),
      form: req.body,
    });
  }

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
  if (newGenres.length === 0) errors.push("At least one genre must be selected.");
  if (newPlatforms.length === 0) errors.push("At least one platform must be selected.");
  if (!release_date || release_date.trim() === "") errors.push("Release date is required.");
  if (!developer || developer.trim() === "") errors.push("Developer is required.");
  if (!description || description.trim() === "") errors.push("Description is required.");

  if (errors.length > 0) {
    return res.render("newGame", {
      title: "Add New Game",
      genres: genres,
      platforms: platforms,
      errors: errors,
      form: req.body,
    });
  }

  db.prepare(
    "INSERT INTO game_data (game_uuid, game_title, release_date, developer, description, link, image, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    crypto.randomUUID(),
    title,
    release_date,
    developer,
    description,
    link || null,
    logo || null,
    getUserId(req.session.user.id).user_id,
  );

  //pobieranie id nowo dodanej gry
  const newGameId = db.prepare("SELECT game_id FROM game_data ORDER BY game_id DESC LIMIT 1").get();
  const id = newGameId.game_id;

  newGenres.forEach((newGenre) => {
    //pobieranie id gatunku na podstawie nazwy
    const genreRow = db.prepare("SELECT genre_id FROM genres WHERE genre_name = ?").get(newGenre);
    //dodawanie do relacji M-M nowo dodanej gry i wybranego gatunku
    db.prepare("INSERT INTO games_genres (game_id, genre_id) VALUES (?, ?)").run(id, genreRow.genre_id);
  });

  //tak samo jak z gatunkami
  newPlatforms.forEach((newPlatform) => {
    const platformRow = db.prepare("SELECT platform_id FROM platforms WHERE platform_name = ?").get(newPlatform);
    db.prepare("INSERT INTO games_platforms (game_id, platform_id) VALUES (?, ?)").run(
      id,
      platformRow.platform_id,
    );
  });

  res.redirect(`/games/`);
});

gamesRouter.get("/:game_uuid/delete", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/auth/login");
  }
  const gameUUID = req.params.game_uuid;
  if (!checkIfGameExists(gameUUID, req.session.user.id)) {
    console.error("Game does not exist");
    return res.redirect("/games");
  }
  const gameId = getGameId(gameUUID).game_id;

  //usuniecie powiazan M-M
  db.prepare("DELETE FROM games_genres WHERE game_id = ?").run(gameId);
  db.prepare("DELETE FROM games_platforms WHERE game_id = ?").run(gameId);
  //usuniecie gry
  db.prepare("DELETE FROM game_data WHERE game_id = ?").run(gameId);
  res.redirect(`/games/`);
});

gamesRouter.get("/:game_uuid/edit", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/auth/login");
  }
  const gameUUID = req.params.game_uuid;
  if (!checkIfGameExists(gameUUID, req.session.user.id)) {
    console.error("Game does not exist");
    return res.redirect("/games");
  }
  const allGenres = getAllGenres();
  const allPlatforms = getAllPlatforms();

  const gameData = getGameData(gameUUID, req.session.user.id);

  const gameGenres = getGameGenres(gameUUID);
  const gamePlatforms = getGamePlatforms(gameUUID);

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
    gameId: gameUUID,
    genres: allGenres,
    platforms: allPlatforms,
    errors: null,
    form: form,
  });
});

gamesRouter.post("/:game_uuid/edit", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/auth/login");
  }
  const gameUUID = req.params.game_uuid;
  const id = getGameId(gameUUID).game_id;
  if (!checkIfGameExists(gameUUID, req.session.user.id)) {
    console.error("Game does not exist");
    return res.redirect("/games");
  }
  const { title, release_date, developer, description, link, logo } = req.body;

  const genres = getAllGenres();
  const platforms = getAllPlatforms();

  const DBErrors = validateDataWithDB(title, developer, description, link, logo);

  if (DBErrors) {
    return res.render("editGame", {
      title: "Add New Game",
      gameId: gameUUID,
      genres: genres,
      platforms: platforms,
      errors: Array(DBErrors),
      form: req.body,
    });
  }

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
  if (newGenres.length === 0) errors.push("At least one genre must be selected.");
  if (newPlatforms.length === 0) errors.push("At least one platform must be selected.");
  if (!release_date || release_date.trim() === "") errors.push("Release date is required.");
  if (!developer || developer.trim() === "") errors.push("Developer is required.");
  if (!description || description.trim() === "") errors.push("Description is required.");

  if (errors.length > 0) {
    return res.render("editGame", {
      title: "Add New Game",
      gameId: gameUUID,
      genres: genres,
      platforms: platforms,
      errors: errors,
      form: req.body,
    });
  }

  db.prepare(
    "UPDATE game_data SET game_title = ?, release_date = ?, developer = ?, description = ?, link = ?, image = ? WHERE game_uuid = ?",
  ).run(title, release_date, developer, description, link || null, logo || null, gameUUID);

  db.prepare("DELETE FROM games_genres WHERE game_id = ?").run(id);
  newGenres.forEach((newGenre) => {
    const genreRow = db.prepare("SELECT genre_id FROM genres WHERE genre_name = ?").get(newGenre);

    db.prepare("INSERT INTO games_genres (game_id, genre_id) VALUES (?, ?)").run(id, genreRow.genre_id);
  });

  db.prepare("DELETE FROM games_platforms WHERE game_id = ?").run(id);
  newPlatforms.forEach((newPlatform) => {
    const platformRow = db.prepare("SELECT platform_id FROM platforms WHERE platform_name = ?").get(newPlatform);
    db.prepare("INSERT INTO games_platforms (game_id, platform_id) VALUES (?, ?)").run(
      id,
      platformRow.platform_id,
    );
  });

  res.redirect(`/games/`);
});

gamesRouter.get("/:game_uuid", (req, res) => {
  if (!req.session.user) {
    console.error("user is not logged in");
    return res.redirect("/auth/login");
  }
  const game_uuid = req.params.game_uuid;
  if (!checkIfGameExists(game_uuid, req.session.user.id)) {
    res.status(404).end("Game not found");
  } else {
    const gameData = getGameData(game_uuid, req.session.user.id);
    const isAdmin = checkIsAdmin(req.session.user.id);
    if (isAdmin) {
      res.render("game", {
        title: gameData.game_title,
        gameData: gameData,
        genres: getGameGenres(game_uuid),
        platforms: getGamePlatforms(game_uuid),
        createdBy: getUserData(gameData.user_id).user_login,
      });
    } else {
      res.render("game", {
        title: gameData.game_title,
        gameData: gameData,
        genres: getGameGenres(game_uuid),
        platforms: getGamePlatforms(game_uuid),
        createdBy: null,
      });
    }
  }
});

const validateDataWithDB = (game_title, developer, description, link, image) => {
  if (game_title.length > 50) return "Game title must be max 50 chars";
  if (developer.length > 50) return "Developer name must be max 50 chars";
  if (description.length > 2000) return "Description must be max 2000 chars";
  if (link.length > 512) return "Link must be max 512 chars";
  if (image.length > 512) return "Image must be max 512 chars";
  return null;
};
