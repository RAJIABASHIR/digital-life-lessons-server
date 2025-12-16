import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { getPaginationOptions, buildPaginationMeta } from "../utils/pagination.js";
import { successResponse } from "../utils/response.js";

export const getAdminStats = async (req, res, next) => {
  try {
    const db = getDB();

    const usersCol = db.collection("users");
    const lessonsCol = db.collection("lessons");
    const reportsCol = db.collection("reports");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      totalLessons,
      totalPublicLessons,
      totalReportedLessons,
      todaysNewLessons,
      mostActiveContributors
    ] = await Promise.all([
      usersCol.countDocuments(),
      lessonsCol.countDocuments(),
      lessonsCol.countDocuments({ visibility: "public" }),
      reportsCol.distinct("lessonId").then((ids) => ids.length),
      lessonsCol.countDocuments({ createdAt: { $gte: startOfToday } }),
      lessonsCol
        .aggregate([
          { $group: { _id: "$creatorId", totalLessons: { $sum: 1 } } },
          { $sort: { totalLessons: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "uid",
              as: "user"
            }
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: 0,
              uid: "$user.uid",
              displayName: "$user.displayName",
              photoURL: "$user.photoURL",
              totalLessons: 1
            }
          }
        ])
        .toArray()
    ]);

    return successResponse(res, {
      data: {
        totalUsers,
        totalLessons,
        totalPublicLessons,
        totalReportedLessons,
        todaysNewLessons,
        mostActiveContributors
      }
    });
  } catch (err) {
    next(err);
  }
};


export const getAdminUsers = async (req, res, next) => {
  try {
    const db = getDB();
    const usersCol = db.collection("users");

    const { page, limit, skip } = getPaginationOptions(req.query, 20, 100);

    const total = await usersCol.countDocuments();

    const users = await usersCol
      .aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "lessons",
            localField: "uid",
            foreignField: "creatorId",
            as: "lessons"
          }
        },
        {
          $addFields: {
            totalLessons: { $size: "$lessons" }
          }
        },
        {
          $project: {
            lessons: 0
          }
        }
      ])
      .toArray();

    const meta = buildPaginationMeta({ page, limit, total });

    return successResponse(res, {
      data: users,
      meta
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const db = getDB();
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      const error = new Error("Invalid role value");
      error.statusCode = 400;
      throw error;
    }

    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result.value) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return successResponse(res, {
      message: "User role updated",
      data: result.value
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminLessons = async (req, res, next) => {
  try {
    const db = getDB();
    const lessonsCol = db.collection("lessons");

    const { page, limit, skip } = getPaginationOptions(req.query, 20, 100);

    const filter = {};

    if (req.query.visibility) {
      filter.visibility = req.query.visibility; 
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.accessLevel) {
      filter.accessLevel = req.query.accessLevel; 
    }

    
    if (req.query.flagged === "true") {
      const reportedLessonIds = await db.collection("reports").distinct("lessonId");
      filter._id = { $in: reportedLessonIds.map((id) => new (id)) };
    }

    const total = await lessonsCol.countDocuments(filter);

    const lessons = await lessonsCol
      .aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "creatorId",
            foreignField: "uid",
            as: "creator"
          }
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            "creator.password": 0 
          }
        }
      ])
      .toArray();

    const meta = buildPaginationMeta({ page, limit, total });

    return successResponse(res, {
      data: lessons,
      meta
    });
  } catch (err) {
    next(err);
  }
};

