const express = require("express");
const session = require("express-session");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

app.use(
  session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890", // random string, used for configuring the session
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.urlencoded({ extended: true }));

const HTTP_PORT = process.env.PORT || 8080;

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",

    helpers: {
      json: (context) => {
        return JSON.stringify(context);
      },
    },
  })
);
app.set("view engine", ".hbs");

app.use(express.static("assets"));

// import a mongodb driver (mongoose)
mongoose.connect(
  "mongodb+srv://mabuhannood:22446688@cluster0.clc893a.mongodb.net/fitness"
);
const Schema = mongoose.Schema;
const classesSchema = new Schema({
  id: Number,
  class_name: String,
  class_instructor: String,
  class_duration: Number,
  img: String,
});

const usersSchema = new Schema({
  id: Number,
  name: String,
  password: String,
  email: String,
  isAdmin: Boolean,
  isMember: Boolean,
});

const itemsSchema = new Schema({
  id: Number,
  class_name: String,
  class_instructor: String,
  class_duration: Number,
  user_email: String,
});

const paymentSchema = new Schema({
  id: Number,
  amount: Number,
  userEmail: String,
});

const classes = mongoose.model("classes", classesSchema);
const users = mongoose.model("users", usersSchema);
const items = mongoose.model("items", itemsSchema);
const payments = mongoose.model("payments", paymentSchema);

// endpoints
app.get("/", (req, res) => {
  res.render("home", { layout: "main" });
});
app.get("/login", (req, res) => {
  if (req.session.userEmail && req.session.userEmail != "") {
    return res.redirect("/classes");
  }
  res.render("login", { layout: "main" });
});

app.post("/login", async (req, res) => {
  const { email, password, button } = req.body;
  if (!email || !password) {
    return res.render("error", {
      layout: "main",
      message: "Email or password is empty",
      link: "/login",
      linkName: "Return to Login Page",
    });
  }

  if (button === "login") {
    const user = await users.findOne({ email: email, password: password });

    if (!user) {
      return res.render("error", {
        layout: "main",
        message: "User not found",
        link: "/login",
        linkName: "Return to Login Page",
      });
    }
    req.session.userEmail = email;
    res.redirect("/classes");
  } else if (button === "register") {
    const user = await users.findOne({ email: email });
    if (user) {
      return res.render("error", {
        layout: "main",
        message: "User Already Exist",
        link: "/login",
        linkName: "Return to Login Page",
      });
    }
    return res.render("login", {
      layout: "main",
      isModeRegister: true,
      email: email,
      password: password,
    });
  } else if (button === "yes") {
    const newUser = new users({
      name: email.split("@")[0],
      email: email,
      isAdmin: false,
      password: password,
      isMember: true,
    });
    newUser.save((error) => {
      if (error) {
        return res.render("error", {
          layout: "main",
          message: "Internal Server Error",
          link: "/login",
          linkName: "Return to Login Page",
        });
      }
      const newPayment = new payments({
        amount: 75,
        userEmail: email,
      });
      newPayment.save((error) => {
        if (error) {
          return res.render("error", {
            layout: "main",
            message: "Internal Server Error",
            link: "/login",
            linkName: "Return to Login Page",
          });
        }
        req.session.userEmail = email;
        return res.redirect("/classes");
      });
    });
  } else if (button === "no") {
    const newUser = new users({
      name: email.split("@")[0],
      email: email,
      isAdmin: false,
      password: password,
      isMember: false,
    });
    newUser.save((error) => {
      if (error) {
        return res.render("error", {
          layout: "main",
          message: "Internal Server Error",
          link: "/login",
          linkName: "Return to Login Page",
        });
      }
      req.session.userEmail = email;
      return res.redirect("/classes");
    });
  } else {
    return res.render("error", {
      layout: "main",
      message: "Page Not Found",
      link: "/login",
      linkName: "Return to Login Page",
    });
  }

});

app.get("/cart", (req, res) => {
  res.render("cart", { layout: "main" });
});
app.get("/error", (req, res) => {
  res.render("error", { layout: "main" });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  return res.redirect("/login");
});

app.get("/classes", (req, res) => {
  let classesList = [];
  classes
    .find()
    .lean()
    .then((results) => {
      res.render("classes", {
        layout: "main.hbs",
        classesList: results,
        isLoggedIn: req.session.userEmail && req.session.userEmail != "",
      });
      return;
    });
});

app.post("/classes", (req, res) => {
  const classSelected = req.body.classCart;
  console.log(`class: ${classSelected}`);
});

//-------------------
const onHttpStart = () => {
  console.log(`Web server started on port ${HTTP_PORT}, press CTRL+C to exit`);
};

app.listen(HTTP_PORT, onHttpStart);
