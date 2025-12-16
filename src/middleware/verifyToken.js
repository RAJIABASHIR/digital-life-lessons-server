import admin from "../config/firebaseAdmin.js";
import { getDB } from "../config/db.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

   
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email, name, picture } = decoded;
    const firebaseUid = uid; 

    const db = getDB();

    
    let user = await db.collection("users").findOne({ firebaseUid });

    if (!user) {
      
      user = {
        firebaseUid,
        uid: firebaseUid, 
        email,
        name: name || (email ? email.split("@")[0] : "Anonymous"),
        photoURL: picture || "",
        role: "user",
        isPremium: false,
        totalLessons: 0,
        totalFavorites: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection("users").insertOne(user);
      user._id = result.insertedId;
    } else {
      
      const updates = {};

      
      if (!user.uid) {
        updates.uid = user.firebaseUid || firebaseUid;
      }

      if (name && name !== user.name) {
        updates.name = name;
      }
      if (picture && picture !== user.photoURL) {
        updates.photoURL = picture;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await db
          .collection("users")
          .updateOne({ _id: user._id }, { $set: updates });
        user = { ...user, ...updates };
      }
    }

    
    req.user = user;
    next();
  } catch (err) {
    console.error("verifyToken error", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};