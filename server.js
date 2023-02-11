const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

const HTTP_PORT = process.env.PORT || 8080;

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

const path = require("path");

app.use(express.static("assets"));

// import a mongodb driver (mongoose)
const mongoose = require("mongoose");
mongoose.connect(
  "mongodb+srv://mabuhannood:0791439363.Ah@cluster0.1l18sqj.mongodb.net/fitness"
);
const Schema = mongoose.Schema;
const classesSchema = new Schema({
  id: Number,
  className: String,
  classInstructor: String,
  classDuration: Number,
  img: String,
});

const classes = mongoose.model("classes", classesSchema);

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
      console.log(results);
      // res.json(results);
      res.render("classes", {
        layout: "main.hbs",
        classesList: results,
      });
      return;
    });
});

const onHttpStart = () => {
  console.log(`Web server started on port ${HTTP_PORT}, press CTRL+C to exit`);
};

app.listen(HTTP_PORT, onHttpStart);
