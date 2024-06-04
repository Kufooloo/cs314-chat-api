const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const { generateAccessToken } = require("../Util/Util/jwtUtil");
const jwt = require("jsonwebtoken");

process.env.DATABASE_NAME;

const saltRounds = 10;

uri =
  "mongodb+srv://api-user:SUuVLtsF5S8rxFIt@cs314termprojectdatabas.d4zfdrh.mongodb.net/?retryWrites=true&w=majority&appName=" +
  process.env.DATABASE_NAME;
const client = new MongoClient(uri);

var express = require("express"),
  router = express.Router();
router.post(
  "/createUser/:userName/:password/:profilePicLink",
  async function (req, res) {
    const givenUserName = req.params.userName;
    const givenPswd = req.params.password;
    const givenProfileLink = req.params.profilePicLink;

    const response = await createNewUser(
      givenUserName,
      givenPswd,
      givenProfileLink
    );
    if (response != 0) {
      res.status(200);
      res.send(generateAccessToken(givenUserName));
    } else {
      res.sendStatus(409);
    }
  }
);

router.get("/login/:userName/:password", async function (req, res) {
  const givenUserName = req.params.userName;
  const givenPswd = req.params.password;
  json = null;

  const response = await verifyCredentials(givenUserName, givenPswd);
  if (response != null) {
    res.status(200);
    json = {
      token: generateAccessToken(givenUserName),
      profilePicLink: response,
    };
    res.json(json);
  } else {
    res.sendStatus(401);
  }
});
async function verifyCredentials(givenUserName, givenPswd) {
  const database = client.db(process.env.DATABASE_NAME);
  const users = database.collection("users");

  json = {};
  const query = { userName: givenUserName };
  console.log(givenUserName);
  const options = {
    projection: { username: 1, passwordHash: 1, profilePicLink: 1 },
  };

  const user = await users.findOne(query, options);
  console.log(user);

  if (user != null) {
    if (await bcrypt.compare(givenPswd, user.passwordHash)) {
      console.log("username and password correct for ", givenUserName);
      if (user.profilePicLink == null) {
        return "#";
      }
      return user.profilePicLink;
    }
    console.log("username valid but wrong password for ", givenUserName);
    return null;
  }
  console.log("user does not exist for ", givenUserName);
  return null;
}

async function createNewUser(
  userNameToCheck,
  passwordToCheck,
  givenProfileLink
) {
  const database = client.db(process.env.DATABASE_NAME);
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
      profilePicLink: givenProfileLink,
      passwordHash: generatedHash,
      groups: [],
    };
    const result = users.insertOne(doc);
    return (await result).insertedId;
  }
  return 0;
}

module.exports = router;
