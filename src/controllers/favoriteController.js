import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
export const toggleFavorite = async (req, res) => {
  try {
    const db = getDB();
    const favoritesCol = db.collection("favorites");
    const lessonsCol = db.collection("lessons");
    const usersCol = db.collection("users");

    const userId = req.user.uid;

    const lessonIdRaw = req.body.lessonId || req.params.lessonId;
    if (!lessonIdRaw) {
      return res.status(400).json({ message: "lessonId is required" });
    }

    let lessonObjectId;
    try {
      lessonObjectId = new ObjectId(lessonIdRaw);
    } catch {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    const lesson = await lessonsCol.findOne({ _id: lessonObjectId });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const existing = await favoritesCol.findOne({
      userId,
      lessonId: lessonObjectId,
    });

    let favorited = false;

    if (existing) {
      
      await favoritesCol.deleteOne({ _id: existing._id });

      await lessonsCol.updateOne(
        { _id: lessonObjectId },
        { $inc: { favoritesCount: -1 } }
      );

      
      await usersCol.updateOne(
        { uid: userId },
        { $inc: { totalFavorites: -1 }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );
    } else {
      
      await favoritesCol.insertOne({
        userId,
        lessonId: lessonObjectId,
        createdAt: new Date(),
      });

      favorited = true;

      await lessonsCol.updateOne(
        { _id: lessonObjectId },
        { $inc: { favoritesCount: 1 } }
      );

      
      await usersCol.updateOne(
        { uid: userId },
        { $inc: { totalFavorites: 1 }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );
    }

    const updatedLesson = await lessonsCol.findOne(
      { _id: lessonObjectId },
      { projection: { favoritesCount: 1 } }
    );

    res.json({
      favorited,
      favoritesCount: updatedLesson?.favoritesCount || 0,
    });
  } catch (err) {
    console.error("toggleFavorite error", err);
    res.status(500).json({ message: "Failed to toggle favorite" });
  }
};

export const getMyFavorites = async (req, res) => {
  try {
    const db = getDB();
    const favoritesCol = db.collection("favorites");
    const userId = req.user.uid;

    const favorites = await favoritesCol
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: "lessons",
            localField: "lessonId",
            foreignField: "_id",
            as: "lesson",
          },
        },
        { $unwind: "$lesson" },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    res.json(
      favorites.map((f) => ({
        _id: f._id,
        lesson: f.lesson,
      }))
    );
  } catch (err) {
    console.error("getMyFavorites error", err);
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
};

