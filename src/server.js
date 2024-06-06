const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const http = require("http");

const userRoutes = require("./Routes/userRoutes.js");
const groupRoutes = require("./Routes/groupRoutes.js");

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { authenticateToken } = require("./Middleware/auth");

dotenv.config();
process.env.TOKEN_SECRET;
process.env.DATABASE_NAME;

socket_dict = new Map();

app.use(cors());
app.set("socketio", io);

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

app.use("/userRoutes", userRoutes);
app.use("/groupRoutes", groupRoutes);

io.on("connect", async (socket) => {
  console.log("a user connected");
  const token = socket.handshake.headers.token;
  console.log(token);

  const username = jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    console.log(err);

    if (err) socket.disconnect();

    return user;
  });
  console.log(username);
  const database = client.db(process.env.DATABASE_NAME);
  const users = database.collection("users");

  json = {};
  const query = { userName: username };
  const options = {
    projection: { groups: 1 },
  };

  const user = await users.findOne(query, options);
  if (user == null) {
    console.error("USER DOES NOT EXIST ", username);
    return;
  }
  const groups = user.groups;
  console.log(groups);
  //groups
  for (id in groups) {
    socket.join(groups[id].toString());
    console.log("joined group", groups[id].toString());
  }
  socket.join(user._id.toString());
  console.log("joined user group ", user._id.toString());
  socket_dict.set(username, socket);

  socket.emit("test");

  socket.on("disconnect", () => {
    console.log(username, " disconnected");
    socket_dict.delete(username);
  });

  socket.on("message", (arg) => {
    console.log("message sent with", arg);
  });
  socket.on("new message", (arg) => {
    console.log("message recieved", arg);
  });
});

//code for messaging because I am too nervous to seperate this into seperate files and deal with io.

app.post("/message/:groupId/:content", authenticateToken, async (req, res) => {
  const messageContent = req.params.content;
  const groupId = req.params.groupId;
  const userName = req.username;

  const result = await sendMessage(messageContent, groupId, userName);
  if (result == null) {
    res.sendStatus(400);
  } else {
    const payload = {
      author: userName,
      groupId: groupId,
      content: messageContent,
    };
    console.log("message sent to ", groupId.toString());
    io.in(groupId.toString()).emit("sendMessage", payload);
    res.sendStatus(200);
  }
});

server.listen(PORT, () => {
  console.log("listening on *:3000");
});

async function sendMessage(content, groupId, userName) {
  const database = client.db(process.env.DATABASE_NAME);
  console.log("databasename", process.env.DATABASE_NAME);
  const users = database.collection("users");
  const messages = database.collection("messages");

  const query = { userName: userName };
  const options = {
    projection: { _id: 1 },
  };
  console.log("searching for user ", userName);
  const user = await users.findOne(query, options);

  if (user == null) {
    return null;
  }
  const dt = new Date();
  const doc = {
    author: user._id,
    dateSent: dt,
    groupId: new ObjectId(groupId),
    content: content,
  };
  const message_result = await messages.insertOne(doc);
  if (message_result == null) {
    return null;
  }
  return true;
}
