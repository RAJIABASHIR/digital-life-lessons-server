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
          role: "user",
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

export const getUserRole = async (req, res) => {
  try {
    const db = getDB();
    const usersCol = db.collection("users");

    const email = req.params.email;
    if (req.user.email !== email && req.user.role !== 'admin') {

      return res.status(403).json({ message: "Forbidden access" });
    }

    const user = await usersCol.findOne({ email });
   

    if (user) {
      res.send({ role: user.role });
    } else {
   
      res.status(404).send({ message: "User not found" });
    }
  } catch (err) {
    console.error("getUserRole error", err);
    res.status(500).send({ message: "Failed to get user role" });
  }
}

export const getDashboardStats = async (req, res) => {
  try {
    const db = getDB();
    const usersCol = db.collection("users");
    const lessonsCol = db.collection("lessons");

    const uid = req.user.uid;

    
    const [totalLessons, totalFavorites] = await Promise.all([
      lessonsCol.countDocuments({ creatorId: uid }),
      db.collection("favorites").countDocuments({ userId: uid }),
    ]);


    const recentLessons = await lessonsCol
      .find({ creatorId: uid })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ title: 1, createdAt: 1, wordCount: 1 }) 
      .toArray();



    res.json({
      totalLessons,
      totalFavorites,
      recentLessons
    });
  } catch (err) {
    console.error("getDashboardStats error", err);
    res.status(500).json({ message: "Failed to load dashboard stats" });
  }
};