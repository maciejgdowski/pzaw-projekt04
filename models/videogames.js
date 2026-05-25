import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const db_path = "./games.db";
export const db = new DatabaseSync(db_path);

if (process.env.POPULATE_DB) {
  console.log("Populating database...");
  const populateDB = fs.readFileSync("./create_database.sql", "utf-8");
  db.exec(populateDB);
  console.log("Database populated.");
}

export const getGameTitles = (user_id, is_admin = 0) => {
  let titles = [];
  const query = is_admin
    ? db.prepare("SELECT game_title FROM game_data").all()
    : db
        .prepare("SELECT game_title FROM game_data WHERE user_id=?")
        .all(user_id);
  query.forEach((title) => {
    titles.push(title.game_title);
  });
  return titles;
};
export const getGameData = (title) => {
  const data = db
    .prepare(`SELECT * FROM game_data WHERE game_title=?`)
    .get(title);
  return data;
};
export const getGamesData = () => {
  const data = db.prepare(`SELECT * FROM game_data`).all();
  return data;
};
export const getGameDataID = (id) => {
  const data = db.prepare(`SELECT * FROM game_data WHERE game_id=?`).get(id);
  return data;
};

export const getAllGameImages = (user_id, is_admin = 0) => {
  const images = [];
  const games = getGameTitles(user_id, is_admin);
  games.forEach((game) => {
    images.push({
      title: getGameData(game).game_title,
      path: getGameImage(game),
    });
  });
  return images;
};
export const getGameImage = (title) => {
  const image = db
    .prepare(`SELECT image from game_data WHERE game_title = ?`)
    .get(title).image;
  return image;
};

export const getGameGenres = (title) => {
  const genres = [];
  const gameId = db
    .prepare("SELECT game_id FROM game_data WHERE game_title = ?")
    .get(title);
  const genres_query = db
    .prepare("SELECT genre_id FROM games_genres WHERE game_id = ?")
    .all(gameId.game_id);
  genres_query.forEach((genre) => {
    genres.push(
      db
        .prepare(`SELECT genre_name FROM genres WHERE genre_id = ?`)
        .get(genre.genre_id).genre_name
    );
  });
  return genres;
};

export const getGamePlatforms = (title) => {
  const platforms = [];
  const gameId = db
    .prepare("SELECT game_id FROM game_data WHERE game_title = ?")
    .get(title);
  const platforms_query = db
    .prepare("SELECT platform_id FROM games_platforms WHERE game_id = ?")
    .all(gameId.game_id);
  platforms_query.forEach((platform) => {
    const name = db
      .prepare(`SELECT platform_name FROM platforms WHERE platform_id = ?`)
      .get(platform.platform_id);
    platforms.push(name.platform_name);
  });
  return platforms;
};

export const getAllGenres = () => {
  const genres = [];
  const query = db.prepare("SELECT genre_name FROM genres").all();
  query.forEach((genre) => {
    genres.push(genre.genre_name);
  });
  return genres;
};

export const getAllPlatforms = () => {
  const platforms = [];
  const query = db.prepare("SELECT platform_name FROM platforms").all();
  query.forEach((platform) => {
    platforms.push(platform.platform_name);
  });
  return platforms;
};
