const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT || 5000;

const uri = process.env.MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const db = client.db("petnest");
    const petnestCollection = db.collection("pets");


    // all petnest data json 

    app.get("/petnest", async (req, res) => {
      const curso = petnestCollection.find();
      const result = await curso.toArray();

      res.send(result);
    });

    // only petnest data josn 

    app.get('/petnest/:petnestId', async(req, res) => {
      const {petnestId} = req.params
      const query = {_id: new ObjectId(petnestId) };
      const result = await petnestCollection.findOne(query);
      res.send(result);
    })


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
