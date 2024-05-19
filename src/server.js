const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const saltRounds = 10;

const app = express();
const PORT = process.env.PORT || 3000;

dotenv.config();
process.env.TOKEN_SECRET;

app.use(cors());

//uri = process.env.URI;
uri =
  "mongodb+srv://api-user:SUuVLtsF5S8rxFIt@cs314termprojectdatabas.d4zfdrh.mongodb.net/?retryWrites=true&w=majority&appName=Cs314TermProjectDatabase";
const client = new MongoClient(uri);

app.options("*", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Origin", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Length, X-Requested-With"
  );
  res.send(200);
});

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post(
  "/chat/auth/createUser/:userName/:password",
  async function (req, res) {
    const givenUserName = req.params.userName;
    const givenPswd = req.params.password;

    const response = await createNewUser(givenUserName, givenPswd);
    if (response != 0) {
      res.status(200);
      res.send(generateAccessToken(givenUserName));
    } else {
      res.sendStatus(409);
    }
  }
);

app.get("/chat/auth/login/:userName/:password", async function (req, res) {
  const givenUserName = req.params.userName;
  const givenPswd = req.params.password;

  const response = await verifyCredentials(givenUserName, givenPswd);
  if (response) {
    res.status(200);
    res.send(generateAccessToken(givenUserName));
  } else {
    res.sendStatus(401);
  }
});

app.all("*", (req, res) => {
  res.send(req.params);
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

function generateAccessToken(username) {
  return jwt.sign(username, process.env.TOKEN_SECRET);
}
//example app.get(/#, authenticateToke, (req, res)
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    console.log(err);

    if (err) return res.sendStatus(403);

    req.user = user;

    next();
  });
}

async function createNewUser(userNameToCheck, passwordToCheck) {
  const database = client.db("Cs314TermProjectDatabase");
  const users = database.collection("users");

  const query = { userName: userNameToCheck };
  console.log(userNameToCheck);
  const options = {
    projection: { username: 1 },
  };

  const user = await users.findOne(query, options);
  console.log(user);

  if (user == null) {
    createdDt = new Date();

    const salt = await bcrypt.genSalt(saltRounds);
    const generatedHash = await bcrypt.hash(passwordToCheck, salt);

    console.log("salt: ", salt);
    console.log("hash: ", generatedHash);
    const doc = {
      timeCreated: createdDt,
      timeEdited: createdDt,
      userName: userNameToCheck,
      passwordHash: generatedHash,
      groups: [],
    };
    const result = users.insertOne(doc);
    return (await result).insertedId;
  }
  return 0;
}

async function verifyCredentials(givenUserName, givenPswd) {
  const database = client.db("Cs314TermProjectDatabase");
  const users = database.collection("users");

  const query = { userName: givenUserName };
  console.log(givenUserName);
  const options = {
    projection: { username: 1, passwordHash: 1 },
  };

  const user = await users.findOne(query, options);
  console.log(user);

  if (user != null) {
    if (await bcrypt.compare(givenPswd, user.passwordHash)) {
      console.log("username and password correct for ", givenUserName);
      return true;
    }
    console.log("username valid but wrong password for ", givenUserName);
    return false;
  }
  console.log("user does not exist for ", givenUserName);
  return false;
}