export const updateLessonAdmin = async (req, res, next) => {
  try {
    const db = getDB();
    const { lessonId } = req.params;
    const { isFeatured, isReviewed } = req.body;

    const update = { updatedAt: new Date() };
    if (typeof isFeatured === "boolean") update.isFeatured = isFeatured;
    if (typeof isReviewed === "boolean") update.isReviewed = isReviewed;

    const result = await db.collection("lessons").findOneAndUpdate(
      { _id: new ObjectId(lessonId) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result.value) {
      const error = new Error("Lesson not found");
      error.statusCode = 404;
      throw error;
    }

    return successResponse(res, {
      message: "Lesson updated",
      data: result.value
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLessonAdmin = async (req, res, next) => {
  try {
    const db = getDB();
    const { lessonId } = req.params;

    let lessonObjectId;
    try {
      lessonObjectId = new ObjectId(lessonId);
    } catch {
      const error = new Error("Invalid lesson id");
      error.statusCode = 400;
      throw error;
    }

    const result = await db.collection("lessons").deleteOne({
      _id: lessonObjectId
    });

    if (result.deletedCount === 0) {
      const error = new Error("Lesson not found");
      error.statusCode = 404;
      throw error;
    }

    
    await Promise.all([
      db.collection("favorites").deleteMany({ lessonId: lessonObjectId }),
      db.collection("comments").deleteMany({ lessonId: lessonObjectId }),
      db.collection("reports").deleteMany({ lessonId: lessonObjectId })
    ]);

    return successResponse(res, {
      message: "Lesson deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};


export const getReportedLessons = async (req, res, next) => {
  try {
    const db = getDB();

    const reports = await db
      .collection("reports")
      .aggregate([
        {
          $group: {
            _id: "$lessonId",
            reportCount: { $sum: 1 },
            lastReportedAt: { $max: "$createdAt" }
          }
        },
        {
          $lookup: {
            from: "lessons",
            localField: "_id",
            foreignField: "_id",
            as: "lesson"
          }
        },
        { $unwind: "$lesson" },
        {
          $project: {
            _id: 0,
            lessonId: "$lesson._id",
            lessonTitle: "$lesson.title",
            reportCount: 1,
            lastReportedAt: 1
          }
        },
        { $sort: { reportCount: -1, lastReportedAt: -1 } }
      ])
      .toArray();

    return successResponse(res, {
      data: reports
    });
  } catch (err) {
    next(err);
  }
};


export const getLessonReports = async (req, res, next) => {
  try {
    const db = getDB();
    const { lessonId } = req.params;

    let lessonObjectId;
    try {
      lessonObjectId = new ObjectId(lessonId);
    } catch {
      const error = new Error("Invalid lesson id");
      error.statusCode = 400;
      throw error;
    }

    const [lesson, reports] = await Promise.all([
      db
        .collection("lessons")
        .findOne({ _id: lessonObjectId }, { projection: { _id: 1, title: 1 } }),
      db
        .collection("reports")
        .find({ lessonId: lessonObjectId })
        .sort({ createdAt: -1 })
        .toArray()
    ]);

    return successResponse(res, {
      data: { lesson, reports }
    });
  } catch (err) {
    next(err);
  }
};


export const resolveLessonReports = async (req, res, next) => {
  try {
    const db = getDB();
    const { lessonId } = req.params;
    const { status = "ignored" } = req.body || {};

    let lessonObjectId;
    try {
      lessonObjectId = new ObjectId(lessonId);
    } catch {
      const error = new Error("Invalid lesson id");
      error.statusCode = 400;
      throw error;
    }

    const result = await db.collection("reports").updateMany(
      { lessonId: lessonObjectId, resolved: false },
      {
        $set: {
          resolved: true,
          status,
          handledBy: req.user.uid,
          handledAt: new Date()
        }
      }
    );

    return successResponse(res, {
      message: "Reports resolved",
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminProfile = async (req, res, next) => {
  try {
    const db = getDB();

    const user = await db.collection("users").findOne({ uid: req.user.uid });
    if (!user) {
      const error = new Error("Admin user not found");
      error.statusCode = 404;
      throw error;
    }

    const [moderatedLessons, totalActions] = await Promise.all([
      db.collection("reports").distinct("lessonId", { handledBy: req.user.uid }),
      db.collection("reports").countDocuments({ handledBy: req.user.uid })
    ]);

    return successResponse(res, {
      data: {
        profile: user,
        moderation: {
          moderatedLessons: moderatedLessons.length,
          totalActions
        }
      }
    });
  } catch (err) {
    next(err);
  }
};