const { MongoClient } = require("mongodb");
ObjectId = require("mongodb").ObjectId;
const { authenticateToken } = require("../Middleware/auth");

process.env.DATABASE_NAME;

uri =
  "mongodb+srv://api-user:SUuVLtsF5S8rxFIt@cs314termprojectdatabas.d4zfdrh.mongodb.net/?retryWrites=true&w=majority&appName=" +
  process.env.DATABASE_NAME;
const client = new MongoClient(uri);

var express = require("express"),
  router = express.Router();

router.delete("/removeGroup/:groupId/", authenticateToken, async (req, res) => {
  const userName = req.username;
  const groupId = new ObjectId(req.params.groupId);
  var io = req.app.get("socketio");

  result_code = await removeGroup(groupId, userName);
  if (result_code == 200) {
    res.sendStatus(200);
    return;
  }
  if (result_code == null || result_code == 404) {
    res.sendStatus(404);
    return;
  }
  if (result_code == 500) {
    res.sendStatus(500);
    return;
  }
  if (result_code == 401) {
    res.sendStatus(401);
    return;
  }
  for (user in result_code) {
    io.to(result_code[user].toString()).emit(
      "removedGroup",
      groupId.toString()
    );
  }
  res.sendStatus(200);
});
router.post(
  "/createGroup/:userName/:usersToAdd",
  authenticateToken,
  async (req, res) => {
    const givenUserName = req.username;
    const UsersToAdd = JSON.parse(req.params.usersToAdd);

    const database = client.db(process.env.DATABASE_NAME);
    const users = database.collection("users");
    const query = { userName: givenUserName };
    const options = {
      projection: { _id: 1 },
    };

    var io = req.app.get("socketio");
    var socketlist = req.app.get("socketlist");

    console.log(UsersToAdd);
    result = await createGroup(givenUserName);
    var user = await users.findOne(query, options);
    if (result == null) {
      res.sendStatus(400);
      return;
    }
    var users_added = [];
    users_added.push(user._id);
    for (x in UsersToAdd.users) {
      if (UsersToAdd.users[x] != givenUserName) {
        console.log(UsersToAdd.users[x]);
        return_status = await addUserToGroup(UsersToAdd.users[x], result);
        if (return_status == null) {
          console.error("failed to add user ", UsersToAdd.users[x]);
        } else {
          users_added.push(return_status);
        }
      }
    }
    console.log(users_added);
    for (x in users_added) {
      console.log("sent to ", users_added[x]);

      if (socketlist.get(users_added[x].toString())) {
        console.log(users_added[x]);
        console.log(socketlist);
        var socket = socketlist.get(users_added[x].toString());
        console.log(socket);
        console.log("adding user to ", result.toString());

        socket.join(result.toString());
      }
      io.to(users_added[x].toString()).emit("newGroup", users_added, result);
    }

    console.log(result);

    if (result != null) {
      res.status(200);
      res.send(result);
    } else {
      res.sendStatus(400);
    }
  }
);

router.get("/message/:groupId", async (req, res) => {
  const groupId = req.params.groupId;
  const userName = req.username;

  payload = await getMessages(groupId);
  if (payload == null) {
    res.sendStatus(401);
  } else {
    res.send(payload);
    res.status(200);
  }
});

router.get("/chatroom", authenticateToken, async (req, res) => {
  const userName = req.username;
  const groups = await getGroups(userName);
  if (groups == null) {
    res.sendStatus(400);
  } else {
    res.send(groups);
    res.status(200);
  }
});

async function getGroups(userName) {
  const database = client.db(process.env.DATABASE_NAME);
  const users = database.collection("users");
  console.log(userName);

  const options = {
    projection: { groups: 1 },
  };
  const query = { userName: userName };

  const user = await users.findOne(query, options);
  if (user == null) {
    return null;
  }
  return user.groups;
}

async function getMessages(groupIdToFind) {
  const database = client.db(process.env.DATABASE_NAME);
  console.log(process.env.DATABASE_NAME);
  const messages = database.collection("messages");

  const query = { groupId: new ObjectId(groupIdToFind) };
  console.log(groupIdToFind);
  const options = { sort: { dateSent: 1 } };
  const cursor = messages.find(query, options);
  console.log("checking if empty");

  if ((await messages.countDocuments(query)) === 0) {
    console.log("no messages in group found");
    return null;
  }
  payload = [];
  console.log("printing docs");
  for await (const doc of cursor) {
    payload.push(doc);
  }
  console.log("done");
  return payload;
}

async function createGroup(givenUserName) {
  const database = client.db(process.env.DATABASE_NAME);
  const groups = database.collection("groups");
  const users = database.collection("users");

  const query = { userName: givenUserName };
  console.log(givenUserName);
  const options = {
    projection: { username: 1, groups: 1 },
  };

  const user = await users.findOne(query, options);
  if (user != null) {
    const dt = new Date();
    const doc = {
      owner: user._id,
      dateCreated: dt,
      dateUpdated: dt,
      users: [user._id],
    };
    const result_group = await groups.insertOne(doc);
    insertedId = result_group.insertedId;
    const result_user = await users.updateOne(
      { _id: user._id },
      { $push: { groups: insertedId } }
    );
    console.log(insertedId.toString());
    return insertedId.toString();
  }
  return null;
}
async function addUserToGroup(userName, groupId) {
  const database = client.db(process.env.DATABASE_NAME);
  const groups = database.collection("groups");
  const users = database.collection("users");

  const query = { userName: userName };

  const options = {
    projection: { username: 1, groups: 1 },
  };

  const user = await users.findOne(query, options);

  if (user == null) {
    console.log("usernotfound");
    return null;
  }
  const result_user = await users.updateOne(
    { _id: user._id },
    { $push: { groups: new ObjectId(groupId) } }
  );

  const result_group = await groups.findOneAndUpdate(
    { _id: new ObjectId(groupId) },
    { $push: { users: new ObjectId(user._id) } },
    { $set: { dataUpdated: new Date() } }
  );
  console.log("added ", user._id, " to ", groupId);
  if (result_group == null) {
    console.error("failure to find group");
  }

  return user._id;
}

async function removeGroup(groupId, userName) {
  const database = client.db(process.env.DATABASE_NAME);
  const groups = database.collection("groups");
  const users = database.collection("users");

  const query = { userName: userName };

  const options = {
    projection: { username: 1, groups: 1, _id: 1 },
  };

  const user = await users.findOne(query, options);
  console.log(user);
  console.log(groupId);
  if (user == null) {
    console.log("usernotfound or group is not in users group list");
    return null;
  }

  const g_query = { _id: groupId };

  const g_options = {
    projection: { owner: 1, users: 1 },
  };

  const group = await groups.findOne(g_query, g_options);
  if (group == null) {
    return 404;
  }

  console.log(group);

  if (group.owner.toString() != user._id.toString()) {
    return 401;
  }
  console.log("attempting to delete group");
  await groups.findOneAndDelete(g_query, options);
  const remove_result = await users.findOneAndUpdate(
    { _id: user._id },
    { $pull: { groups: groupId } }
  );
  if (remove_result == null) {
    console.log("error removing group from user");
    return 500;
  }
  console.log(group);
  return group.users;
}
module.exports = router;
