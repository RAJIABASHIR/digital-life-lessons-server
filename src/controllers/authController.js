export const getMe = async (req, res) => {
  try {
    
    const safeUser = { ...(req.user || {}) };
    delete safeUser.firebaseUid;

    res.json(safeUser);
  } catch (err) {
    console.error("getMe error", err);
    res.status(500).json({ message: "Failed to get user info" });
  }
};