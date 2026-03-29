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

// ✅ DB CONNECT
if (!process.env.MONGO_URI) {
  console.log("❌ MONGO_URI missing in environment variables");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.log("❌ DB Error:", err.message);
    process.exit(1);
  });

// ─── MODELS ─────────────────────
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["student", "teacher", "admin"] },
  class: String,
  subject: String,
}));

// ─── LOGIN ─────────────────────
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      JWT_SECRET
    );

    res.json({
      message: "Login success",
      token,
      user
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── SEED ─────────────────────
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
    res.status(500).json({ error: "Seed error" });
  }
});

// ─── ✅ FIX: ATTENDANCE ─────────────────────
app.get("/attendance", (req, res) => {
  res.json([
    { date: "2026-03-01", status: "present" },
    { date: "2026-03-02", status: "absent" }
  ]);
});

// ─── ✅ FIX: MARKS ─────────────────────
app.get("/marks", (req, res) => {
  res.json([
    { subject: "Math", marks: 85 },
    { subject: "Science", marks: 90 }
  ]);
});

// ─── ✅ FIX: QUIZ HISTORY ─────────────────────
app.get("/quiz", (req, res) => {
  res.json([
    { topic: "OS", score: 8 },
    { topic: "DBMS", score: 7 }
  ]);
});

// ─── ✅ FIX: GENERATE QUIZ ─────────────────────
app.post("/generate-quiz", (req, res) => {
  const { topic } = req.body;

  res.json({
    quiz: [
      {
        question: `What is ${topic}?`,
        options: ["A", "B", "C", "D"],
        answer: "A"
      },
      {
        question: `Explain ${topic}`,
        options: ["A", "B", "C", "D"],
        answer: "B"
      }
    ]
  });
});

// ─── TEST ─────────────────────
app.get("/", (req, res) => {
  res.send("✅ Backend Running");
});

// ─── START ─────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
