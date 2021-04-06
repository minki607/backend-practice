const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
var GitHubStrategy = require("passport-github").Strategy;
const User = require("./model/user");

dotenv.config();

mongoose.connect(
  `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.p0izc.mongodb.net/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority`,
  { useNewURLParser: true, useUnifiedTopology: true },
  () => {
    console.log("Connected to DB");
  }
);

const app = express();

// 미들웨어
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  return done(null, user._id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, doc) => {
    return done(null, doc);
  });
});

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_SECRET_ID,
      callbackURL: "/auth/github/callback",
    },
    function (_, _, profile, cb) {
      console.log(profile);
      // 데이터베이스에서 검색해서 없으면 새로운 User 생성
      User.findOne({ githubId: profile.id }, async (err, doc) => {
        if (err) return cb(err, null);
        if (!doc) {
          const newUser = new User({
            githubId: profile.id,
            username: profile.username,
          });
          await newUser.save();
          cb(null, newUser);
        }
        cb(null, doc);
      });
    }
  )
);

app.get("/auth/github", passport.authenticate("github"));

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("http://localhost:3000");
  }
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/getuser", (req, res) => {
  res.send(req.user);
});

app.get("/auth/logout", (req, res) => {
  if (req.user) {
    req.logout();
    res.send("done");
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Server Started");
});
