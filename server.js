const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

const HTTP_PORT = process.env.PORT || 8080;
// Handlebars
const exphbs = require("express-handlebars");

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

//define static folder
app.use(express.static("assets"));

// import a mongodb driver (mongoose)
const mongoose = require("mongoose");
mongoose.connect(
  "mongodb+srv://mabuhannood:22446688@cluster0.clc893a.mongodb.net/fitness"
);
//Define schemas

const Schema = mongoose.Schema;
const classesSchema = new Schema({
  id: Number,
  class_name: String,
  class_instructor: String,
  class_duration: Number,
  img: String,
});

const usersSchema = new Schema({
  user_name: String,
  user_email: String,
  password: String,
  admin: Boolean,
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
  email: String,
  amount: Number,
  items: [],
});

const classes = mongoose.model("classes", classesSchema);
const users = mongoose.model("users", usersSchema);
const items = mongoose.model("items", itemsSchema);
const payment = mongoose.model("payments", paymentSchema);

// endpoints
app.get("/", (req, res) => {
  res.render("home", { layout: "main" });
});
app.get("/login", (req, res) => {
  res.render("login", { layout: "main" });
});

app.post("/login", (req, res) => {
  // to do
  //check the validity of the data
  // if correct, store the user data in the DB
  // do authentication
  // redirect the user to the classes page
  // if not, show a propper message error
});

app.get("/cart", (req, res) => {
  res.render("cart", { layout: "main" });
});
app.get("/error", (req, res) => {
  res.render("error", { layout: "main" });
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
