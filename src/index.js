
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();
const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "https://digital-life-lessons-client.netlify.app";
//"http://localhost:5173"
console.log("CORS allowing origin:", CLIENT_URL);

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);





app.use("/webhooks/stripe", bodyParser.raw({ type: "application/json" }));


app.use(express.json());


connectDB();


app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Root of Digital Life Lessons API" });
});

app.get("/api", (req, res) => {
  res.json("Root of Digital Life Lessons API" );
});


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/webhooks/stripe", webhookRoutes);


app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


app.use(errorHandler);


const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

