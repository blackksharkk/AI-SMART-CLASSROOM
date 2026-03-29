const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const JWT_SECRET = "smartclassroom_secret_2024";

// ✅ DB CONNECT (IMPORTANT FIX)
if (!process.env.MONGO_URI) {
  console.log("❌ MONGO_URI missing in environment variables");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.log("❌ DB Error:", err.message);
    process.exit(1); // crash to show error clearly
  });

// ─── MODELS ──────────────────────────────────────────────────
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["student", "teacher", "admin"] },
  class: String,
  subject: String,
}));

// ─── LOGIN ROUTE ─────────────────────────────────────────────
app.post("/login", async (req, res) => {
  try {
    console.log("📩 Login request:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found");
      return res.status(400).json({ error: "Email not found" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log("❌ Wrong password");
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        class: user.class,
        subject: user.subject
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login success",
      token,
      user: {
        name: user.name,
        role: user.role,
        class: user.class,
        subject: user.subject
      }
    });

  } catch (err) {
    console.error("❌ Login Error FULL:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── SEED ROUTE ─────────────────────────────────────────────
app.get("/seed", async (req, res) => {
  try {
    await User.deleteMany();

    const users = [
      { name: "Admin Sir", email: "admin@school.com", password: await bcrypt.hash("admin123", 10), role: "admin" },
      { name: "Rahul Kumar", email: "rahul@school.com", password: await bcrypt.hash("pass123", 10), role: "student", class: "10A" },
      { name: "Mr. Sharma", email: "sharma@school.com", password: await bcrypt.hash("teacher123", 10), role: "teacher", subject: "Math", class: "10A" },
    ];

    await User.insertMany(users);

    res.json({ message: "✅ Seed done" });

  } catch (err) {
    console.log("❌ Seed error:", err);
    res.status(500).json({ error: "Seed error" });
  }
});

// ─── TEST ───────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ Backend Running");
});

// ─── START ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
