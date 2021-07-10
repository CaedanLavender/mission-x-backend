const express = require('express');
const app = express();
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();


const db_host = process.env.DB_HOST
const db_user = process.env.DB_USER
const db_password = process.env.DB_PASSWORD

const db = mysql.createConnection({
	host		:	db_host,
	user		:	db_user,
	password	:	db_password,
	database	:	'mission_x'
})

// Logs if connection is successful
db.connect(err => console.log(err || "Connection Successful"));