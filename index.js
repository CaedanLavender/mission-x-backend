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

// Project list endpoint
app.get("/projects", (req, res) => {
  db.query("SELECT * FROM project", (err, results) => {
    if (results.length) {
      res.status(200).send(results);
    } else {
      res.status(400).send("There was an error");
    }
  });
});

// Endpoint for a specific project
app.get("/project", (req, res) => {
  db.query(
    "SELECT * FROM project where project_id = ?",
    [req.query.project],
    (err, results) => {
      if (results.length) {
        res.status(200).send(results);
      } else {
        res.status(400).send("The requested project does not exist");
      }
    }
  );
});

// Simple endpoint to return the number of rows in a given table
app.get("/count", (req, res) => {
  db.query(`SELECT COUNT(*) FROM ${req.query.table}`, (err, results) => {
    if (err) {
      res
        .status(400)
        .send(
          err.code === "ER_NO_SUCH_TABLE"
            ? "The table does not exist"
            : "Unknown error"
        );
    } else if (results.length) {
      res.status(200).send({ count: results[0][Object.keys(results[0])[0]] });
    } else {
      res.status(400).send("There was an error requesting the number of rows");
    }
  });
});

app.get("/projectindex", (req, res) => {
  db.query(
    `WITH project AS ( SELECT project_id, project_number, row_number() OVER ( ORDER BY project_number) AS 'rownumber' FROM project ) SELECT project_id, rownumber FROM project WHERE project_id = ?`,
    [req.query.project],
    (err, results) => {
      console.log(results);
      res.send({ index: results[0].rownumber });
    }
  );
});

// Add your endpoints below
// i.e:
// app.get('/something', (req, res) => blah blah blah

app.get("/users", (req, res) => {
  db.query(
    "SELECT users.user_id, users.first_name, users.last_name, CONCAT(teachers.first_name, ' ', teachers.last_name) AS teacher_name, users.profile_pic, users.school, users.date_of_birth, users.contact_number, users.email, project.course FROM users JOIN progress_history ON users.user_id = progress_history.user_id JOIN project ON progress_history.project_id = project.project_id JOIN users AS teachers ON users.teacher_id = teachers.user_id",

    (err, result) => {
      res.send(result);
    }
  );
});

app.get("/help-requests", (req, res) => {
  db.query(
    "SELECT first_name, profile_pic, date_created FROM users JOIN progress_history ON users.user_id = progress_history.user_id JOIN help_request ON help_request.user_id  = users.user_id",

    (err, result) => {
      res.send(result);
    }
  );
});

// The backend can now be queried at localhost:4000
app.listen(4000);
