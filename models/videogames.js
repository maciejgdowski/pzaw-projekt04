import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import dotenv from "dotenv";
import { getUserId } from "../index.js";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import * as bcrypt from "bcrypt";

dotenv.config();

const db_path = "./games.db";
export const db = new DatabaseSync(db_path);

if (process.env.POPULATE_DB) {
  console.log("Populating database...");
  const populateDB = fs.readFileSync("./create_database.sql", "utf-8");
  db.exec(populateDB);
  console.log("Database populated.");
}
if (process.env.GENERATE_ADMIN) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const UUID = crypto.randomUUID();
  const login = await rl.question("Enter admin login: ");
  const p = await rl.question("Enter admin password: ");

  const password = bcrypt.hashSync(p, 10);
  db.prepare(
    `INSERT INTO users (user_id, user_uuid, user_login, user_password, is_admin) VALUES (?, ?, ?, ?, ?)`,
  ).run(null, UUID, login, password, 1);

  console.log("created an admin account: ", { login: login, password: p });
}

export const checkIsAdmin = (user_uuid) => {
  const data = db.prepare("SELECT is_admin FROM users WHERE user_uuid=?").get(user_uuid);

  if (data === undefined) {
    console.error("user does not exist");
    return;
  }
  return data.is_admin == true ? true : false;
};

export const getGamesData = (user_uuid) => {
  const isAdmin = checkIsAdmin(user_uuid);
  const userId = getUserId(user_uuid).user_id;
  const data = isAdmin
    ? db.prepare(`SELECT * FROM game_data`).all()
    : db.prepare(`SELECT * FROM game_data WHERE user_id=?`).all(userId);
  return data;
};

export const getGamesUUIDs = (user_uuid) => {
  const games = getGamesData(user_uuid);

  const UUIDs = [];
  games.forEach((game) => {
    UUIDs.push(game.game_uuid);
  });
  return UUIDs;
};

export const getGameData = (game_uuid, user_uuid) => {
  const isAdmin = checkIsAdmin(user_uuid);
  const userId = getUserId(user_uuid).user_id;
  const data = isAdmin
    ? db.prepare(`SELECT * FROM game_data WHERE game_uuid = ?`).get(game_uuid)
    : db.prepare(`SELECT * FROM game_data WHERE game_uuid = ? AND user_id=?`).get(game_uuid, userId);

  if (data === undefined) {
    console.error("user does not exist");
    return null;
  }
  return data;
};

export const checkIfGameExists = (game_uuid, user_uuid) => {
  const res = getGameData(game_uuid, user_uuid);
  return res == undefined ? false : true;
};

export const getGameGenres = (game_uuid) => {
  const genres = [];
  const gameId = db.prepare("SELECT game_id FROM game_data WHERE game_uuid = ?").get(game_uuid);
  const genres_query = db.prepare("SELECT genre_id FROM games_genres WHERE game_id = ?").all(gameId.game_id);
  genres_query.forEach((genre) => {
    genres.push(db.prepare(`SELECT genre_name FROM genres WHERE genre_id = ?`).get(genre.genre_id).genre_name);
  });
  return genres;
};

export const getGamePlatforms = (game_uuid) => {
  const platforms = [];
  const gameId = db.prepare("SELECT game_id FROM game_data WHERE game_uuid = ?").get(game_uuid);
  const platforms_query = db
    .prepare("SELECT platform_id FROM games_platforms WHERE game_id = ?")
    .all(gameId.game_id);
  platforms_query.forEach((platform) => {
    const name = db.prepare(`SELECT platform_name FROM platforms WHERE platform_id = ?`).get(platform.platform_id);
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
