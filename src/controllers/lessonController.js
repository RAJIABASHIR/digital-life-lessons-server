import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";


const pickLessonFields = body => {
  const {
    title,
    description,
    category,
    emotionalTone,
    imageUrl,
    visibility,
    accessLevel
  } = body;
  const update = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (category !== undefined) update.category = category;
  if (emotionalTone !== undefined) update.emotionalTone = emotionalTone;
  if (imageUrl !== undefined) update.imageUrl = imageUrl;
  if (visibility !== undefined) update.visibility = visibility;
  if (accessLevel !== undefined) update.accessLevel = accessLevel;
  return update;
};


export const createLesson = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");
    const usersCol = db.collection("users");

    const user = req.user;
    const {
      title,
      description,
      category,
      emotionalTone,
      imageUrl,
      visibility = "public",
      accessLevel = "free"
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    if (accessLevel === "premium" && !user.isPremium) {
      return res
        .status(403)
        .json({ message: "Upgrade to Premium to create premium lessons" });
    }

    const lessonDoc = {
      title,
      description,
      category,
      emotionalTone,
      imageUrl: imageUrl || "",
      visibility,
      accessLevel,
      creatorId: user.uid,
      creatorName: user.displayName || user.name || user.email,
      creatorPhoto: user.photoURL || "",
      likes: [],
      likesCount: 0,
      favoritesCount: 0,
      reportsCount: 0,
      isFeatured: false,
      isReviewed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await lessonsCol.insertOne(lessonDoc);
    const createdLesson = { ...lessonDoc, _id: result.insertedId };

   
    await usersCol.updateOne(
      { uid: user.uid },
      { $inc: { totalLessons: 1 }, $set: { updatedAt: new Date() } }
    );

    res.status(201).json(createdLesson);
  } catch (err) {
    console.error("createLesson error", err);
    res.status(500).json({ message: "Failed to create lesson" });
  }
};


export const getPublicLessons = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const {
      category,
      emotionalTone,
      search,
      sort = "newest",
      page = 1,
      limit = 9
    } = req.query;

    const query = { visibility: "public" };

    if (category) query.category = category;
    if (emotionalTone) query.emotionalTone = emotionalTone;
    if (search) query.title = { $regex: search, $options: "i" };

    let sortOption = { createdAt: -1 };
    if (sort === "mostSaved") {
      sortOption = { favoritesCount: -1, createdAt: -1 };
    }

    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 9;
    const skip = (pageInt - 1) * limitInt;

    const [lessons, total] = await Promise.all([
      lessonsCol
        .find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitInt)
        .toArray(),
      lessonsCol.countDocuments(query)
    ]);

    res.json({
      data: lessons,
      total,
      page: pageInt,
      pages: Math.ceil(total / limitInt)
    });
  } catch (err) {
    console.error("getPublicLessons error", err);
    res.status(500).json({ message: "Failed to fetch lessons" });
  }
};


export const getLessonById = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const { id } = req.params;
    let lessonId;
    try {
      lessonId = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    const lesson = await lessonsCol.findOne({ _id: lessonId });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const user = req.user;
    const isOwner = user ? lesson.creatorId === user.uid : false;

    res.json({ lesson, isOwner });
  } catch (err) {
    console.error("getLessonById error", err);
    res.status(500).json({ message: "Failed to fetch lesson" });
  }
};


export const getMyLessons = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const lessons = await lessonsCol
      .find({ creatorId: req.user.uid })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(lessons);
  } catch (err) {
    console.error("getMyLessons error", err);
    res.status(500).json({ message: "Failed to fetch user lessons" });
  }
};


