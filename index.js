const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const { auth } = require("./auth");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const verifyUser = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  // console.log("Token", authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized: No Token Provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid Token Format" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    // console.log("Verified User Payload:", payload);
    req.user = payload;

    next();
  } catch (error) {
    console.error("Token validation failed:", error.message);
    return res
      .status(403)
      .json({ message: "Forbidden: Invalid or Expired Token" });
  }
};
async function run() {
  try {
    await client.connect();

    const db = client.db("petnest");
    const petnestCollection = db.collection("pets");

    // all petnest data json

    app.get("/petnest", async (req, res) => {
      const curso = petnestCollection.find();
      const result = await curso.toArray();

      res.send(result);
    });

    // only petnest data josn
    app.get("/petnest/:petnestId", verifyUser, async (req, res) => {
      const { petnestId } = req.params;
      const query = { _id: new ObjectId(petnestId) };
      const result = await petnestCollection.findOne(query);
      res.send(result);
    });

    // home pae 4 data ar jonno
    app.get("/featured", async (req, res) => {
      const curso = petnestCollection.find().limit(4);
      const result = await curso.toArray();

      res.send(result);
    });

    
    // mongodb te data add
    app.post("/pets", async (req, res) => {
      try {
        const pet = req.body;
        const result = await petnestCollection.insertOne(pet);
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: "Server Error" });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
