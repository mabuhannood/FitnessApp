const express = require("express");
const session = require("express-session");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");

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

app.use("/assets", express.static("assets"));
app.use(express.static("assets"));

// import a mongodb driver (mongoose)
mongoose.connect(
  "mongodb+srv://mabuhannood:22446688@cluster0.clc893a.mongodb.net/fitness"
);

// define schemas
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
  id: String,
  amount: Number,
  userEmail: String,
});

// define models
const classes = mongoose.model("classes", classesSchema);
const users = mongoose.model("users", usersSchema);
const cart = mongoose.model("carts", cartSchema);
const payments = mongoose.model("payments", paymentSchema);

// endpoints

//login page endpoint //
app.get("/", (req, res) => {
  res.render("home", {
    layout: "main",
    isLoggedIn: req.session.userEmail && req.session.userEmail != "",
    isAdmin: req.session.isAdmin,
  });
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
      title: "ERROR",
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
        title: "ERROR",
        message: "User not found",
        link: "/login",
        linkName: "Return to Login Page",
      });
    }
    req.session.userEmail = email;
    req.session.isAdmin = user.isAdmin;
    res.redirect("/classes");
  } else if (button === "register") {
    const user = await users.findOne({ email: email });
    if (user) {
      return res.render("error", {
        layout: "main",
        title: "ERROR",
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
          title: "ERROR",
          message: "Internal Server Error",
          link: "/login",
          linkName: "Return to Login Page",
        });
      }
      const randomNumber = crypto.randomBytes(12).toString("hex");
      const newPayment = new payments({
        id: randomNumber,
        amount: 75,
        userEmail: email,
      });
      newPayment.save((error) => {
        if (error) {
          return res.render("error", {
            layout: "main",
            title: "ERROR",
            message: "Internal Server Error",
            link: "/login",
            linkName: "Return to Login Page",
          });
        }
        req.session.userEmail = email;
        req.session.isAdmin = false;
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
          title: "ERROR",
          message: "Internal Server Error",
          link: "/login",
          linkName: "Return to Login Page",
        });
      }
      req.session.userEmail = email;
      req.session.isAdmin = false;
      return res.redirect("/classes");
    });
  } else {
    return res.render("error", {
      layout: "main",
      title: "ERROR",
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

// classes page endpoint //
app.get("/classes", async (req, res) => {
  const loggedUser = req.session.userEmail;
  const classesFromDb = await classes.find({}).lean();
  if (loggedUser === undefined) {
    res.render("classes", {
      layout: "main.hbs",
      classesList: classesFromDb,
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
      isAdmin: req.session.isAdmin,
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
      isAdmin: req.session.isAdmin,
    });
  }

  return;
});

// cart page
app.post("/cart", (req, res) => {
  const loggedUser = req.session.userEmail;
  if (loggedUser === undefined) {
    return res.render("error", {
      layout: "main",
      title: "ERROR",
      message: "User must be logged in to book a class",
      link: "/login",
      linkName: "LOGIN",
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
  const isMember = await users
    .find({ email: loggedUser, isMember: true })
    .lean();

  if (!cartItemsFromDb.length) {
    return res.render("error", {
      layout: "main",
      title: "ERROR",
      message: "There are no classes booked",
      link: "/classes",
      linkName: "VIEW CLASSES",
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
      isAdmin: req.session.isAdmin,
    });
  } else if (cartItemsFromDb.length) {
    if (isMember.length) {
      return res.render("cart", {
        layout: "main",
        cartItems: cartItemsFromDb,
        membership: isMember,
        logged: req.session.userEmail,
        isLoggedIn: req.session.userEmail && req.session.userEmail != "",
        isAdmin: req.session.isAdmin,
      });
    } else {
      let subtotal = 0;
      for (let index = 0; index < cartItemsFromDb.length; index++) {
        const item = cartItemsFromDb[index];
        subtotal += 0.75 * parseFloat(item.class_duration);
      }

      const tax = (subtotal * 0.13).toFixed(2);
      const totalCost = (subtotal + subtotal * 0.13).toFixed(2);
      return res.render("cart", {
        layout: "main",
        cartItems: cartItemsFromDb,
        subTot: subtotal,
        vat: tax,
        total: totalCost,
        logged: req.session.userEmail,
        isLoggedIn: req.session.userEmail && req.session.userEmail != "",
        isAdmin: req.session.isAdmin,
      });
    }
  }
});

app.delete("/cart/:classId", (req, res) => {
  const loggedUser = req.session.userEmail;
  console.log("loggedUser, req.params.classId", loggedUser, req.params.classId);
  cart
    .deleteOne({
      user_email: loggedUser,
      id: parseInt(req.params.classId),
    })
    .then((results) => {
      console.log(results);
      if (!results.deletedCount) {
        res.status(200).json({ success: false });
        return;
      }
      res.status(200).json({ success: true });
      return;
    })
    .catch((err) => {
      res.status(500).json({ success: false });
      return;
    });
});

// payment
app.post("/pay", async (req, res) => {
  const loggedUser = req.session.userEmail;
  const randomNumber = crypto.randomBytes(12).toString("hex");
  const isMember = await users
    .find({ email: loggedUser, isMember: true })
    .lean();

  let paymentToAdd;
  if (isMember.length) {
    paymentToAdd = new payments({
      id: randomNumber,
      amount: 0,
      userEmail: loggedUser,
    });
  } else {
    paymentToAdd = new payments({
      id: randomNumber,
      amount: req.body.amount,
      userEmail: loggedUser,
    });
  }
  const addPayment = await paymentToAdd.save();

  const cartDeleteResult = await cart.deleteMany({ user_email: loggedUser });
  return res.render("error", {
    layout: "main",
    title: "Payment Received",
    message: `Confirmation No. ${randomNumber} `,
    link: "/",
    linkName: "RETURN HOME",
    isLoggedIn: req.session.userEmail && req.session.userEmail != "",
    isAdmin: req.session.isAdmin,
  });
});

// admin page
app.get("/admin", async (req, res) => {
  if (!req.session.userEmail) {
    return res.render("error", {
      layout: "main",
      title: "ERROR",
      message: "You are not logged in!",
      link: "/login",
      linkName: "Return to Login Page",
    });
  }
  if (!req.session.isAdmin) {
    return res.render("error", {
      layout: "main",
      title: "ERROR",
      message: "You are not allowed to use admin dashboard!",
      link: "/classes",
      linkName: "Go to Classes Page",
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
      isAdmin: req.session.isAdmin,
    });
  }
  const allPayments = await payments
    .find({})
    .sort({ userEmail: 1 })
    .lean()
    .exec();
  const totalMoneyEarned = await payments.aggregate([
    { $group: { _id: null, amount: { $sum: "$amount" } } },
  ]);
  res.render("admin", {
    layout: "main.hbs",
    purchasesList: allPayments,
    totalMoneyEarned: totalMoneyEarned[0].amount.toFixed(2),
    isLoggedIn: req.session.userEmail && req.session.userEmail != "",
    isAdmin: req.session.isAdmin,
  });
});

app.post("/admin", async (req, res) => {
  if (!req.session.userEmail) {
    return res.render("error", {
      layout: "main",
      title: "ERROR",
      message: "You are not logged in!",
      link: "/login",
      linkName: "Return to Login Page",
    });
  }
  if (!req.session.isAdmin) {
    return res.render("error", {
      layout: "main",
      title: "ERROR",
      message: "You are not allowed to use admin dashboard!",
      link: "/classes",
      linkName: "Go to Classes Page",
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
      isAdmin: req.session.isAdmin,
    });
  }
  const { sort } = req.body;
  if (sort === "asc") {
    const allPayments = await payments
      .find({})
      .sort({ userEmail: "asc" })
      .lean()
      .exec();
    const totalMoneyEarned = await payments.aggregate([
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    return res.render("admin", {
      layout: "main.hbs",
      purchasesList: allPayments,
      totalMoneyEarned: Number(totalMoneyEarned[0].amount).toFixed(2),
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
      isAdmin: req.session.isAdmin,
    });
  } else if (sort === "desc") {
    const allPayments = await payments
      .find({})
      .sort({ userEmail: "desc" })
      .lean()
      .exec();
    const totalMoneyEarned = await payments.aggregate([
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    return res.render("admin", {
      layout: "main.hbs",
      purchasesList: allPayments,
      totalMoneyEarned: Number(totalMoneyEarned[0].amount).toFixed(2),
      isLoggedIn: req.session.userEmail && req.session.userEmail != "",
      isAdmin: req.session.isAdmin,
    });
  }
});

//-------------------
const onHttpStart = () => {
  console.log(`Web server started on port ${HTTP_PORT}, press CTRL+C to exit`);
};

app.listen(HTTP_PORT, onHttpStart);