export const updateLesson = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const { id } = req.params;
    let lessonId;
    try {
      lessonId = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    const lesson = await lessonsCol.findOne({ _id: lessonId });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const isOwner = lesson.creatorId === req.user.uid;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only owner or admin can update" });
    }

    const bodyUpdate = pickLessonFields(req.body);

    if (
      bodyUpdate.accessLevel === "premium" &&
      !req.user.isPremium &&
      !isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Premium subscription required to set premium access" });
    }

    const updateDoc = {
      ...bodyUpdate,
      updatedAt: new Date()
    };

    await lessonsCol.updateOne({ _id: lessonId }, { $set: updateDoc });
    const updated = await lessonsCol.findOne({ _id: lessonId });

    res.json(updated);
  } catch (err) {
    console.error("updateLesson error", err);
    res.status(500).json({ message: "Failed to update lesson" });
  }
};


export const deleteLesson = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");
    const favoritesCol = db.collection("favorites");
    const reportsCol = db.collection("reports");

    const { id } = req.params;
    let lessonId;
    try {
      lessonId = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    const lesson = await lessonsCol.findOne({ _id: lessonId });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const isOwner = lesson.creatorId === req.user.uid;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only owner or admin can delete" });
    }

    await favoritesCol.deleteMany({ lessonId });
    await reportsCol.deleteMany({ lessonId });
    await lessonsCol.deleteOne({ _id: lessonId });

    res.json({ message: "Lesson deleted successfully" });
  } catch (err) {
    console.error("deleteLesson error", err);
    res.status(500).json({ message: "Failed to delete lesson" });
  }
};


export const toggleLike = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const userId = req.user.uid;
    const { id } = req.params;

    let lessonId;
    try {
      lessonId = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    const lesson = await lessonsCol.findOne({ _id: lessonId });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const likes = lesson.likes || [];
    const hasLiked = likes.includes(userId);

    if (hasLiked) {
      await lessonsCol.updateOne(
        { _id: lessonId },
        {
          $pull: { likes: userId },
          $inc: { likesCount: -1 }
        }
      );
    } else {
      await lessonsCol.updateOne(
        { _id: lessonId },
        {
          $addToSet: { likes: userId },
          $inc: { likesCount: 1 }
        }
      );
    }

    const updated = await lessonsCol.findOne(
      { _id: lessonId },
      { projection: { likesCount: 1 } }
    );

    res.json({
      liked: !hasLiked,
      likesCount: updated?.likesCount || 0
    });
  } catch (err) {
    console.error("toggleLike error", err);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};


export const reportLesson = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");
    const reportsCol = db.collection("reports");

    const { reason } = req.body;
    const { id } = req.params;

    if (!reason) {
      return res.status(400).json({ message: "Report reason is required" });
    }

    let lessonId;
    try {
      lessonId = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    const lesson = await lessonsCol.findOne({ _id: lessonId });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    await reportsCol.insertOne({
      lessonId,
      reporterId: req.user.uid,
      reporterEmail: req.user.email,
      reason,
      createdAt: new Date(),
      resolved: false
    });

    await lessonsCol.updateOne(
      { _id: lessonId },
      { $inc: { reportsCount: 1 } }
    );

    res.status(201).json({ message: "Report submitted" });
  } catch (err) {
    console.error("reportLesson error", err);
    res.status(500).json({ message: "Failed to report lesson" });
  }
};


export const getFeaturedLessons = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const lessons = await lessonsCol
      .find({ visibility: "public", isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.json(lessons);
  } catch (err) {
    console.error("getFeaturedLessons error", err);
    res.status(500).json({ message: "Failed to fetch featured lessons" });
  }
};


export const getTopContributors = async (req, res) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const contributors = await lessonsCol
      .aggregate([
        {
          $group: {
            _id: "$creatorId",
            totalLessons: { $sum: 1 },
            creatorName: { $first: "$creatorName" },
            creatorPhoto: { $first: "$creatorPhoto" }
          }
        },
        { $sort: { totalLessons: -1 } },
        { $limit: 5 }
      ])
      .toArray();

    res.json(
      contributors.map(c => ({
        uid: c._id,
        name: c.creatorName,
        photoURL: c.creatorPhoto,
        totalLessons: c.totalLessons
      }))
    );
  } catch (err) {
    console.error("getTopContributors error", err);
    res.status(500).json({ message: "Failed to fetch top contributors" });
  }
};
