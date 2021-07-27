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
  console.log("Query to /projects");
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
  console.log("Query to /project");
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
  console.log("Query to /count looking for: " + req.query.table);
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
  console.log("Query to /projectindex looking for: " + req.query.project);
  db.query(
    `WITH project AS ( SELECT project_id, project_number, row_number() OVER ( ORDER BY project_number) AS 'rownumber' FROM project ) SELECT project_id, rownumber FROM project WHERE project_id = ?`,
    [req.query.project],
    (err, results) => {
      res.send({ index: results[0].rownumber });
    }
  );
});

app.get("/users", (req, res) => {
  console.log("Query to /users");
  db.query(
    "SELECT users.user_id, users.first_name, users.last_name, CONCAT(teachers.first_name, ' ', teachers.last_name) AS teacher_name, users.profile_pic, users.school, users.date_of_birth, users.contact_number, users.email, project.course FROM users JOIN progress_history ON users.user_id = progress_history.user_id JOIN project ON progress_history.project_id = project.project_id JOIN users AS teachers ON users.teacher_id = teachers.user_id WHERE date_completed IS null",
    (err, result) => {
      res.send(result);
    }
  );
});

app.get("/help-requests", (req, res) => {
  console.log("Query to /help-requests");
  db.query(
    "SELECT DISTINCT first_name, users.user_id, profile_pic, date_created, done FROM users JOIN progress_history ON users.user_id = progress_history.user_id JOIN help_request ON help_request.user_id  = users.user_id",
    (err, result) => {
      res.send(result);
    }
  );
});

app.post("/help-requests-post", (req, res) => {
  db.query(
    "UPDATE mission_x.help_request SET done = ? WHERE user_id = ?",
    [req.body.done, req.body.user_id],
    function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Help requested saved as DONE/NOT DONE at the backend");
        res.sendStatus(201);
      }
    }
  );
});

// The backend can now be queried at localhost:4000
app.listen(4000);

// container = {};
// for(i = 0; i<10; i++) {
// 	container['prop'+i] = {'a':'something'}
// }

// console.log(container)

db.query(
  `
SELECT users.user_id, users.first_name, users.last_name, progress_history.project_id, progress_history.date_started, progress_history.date_completed
FROM progress_history
RIGHT JOIN users
ON progress_history.user_id = users.user_id
WHERE users.role = 'student'
ORDER BY users.user_id
`,
  (err, results) => {
    if (results.length) {
      let container = [];
      console.log(results.length);
      results.forEach((row) => {
        // Sets up array>object structure
        container[row.user_id - 1] = {
          name: row.first_name + " " + row.last_name,
          completedProjects: container[
            row.user_id - 1
          ]?.completedProjects.concat([row.project_id]) || [row.project_id],
        };
      });
      console.log(container);
      // results.forEach(row => {
      // 	container[row.user_id -1].completedProjects.push(row.project_id)
      // })
    } else {
      console.log("There was an SQL error");
      console.log(err);
    }
  }
);
