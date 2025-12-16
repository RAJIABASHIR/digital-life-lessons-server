import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not defined in .env");
}

let client;
let db;


export async function connectDB() {
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      }
    });

    //await client.connect();
    db = client.db("digital-life-lessons");

    console.log("✅ Connected to MongoDB");

    
    await db.collection("users").createIndex({ firebaseUid: 1 }, { unique: true });
    await db.collection("users").createIndex({ email: 1 });
    await db.collection("lessons").createIndex({ "creator._id": 1 });
    await db.collection("lessons").createIndex({ visibility: 1 });
    await db.collection("lessons").createIndex({ category: 1 });
    await db.collection("lessons").createIndex({ emotionalTone: 1 });
    await db.collection("lessons").createIndex({ isFeatured: 1 });
    await db.collection("favorites").createIndex({ userId: 1 });
    await db.collection("favorites").createIndex({ lessonId: 1 });
    await db.collection("favorites").createIndex(
      { userId: 1, lessonId: 1 },
      { unique: true }
    );
    await db.collection("reports").createIndex({ lessonId: 1 });

    console.log("✅ MongoDB indexes ensured");
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
    process.exit(1);
  }
}


export function getDB() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
}