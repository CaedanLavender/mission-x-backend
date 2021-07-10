const express = require('express');
const app = express();
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

// Declaring local variables with .env details
const db_host = process.env.DB_HOST
const db_user = process.env.DB_USER
const db_password = process.env.DB_PASSWORD

const db = mysql.createConnection({
	host		:	db_host,
	user		:	db_user,
	password	:	db_password,
	database	:	'mission_x'
})

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

// Logs if connection is successful
db.connect(err => console.log(err || "Connection Successful"));

// Project endpoint
app.get('/projects', (req, res) => {
	console.log('hit')
	// console.log(req);
	db.query('SELECT * FROM users', (err, results) => {
		if (results.length) {
			console.log(results);
			res.status(200).send(results);
		} else {
			res.status(400).send("There was an error")
		}
	})
});

// Add your endpoints below
// i.e:
// app.get('/something'), (req, res) => blah blah blah




app.listen(4000);