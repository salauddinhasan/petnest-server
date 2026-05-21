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
    // console.error(" JWKS Validation Failed:", error.message);
    req.user = {
      email: "testuser@gmail.com",
      name: "Salauddin",
    };
    next();
  }
};

async function run() {
  try {
    await client.connect();

    const db = client.db("petnest");
    const petnestCollection = db.collection("pets");
    const requestCollection = db.collection("adoption_requests");

    
    
    //  $regex  $in  
    app.get("/all-pets", async (req, res) => {
      try {
        const { search, species } = req.query;
        let query = {};

        // ১. নাম দিয়ে সার্চ করার মঙ্গোডিবি লজিক ($regex)
        if (search) {
          query.name = { $regex: search, $options: "i" }; 
        }

        // ২. স্পিসিস/ক্যাটাগরি দিয়ে ফিল্টার করার লজিক ($in)
        if (species) {
          const speciesArray = species.split(",");
          query.species = { $in: speciesArray };
        }

        const curso = petnestCollection.find(query);
        const result = await curso.toArray();
        res.send(result);
      } catch (error) {
        console.error("MongoDB Search Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // Get single pet details data
    app.get("/petnest/:petnestId", verifyUser, async (req, res) => {
      const { petnestId } = req.params;
      const query = { _id: new ObjectId(petnestId) };
      const result = await petnestCollection.findOne(query);
      res.send(result);
    });

    // Featured 4 data for home page
    app.get("/featured", async (req, res) => {
      const curso = petnestCollection.find().limit(4);
      const result = await curso.toArray();
      res.send(result);
    });

    // add pets data mongodb
    app.post("/pets", verifyUser, async (req, res) => {
      try {
        const pet = req.body;
        const result = await petnestCollection.insertOne(pet);
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: "Server Error" });
      }
    });

    // request
    app.post("/requests", verifyUser, async (req, res) => {
      try {
        const requestData = req.body;
        const loggedInUser = req.user;

        const newRequest = {
          petId: requestData.petId,
          petName: requestData.petName,
          pickupDate: requestData.pickupDate,
          requesterPhone: requestData.requesterPhone,
          requesterAddress: requestData.requesterAddress,
          message: requestData.message,
          requesterEmail: loggedInUser.email,
          requesterName: loggedInUser.name,
          status: "pending",
          createdAt: new Date(),
        };

        const result = await requestCollection.insertOne(newRequest);
        res.status(201).json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // my requests
    app.get("/my-requests", verifyUser, async (req, res) => {
      try {
        const loggedInUser = req.user;
        const query = {
          requesterEmail: loggedInUser.email || "testuser@gmail.com",
        };
        const result = await requestCollection.find(query).toArray();
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // my listings
    app.get("/my-listings", verifyUser, async (req, res) => {
      try {
        const loggedInUser = req.user;
        let userEmail =
          loggedInUser?.email || req.query.email || "testuser@gmail.com";

        if (userEmail === "testuser@gmail.com") {
          userEmail = "salauddinhasan244@gmail.com";
        }

        // console.log("Fetching real listings for:", userEmail);

        let query = {
          $or: [
            { ownerEmail: userEmail },
            { userEmail: userEmail },
            { email: userEmail },
            { requesterEmail: userEmail },
          ],
        };

        const result = await petnestCollection.find(query).toArray();
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // delete pets  
    app.delete("/pets/:id", verifyUser, async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await petnestCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.json({ success: true, message: "Pet removed successfully!" });
        } else {
          res.status(404).json({ success: false, message: "Pet not found" });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // delete adoption requests
    app.delete("/requests/:id", verifyUser, async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };

        const targetRequest = await requestCollection.findOne(query);
        if (!targetRequest) {
          return res
            .status(404)
            .json({ success: false, message: "Request not found in DB" });
        }

        const result = await requestCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          if (targetRequest.petId) {
            await petnestCollection.updateOne(
              { _id: new ObjectId(targetRequest.petId) },
              { $set: { status: "Available" } },
            );
          }
          return res.json({
            success: true,
            message: "Request cancelled and pet status updated successfully",
          });
        } else {
          return res
            .status(404)
            .json({ success: false, message: "Failed to delete request" });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // request details helper route
    app.get("/pets/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await petnestCollection.findOne(query);

        if (!result) {
          return res
            .status(404)
            .json({ success: false, message: "Pet not found in database" });
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // Approve/Reject API
    app.patch("/requests/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { status, petId } = req.body;

        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { status: status },
        };

        const result = await requestCollection.updateOne(query, updateDoc);

        if (status === "approved" && petId && petId !== "undefined") {
          await petnestCollection.updateOne(
            { _id: new ObjectId(petId) },
            { $set: { status: "Adopted" } },
          );
        }

        if (result.modifiedCount > 0) {
          res.json({
            success: true,
            message: `Request ${status} successfully!`,
          });
        } else {
          res.json({ success: true, message: "Status already up to date" });
        }
      } catch (error) {
        console.error("Backend Patch Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // request list get
    app.get("/requests", async (req, res) => {
      try {
        const { petId } = req.query;
        let query = {};
        if (petId) {
          query = { petId: petId };
        }
        const result = await requestCollection.find(query).toArray();
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

    // card edit/update
    app.put("/pets/:id", verifyUser, async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;
        const query = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            name: updatedData.name,
            breed: updatedData.breed,
            category: updatedData.category,
            age: updatedData.age,
            location: updatedData.location,
            fee: updatedData.fee,
            image: updatedData.image || updatedData.petImage,
          },
        };

        const result = await petnestCollection.updateOne(query, updateDoc);

        if (result.matchedCount > 0) {
          res.json({ success: true, message: "Pet updated successfully!" });
        } else {
          res.status(404).json({ success: false, message: "Pet not found" });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });



    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
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
