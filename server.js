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

const cartSchema = new Schema({
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
const cart = mongoose.model("carts", cartSchema);
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

app.get("/error", (req, res) => {
  res.render("error", { layout: "main" });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  return res.redirect("/login");
});

app.get("/classes", async (req, res) => {
  const loggedUser = req.session.userEmail;
  console.log("loggedUser", loggedUser);
  const classesFromDb = await classes.find({}).lean();
  if (loggedUser === undefined) {
    res.render("classes", {
      layout: "main.hbs",
      classesList: classesFromDb,
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
    });
  } else {
    const cartItems = await cart.find({ user_email: loggedUser }).lean();
    // now to check if the class exists in the cart items

    if (cartItems.length) {
      for (let index = 0; index < cartItems.length; index++) {
        const cartItem = cartItems[index];
        for (const [i, item] of classesFromDb.entries()) {
          if (item.id === cartItem.id) {
            classesFromDb[i].booked = "disabled";
          }
        }
      }
    }

    res.render("classes", {
      layout: "main.hbs",
      classesList: classesFromDb,
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
    });
  }

  return;
});

app.post("/cart", (req, res) => {
  const loggedUser = req.session.userEmail;
  if (loggedUser === undefined) {
    return res.render("error", {
      layout: "main",
      message: "User must be logged in to book a class",
      link: "/classes",
      linkName: "Return to classes Page",
    });
  } else {
    const { class_name, class_duration, class_instructor, user_email, id } =
      req.body;
    const itemToAdd = new cart({
      id,
      class_name,
      class_instructor,
      class_duration,
      user_email: loggedUser,
    });
    itemToAdd.save().then((results) => {
      console.log(results);
    });
    res.redirect(`/classes`);
  }
});

app.get("/cart", async (req, res) => {
  const loggedUser = req.session.userEmail;
  const cartItemsFromDb = await cart.find({ user_email: loggedUser }).lean();
  const amountFromDb = await payments.find({ userEmail: loggedUser }).lean();
  console.log(cartItemsFromDb);
  if (!cartItemsFromDb.length) {
    return res.render("error", {
      layout: "main",
      message: "There are no classes booked",
      link: "/classes",
      linkName: "Return to classes Page",
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
    });
  } else if (cartItemsFromDb.length) {
    console.log(cartItemsFromDb);
    return res.render("cart", {
      layout: "main",
      cartItems: cartItemsFromDb,
      membership: amountFromDb,
      logged: req.session.userEmail,
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
    });
  }
});
//-------------------
const onHttpStart = () => {
  console.log(`Web server started on port ${HTTP_PORT}, press CTRL+C to exit`);
};

app.listen(HTTP_PORT, onHttpStart);
