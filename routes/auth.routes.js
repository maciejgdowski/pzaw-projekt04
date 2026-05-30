//accounts management
import { Router } from "express";
import { getExistingUser } from "../index.js";
import * as bcrypt from "bcrypt";
import { db } from "../models/videogames.js";

export const authRouter = Router();

authRouter.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/games/");
  } else {
    res.render("login", {
      title: "Login form",
      form: {},
      error: null,
    });
  }
});

authRouter.post("/login", async (req, res) => {
  const login = req.body.login;
  const password = req.body.password;
  const user = getExistingUser(login);
  if (!user) {
    console.error("User not found");
    return res.render("login", {
      title: "Login form",
      form: {},
      error: "User not found",
    });
  }
  const passwordMatch = await bcrypt.compare(password, user.user_password);
  if (!passwordMatch) {
    console.error("Incorrect password");
    return res.redirect("/auth/login");
  }
  req.session.regenerate((err) => {
    if (err) {
      console.error("Session regenerate error:", err);
      return res.redirect("/auth/login");
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

authRouter.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/games/");
  } else {
    res.render("register", {
      title: "Register form",
      form: {},
      error: null,
    });
  }
});

authRouter.post("/register", async (req, res) => {
  const login = req.body.login;

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  //check if user with the same login already exists
  const existingUser = getExistingUser(login);
  if (existingUser) {
    console.error("User with this login already exists");
    res.render("register", {
      title: "Register form",
      form: {},
      error: "User with this login already exists",
    });
  } else {
    db.prepare("INSERT INTO users (user_uuid, user_login, user_password) VALUES (?, ?, ?)").run(
      crypto.randomUUID(),
      login,
      hashedPassword,
    );

    const newUser = getExistingUser(login);

    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        res.render("register", {
          title: "Register form",
          form: {},
          error: `Session regenerate error: ${err}`,
        });
      }

      req.session.user = {
        login: newUser.user_login,
        id: newUser.user_uuid,
      };
      console.log("User registered successfully");
      res.redirect(`/games/`);
    });
  }
});

authRouter.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
    res.clearCookie("connect.sid"); //domyslna nazwa dla express-session
    res.redirect("/games/");
  });
});
