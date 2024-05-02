require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const app = express();
const port = process.env.PORT || 4000;

const Joi = require("joi");

const expireTime = 24 * 60 * 60 * 1000;

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store 
    saveUninitialized: false,
    resave: true
}
));

app.use('/css', express.static(__dirname + '/public/css'));
app.use('/html', express.static(__dirname + '/public/html'));

app.get('/', async (req, res) => {
    if (req.session.authenticated) {
        // res.sendFile(__dirname + '/public/html/homeLoggedIn.html');
        res.send("<h3>Hello " + req.session.username + "</h3>" +

            "<form action='/members' method='get'>" +
                "<button type='submit'>Go to members Area</button><br>" +
            "</form>" +
            "<form action='/logout' method='get'>" +
                "<button type='submit'>Logout</button>" +
            "</form>");
        console.log(req.session.username);
        return;
    }
    res.sendFile(__dirname + '/public/html/index.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/html/signup.html');
});

app.post('/signupSubmit', async (req, res) => {
    var username = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    const schema = Joi.object(
        {
            username: Joi.string().alphanum().max(20).required(),
            email: Joi.string().email().required(),
            password: Joi.string().max(20).required()
        });

    const validationResult = schema.validate({ username, email, password });
    if (validationResult.error != null) {
        let html = "";
        validationResult.error.details.forEach((error) => {
            html += `<p>${error.message}</p>`;
        });
        html += "<a href='/signup'>try again</a>";
        res.send(html);
        return;
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);

    req.session.authenticated = true;
	req.session.username = username;
	req.session.cookie.maxAge = expireTime;

    await userCollection.insertOne({username: username, email: email, password: hashedPassword});
	console.log("Inserted user");

    res.redirect("/members");
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/html/login.html');
});

app.post('/loginSubmit', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

	const schema = Joi.string().email().required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
	   //add stuff
	   return;
	}

	const result = await userCollection.find({email: email}).project({email: 1, username: 1, password: 1, _id: 1}).toArray();

    console.log(result);

    if (result.length != 1) {
		console.log("email is wrong");
		res.send("<p>Email is wrong</p> <a href='/login'>try again</a>");
		return;
	}

    if (await bcrypt.compare(password, result[0].password)) {
		console.log("correct password");
		req.session.authenticated = true;
		req.session.username = result[0].username;
		req.session.cookie.maxAge = expireTime;

		res.redirect('/members');
		return;
	}
	else {
		console.log("Invalid email/password combination");
		res.send("<p>Invalid email/password combination</p> <a href='/login'>try again</a>");
		return;
	}
});

app.get('/members', (req, res) => {
    // res.sendFile(__dirname + '/public/html/members.html');
    res.send("<h1>Welcome to the members page " + req.session.username + "</h1>" +
    "<form action='/logout' method='get'>"+
        "<button type='submit'>Signout</button>"+
    "</form>" );
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
