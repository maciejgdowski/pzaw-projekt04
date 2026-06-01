import express from "express";
import morgan from "morgan";
import fs from "node:fs";
import * as bcrypt from "bcrypt";
import session from "express-session";
import { db } from "./models/videogames.js";
import { randomBytes } from "node:crypto";
import { gamesRouter } from "./routes/games.routes.js";
import { authRouter } from "./routes/auth.routes.js";
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
  }),
);

app.use("/games", gamesRouter);
app.use("/auth", authRouter);

const html = fs.readFileSync("public/index.html");
app.get("/", (req, res) => {
  res.end(html);
});

//other routes handling
app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export const getExistingUser = (login) => {
  return db.prepare("SELECT * FROM users WHERE user_login = ?").get(login);
};
export const getUserData = (user_id) => {
  return db.prepare("SELECT * FROM users WHERE user_id = ?").get(user_id);
}


export const getUserId = (user_uuid) => {
  return db.prepare("SELECT user_id FROM users WHERE user_uuid = ?").get(user_uuid);
};
export const getGameId = (game_uuid) => {
  return db.prepare("SELECT game_id FROM game_data WHERE game_uuid = ?").get(game_uuid);
};
