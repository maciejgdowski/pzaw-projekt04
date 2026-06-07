//accounts management
import { Router } from "express";
import { getExistingUser } from "../index.js";
import { hash, verify } from "argon2";
import { db } from "../models/videogames.js";
import crypto from "node:crypto";

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
  const passwordMatch = await verify(user.user_password, password);
  if (!passwordMatch) {
    console.error("Incorrect password");
    return res.render("login", {
      title: "Login form",
      form: {},
      error: "Incorrect password",
    });
  }
  req.session.regenerate((err) => {
    if (err) {
      console.error("Session regenerate error:", err);
      return res.render("login", {
        title: "Login form",
        form: {},
        error: `Session regenerate error: ${err}`,
      });
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

  if (login.length < 4) {
    console.error("Login must have at least 4 letters");
    res.render("register", {
      title: "Register form",
      form: {},
      error: "Login must have at least 4 letters",
    });
  } else if (login.length > 24) {
    res.render("register", {
      title: "Register form",
      form: {},
      error: "Login cannot be longer than 24 chars",
    });
  } else if (req.body.password.length < 4) {
    console.error("Password must have at least 4 letters");
    res.render("register", {
      title: "Register form",
      form: {},
      error: "Password must have at least 4 letters",
    });
  } else {
    const hashedPassword = await hash(req.body.password);
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
  }
});

authRouter.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
    res.clearCookie("connect.sid");
    res.redirect("/games/");
  });
});
