import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(process.cwd(), "firebase-service-account.json");

  const serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized from file", filePath);
}

export default admin;