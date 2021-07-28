// Imports/require
const express = require("express");
const app = express();
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
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

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    // sets the destination directory to "Images"
    callback(null, "Images/project-submissions");
  },
  filename: (req, file, callback) => {
    // Names the file with the prefix 'project-submission' followed by the current datetime and the extension from the original filename (e.g. .png)
    callback(
      null,
      "project-submission--" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

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
  db.query(
    `SELECT COUNT(*) AS count FROM ${req.query.table}`,
    (err, results) => {
      if (err) {
        console.log(err);
        res
          .status(400)
          .send(
            err.code === "ER_NO_SUCH_TABLE"
              ? "The table does not exist"
              : "Unknown error"
          );
      } else if (results?.length) {
        // res.status(200).send({ count: results[0][Object.keys(results[0])[0]] });
        res.status(200).send(results[0]);
      } else {
        res
          .status(400)
          .send("There was an error requesting the number of rows");
      }
    }
  );
});

// endpoint to return the index of a project based on it's ID
// You might think they're one and the same, but it may be that in the future, a new project called Project 01b is introduced, this project should come 2nd in the sequence, but will have an id of something else.
// This endpoint and accompanying sql statement returns an assumed index based on it's position in a sort (this also assumes that the alphabetical position of each project's 'project_number' field will always corrospond to it's intended position -- here we depend on the naming convention being followed" "Project 01[nothing or a, b, c etc]")
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
    "SELECT DISTINCT first_name, users.user_id, profile_pic, date_created, done FROM users JOIN progress_history ON users.user_id = progress_history.user_id JOIN help_request ON help_request.user_id  = users.user_id WHERE done=0",
    (err, result) => {
      res.send(result);
    }
  );
});

// help_requests table update
app.post("/help-requests-post", (req, res) => {
  const requests = req.body.completed_requests;

  // {1: true, 2: false, 3: true}

  Object.keys(requests).map((key) => {
    db.query(
      "UPDATE mission_x.help_request SET done = ? WHERE user_id = ?",
      [requests[key], key],
      function (err, result) {
        console.log(result);
        console.log(
          "help_requests table successfully updated (sincerely, backend)"
        );
        res.sendStatus(201);
      }
    );
  });
});

// endpoint to return progress as an array of objects.
// takes the results of an SQL query, dynamically assembles array of objects and returns for the front-end to display
app.get("/progress", (req, res) => {
  db.query(
    `
	SELECT users.user_id, users.first_name, users.last_name, progress_history.project_id, progress_history.date_started, progress_history.date_completed
	FROM progress_history
	RIGHT JOIN users
	ON progress_history.user_id = users.user_id
	AND progress_history.date_completed IS NOT NULL
	WHERE users.role = 'student'
	ORDER BY users.user_id
	`,
    (err, results) => {
      if (results.length) {
        let container = [];
        results.forEach((row) => {
          // Sets up array>object structure
          container[row.user_id - 1] = {
            // properties are in quotes because they 'dont exist yet', these lines create the properties and sets them at the same time.
            // Really, the name property gets overwritten each time the student of the same name appears in the sql results, but this is fine as their name doesn't change
            name: row.first_name + " " + row.last_name,
            // This line uses a short-circuit statement to concatenate each completed project's project_id onto the array that may or may not already exist, the right side of the shortcircuit statement simply set's it to an array of a project_id because this would logically be the first item in the array if the property doesn't exist yet (hence the '?' after the container[index] earlier in the statment. An optional is used here as we don't know yet if the index is populated yet, and so if it fails, the right side of the || is executed)
            completedProjects: container[
              row.user_id - 1
            ]?.completedProjects.concat([row.project_id]) || [row.project_id],
          };
        });
        console.log(container);
        res.send(container);
      } else {
        console.log(err);
        res.send(err);
      }
    }
  );
});

app.get("/user/project-submissions/", (req, res) => {
	console.log("Request for project submissions with user: " + req.query.user_id + " on project: " + req.query.project_id)
	db.query('SELECT * FROM progress_history WHERE user_id = ? AND project_id = ? ', [req.query.user_id, req.query.project_id], (err, results) => {
		if (err) {
			res.status(400).send("There was a problem")
		} else {
			console.log(results)
			if (results.length) {
				res.status(200).send({projectSubmitted: true})
			} else {
				res.status(200).send({projectSubmitted: false})
			}
		}
	})
})

// Endpoint to send a file back based on the filename as a parameter
// The frontend will hit this endpoint with the filename from the database as the param and then will get served the image back
app.get("/project-submissions/images/:filename", (req, res) => {
  const filePath =
    path.resolve(__dirname) +
    "/Images/project-submissions/" +
    req.params.filename;
  res.sendFile(filePath);
});

// Endpoint for uploading an image, runs the image into 'upload' as defined above (does multer stuff) the new filename can be accessed through res.req etc so an sql update can be made to add the submission to database
app.post("/project-submissions/upload", upload.single("image"), (req, res) => {
  console.log("Received image: " + res.req.file.filename);
  console.log(req.body.user_id);
  const dateTimeStamp = timeUTC();
  db.query(
    `
	INSERT INTO progress_history (user_id, project_id, date_started, date_submitted, submissions)
	values('${req.body.user_id}', '${req.body.project_id}', NOW(), NOW(), '${res.req.file.filename}')
	`,
    (err, results) => {
      console.log(results || err);
    }
  );
  res.status(200).send("The image was uploaded");
});

// The backend can now be queried at localhost:4000
app.listen(4000);
