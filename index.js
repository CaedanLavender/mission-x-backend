// Imports/require
const express = require("express");
const app = express();
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

// Declaring local variables with .env details
const db_host = process.env.DB_HOST;
const db_user = process.env.DB_USER;
const db_password = process.env.DB_PASSWORD;

// Creates sql connection using details from .env file
const db = mysql.createConnection({
  host: db_host,
  user: db_user,
  password: db_password,
  database: "mission_x",
});

// Sets up app to accept json
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Logs if connection is successful
db.connect((err) => console.log(err || "Connection Successful"));

// Project endpoint
app.get("/projects", (req, res) => {
  // console.log(req);
  db.query("SELECT * FROM project", (err, results) => {
    if (results.length) {
      res.status(200).send(results);
    } else {
      res.status(400).send("There was an error");
    }
  });
});

// Add your endpoints below
// i.e:
// app.get('/something'), (req, res) => blah blah blah

app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    res.send(result);
  });
});

app.get("/userslogged", (req, res) => {
  db.query("SELECT * FROM users WHERE user_id = '15'", (err, result) => {
    res.send(result);
  });
});

// The backend can now be queried at localhost:4000
app.listen(4000);
