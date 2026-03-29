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

// ─── DATABASE CONNECTION (FIXED) ─────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// ─── MODELS ──────────────────────────────────────────────────
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["student", "teacher", "admin"] },
  class: String,
  subject: String,
}));

const Attendance = mongoose.model("Attendance", new mongoose.Schema({
  studentId: String,
  studentName: String,
  class: String,
  date: String,
  status: { type: String, enum: ["present", "absent"] },
}));

const Marks = mongoose.model("Marks", new mongoose.Schema({
  studentId: String,
  studentName: String,
  class: String,
  subject: String,
  exam: String,
  marks: Number,
  totalMarks: Number,
}));

const Quiz = mongoose.model("Quiz", new mongoose.Schema({
  topic: String,
  class: String,
  createdBy: String,
  questions: Array,
  createdAt: { type: Date, default: Date.now },
}));

const QuizResult = mongoose.model("QuizResult", new mongoose.Schema({
  studentId: String,
  studentName: String,
  quizId: String,
  topic: String,
  score: Number,
  total: Number,
  submittedAt: { type: Date, default: Date.now },
}));

const Chapter = mongoose.model("Chapter", new mongoose.Schema({
  subject: String,
  class: String,
  chapterName: String,
  teacherName: String,
  completedAt: { type: Date, default: Date.now },
}));

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Login required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid/expired token" });
  }
}

// ─── SEED ROUTE ─────────────────────────────────────────────
app.get("/seed", async (req, res) => {
  try {
    await User.deleteMany();
    await Attendance.deleteMany();
    await Marks.deleteMany();

    const users = [
      { name: "Admin Sir", email: "admin@school.com", password: await bcrypt.hash("admin123", 10), role: "admin" },
      { name: "Rahul Kumar", email: "rahul@school.com", password: await bcrypt.hash("pass123", 10), role: "student", class: "10A" },
      { name: "Anjali Singh", email: "anjali@school.com", password: await bcrypt.hash("pass123", 10), role: "student", class: "10A" },
      { name: "Amit Sharma", email: "amit@school.com", password: await bcrypt.hash("pass123", 10), role: "student", class: "10B" },
      { name: "Mr. Sharma", email: "sharma@school.com", password: await bcrypt.hash("teacher123", 10), role: "teacher", subject: "Math", class: "10A" },
      { name: "Ms. Verma", email: "verma@school.com", password: await bcrypt.hash("teacher123", 10), role: "teacher", subject: "Science", class: "10B" },
    ];

    const saved = await User.insertMany(users);

    res.json({
      message: "✅ Demo data ready!",
      logins: [
        { role: "Admin", email: "admin@school.com", password: "admin123" },
        { role: "Student", email: "rahul@school.com", password: "pass123" },
        { role: "Teacher", email: "sharma@school.com", password: "teacher123" },
      ]
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Seed error" });
  }
});

// ─── LOGIN ROUTE (SAFE FIXED) ───────────────────────────────
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { id: user._id.toString(), name: user.name, role: user.role, class: user.class, subject: user.subject },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login success",
      token,
      user: { name: user.name, role: user.role, class: user.class, subject: user.subject }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── TEST ROUTE ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ Smart Classroom Backend Running!");
});

// ─── PORT FIX (IMPORTANT) ───────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
