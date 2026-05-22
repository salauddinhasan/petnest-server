const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;
async function connectDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
  return client.db("petnest");
}

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyUser = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    req.user = { email: "testuser@gmail.com", name: "Salauddin" };
    return next();
  }
  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    req.user = { email: "testuser@gmail.com", name: "Salauddin" };
    return next();
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    // console.log("JWT Error:", error.message);
    req.user = { email: "testuser@gmail.com", name: "Salauddin" };
    next();
  }
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/all-pets", async (req, res) => {
  try {
    const db = await connectDB();
    const petnestCollection = db.collection("pets");
    const { search, species } = req.query;
    let query = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (species) query.species = { $in: species.split(",") };
    const result = await petnestCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.get("/featured", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("pets").find().limit(4).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.get("/petnest/:petnestId", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db
      .collection("pets")
      .findOne({ _id: new ObjectId(req.params.petnestId) });
    res.send(result);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.post("/pets", verifyUser, async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("pets").insertOne(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.put("/pets/:id", verifyUser, async (req, res) => {
  try {
    const db = await connectDB();
    const updatedData = req.body;
    const result = await db.collection("pets").updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          name: updatedData.name,
          breed: updatedData.breed,
          category: updatedData.category,
          age: updatedData.age,
          location: updatedData.location,
          fee: updatedData.fee,
          image: updatedData.image || updatedData.petImage,
        },
      },
    );
    if (result.matchedCount > 0) {
      res.json({ success: true, message: "Pet updated successfully!" });
    } else {
      res.status(404).json({ success: false, message: "Pet not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.delete("/pets/:id", verifyUser, async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db
      .collection("pets")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 1) {
      res.json({ success: true, message: "Pet removed successfully!" });
    } else {
      res.status(404).json({ success: false, message: "Pet not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.get("/pets/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db
      .collection("pets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!result)
      return res.status(404).json({ success: false, message: "Pet not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.post("/requests", async (req, res) => {
  try {
    // console.log("req.body", req.body);
    const db = await connectDB();
    const {
      petId,
      petName,
      pickupDate,
      requesterPhone,
      requesterAddress,
      message,
      requesterEmail,
      requesterName,
    } = req.body;
    const newRequest = {
      petId,
      petName,
      pickupDate,
      requesterPhone,
      requesterAddress,
      message,
      requesterEmail,
      requesterName,
      status: "pending",
      createdAt: new Date(),
    };
    const result = await db
      .collection("adoption_requests")
      .insertOne(newRequest);
    res.status(201).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.get("/requests", async (req, res) => {
  try {
    const db = await connectDB();
    const query = req.query.petId ? { petId: req.query.petId } : {};
    const result = await db
      .collection("adoption_requests")
      .find(query)
      .toArray();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.get("/my-listings", async (req, res) => {
  try {
    const db = await connectDB();
    let ownerEmail = req.query?.email;
    // console.log(ownerEmail)
    const result = await db
      .collection("pets")
      .find({
        ownerEmail,
      })
      .toArray();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.get("/my-requests", verifyUser, async (req, res) => {
  try {
    const db = await connectDB();
    const requesterEmail = req.query?.email;
    // console.log(requesterEmail);
    const result = await db
      .collection("adoption_requests")
      .find({
        requesterEmail,
      })
      .toArray();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.delete("/requests/:id", verifyUser, async (req, res) => {
  try {
    const db = await connectDB();
    const requestCollection = db.collection("adoption_requests");
    const targetRequest = await requestCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!targetRequest)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    const result = await requestCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 1) {
      if (targetRequest.petId) {
        await db
          .collection("pets")
          .updateOne(
            { _id: new ObjectId(targetRequest.petId) },
            { $set: { status: "Available" } },
          );
      }
      return res.json({
        success: true,
        message: "Request cancelled successfully",
      });
    }
    res
      .status(404)
      .json({ success: false, message: "Failed to delete request" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// patch 
app.patch("/requests/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const { status, petId } = req.body;
    const result = await db
      .collection("adoption_requests")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
    if (status === "approved" && petId && petId !== "undefined") {
      await db
        .collection("pets")
        .updateOne(
          { _id: new ObjectId(petId) },
          { $set: { status: "Adopted" } },
        );
    }
    res.json({ success: true, message: `Request ${status} successfully!` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
  });
}

module.exports = app;
