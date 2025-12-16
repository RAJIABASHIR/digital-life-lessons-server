import { getDB } from "../config/db.js";


export const updateProfileStats = async (req, res) => {
  try {
    const db = getDB();
    const usersCol = db.collection("users");
    const lessonsCol = db.collection("lessons");
    const favoritesCol = db.collection("favorites");

    const uid = req.user.uid;

    const [totalLessons, totalFavorites] = await Promise.all([
      lessonsCol.countDocuments({ creatorId: uid }),
      favoritesCol.countDocuments({ userId: uid }),
    ]);

    const result = await usersCol.findOneAndUpdate(
      { uid },
      {
        $setOnInsert: {
          uid,
          email: req.user.email ?? null,
          
          displayName: req.user.name ?? req.user.displayName ?? null,
          photoURL: req.user.picture ?? req.user.photoURL ?? null,
          role: "1",
          isPremium: false,
          createdAt: new Date(),
        },
        $set: {
          totalLessons,
          totalFavorites,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        projection: {
          _id: 1,
          uid: 1,
          email: 1,
          displayName: 1,
          photoURL: 1,
          role: 1,
          isPremium: 1,
          totalLessons: 1,
          totalFavorites: 1,
        },
      }
    );

    return res.json(result.value);
  } catch (err) {
    console.error("getMeWithStats error", err);
    return res.status(500).json({ message: "Failed to load user" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const db = getDB();
    const usersCol = db.collection("users");

    const uid = req.user.uid;
    const { displayName, photoURL } = req.body;

    const update = {};
    if (displayName !== undefined) update.displayName = displayName;
    if (photoURL !== undefined) update.photoURL = photoURL;

    const result = await usersCol.findOneAndUpdate(
      { uid },
      {
        $setOnInsert: {
          uid,
          email: req.user.email ?? null,
          role: "user",
          isPremium: false,
          createdAt: new Date(),
        },
        $set: {
          ...update,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        projection: {
          _id: 1,
          uid: 1,
          email: 1,
          displayName: 1,
          photoURL: 1,
          role: 1,
          isPremium: 1,
          totalLessons: 1,
          totalFavorites: 1,
        },
      }
    );

    return res.json(result.value);
  } catch (err) {
    console.error("updateProfile error", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};