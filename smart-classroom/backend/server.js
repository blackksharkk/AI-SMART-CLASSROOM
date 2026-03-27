const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "smartclassroom_secret_2024";

// ─── DATABASE CONNECTION ───────────────────────────────────────────────────────
mongoose.connect("mongodb://mongo:27017/smartclass")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// ─── MODELS ───────────────────────────────────────────────────────────────────

const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["student", "teacher", "admin"] },
  class: String,    // students ke liye (e.g. "10A")
  subject: String,  // teachers ke liye (e.g. "Math")
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

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────

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

// ─── SEED DEMO DATA ────────────────────────────────────────────────────────────
// Visit: http://localhost:5001/seed  (sirf pehli baar)

app.get("/seed", async (req, res) => {
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
  const students = saved.filter(u => u.role === "student");

  // Demo attendance
  const dates = ["2024-03-01", "2024-03-02", "2024-03-03", "2024-03-04", "2024-03-05"];
  const attendanceRecords = [];
  for (const student of students) {
    for (const date of dates) {
      attendanceRecords.push({
        studentId: student._id.toString(),
        studentName: student.name,
        class: student.class,
        date,
        status: Math.random() > 0.3 ? "present" : "absent",
      });
    }
  }
  await Attendance.insertMany(attendanceRecords);

  // Demo marks
  const marksData = [];
  const exams = ["Unit Test 1", "Midterm"];
  const subjects = ["Math", "Science", "English"];
  for (const student of students) {
    for (const exam of exams) {
      for (const subject of subjects) {
        marksData.push({
          studentId: student._id.toString(),
          studentName: student.name,
          class: student.class,
          subject, exam,
          marks: Math.floor(Math.random() * 40) + 60,
          totalMarks: 100,
        });
      }
    }
  }
  await Marks.insertMany(marksData);

  res.json({
    message: "✅ Demo data ready!",
    logins: [
      { role: "Admin", email: "admin@school.com", password: "admin123" },
      { role: "Student", email: "rahul@school.com", password: "pass123" },
      { role: "Teacher", email: "sharma@school.com", password: "teacher123" },
    ]
  });
});

// ─── AUTH ROUTES ───────────────────────────────────────────────────────────────

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Email not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign(
    { id: user._id.toString(), name: user.name, role: user.role, class: user.class, subject: user.subject },
    JWT_SECRET, { expiresIn: "7d" }
  );
  res.json({ token, user: { name: user.name, role: user.role, class: user.class, subject: user.subject } });
});

// ─── STUDENT ROUTES ────────────────────────────────────────────────────────────

app.get("/my-attendance", auth, async (req, res) => {
  const records = await Attendance.find({ studentId: req.user.id }).sort({ date: -1 });
  const total = records.length;
  const present = records.filter(r => r.status === "present").length;
  res.json({ records, total, present, percentage: total ? Math.round((present / total) * 100) : 0 });
});

app.get("/my-marks", auth, async (req, res) => {
  const marks = await Marks.find({ studentId: req.user.id }).sort({ exam: 1 });
  res.json(marks);
});

app.get("/my-quiz-results", auth, async (req, res) => {
  const results = await QuizResult.find({ studentId: req.user.id }).sort({ submittedAt: -1 }).limit(10);
  res.json(results);
});

app.get("/latest-quiz", auth, async (req, res) => {
  const quiz = await Quiz.findOne({ class: req.user.class }).sort({ createdAt: -1 });
  if (!quiz) return res.json(null);

  // Check if student already attempted
  const attempted = await QuizResult.findOne({ studentId: req.user.id, quizId: quiz._id.toString() });
  res.json({ quiz, attempted: !!attempted });
});

app.post("/submit-quiz", auth, async (req, res) => {
  const { quizId, answers } = req.body;
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const alreadyDone = await QuizResult.findOne({ studentId: req.user.id, quizId });
  if (alreadyDone) return res.status(400).json({ error: "Already submitted!" });

  let score = 0;
  quiz.questions.forEach((q, i) => {
    if (answers[i] === q.answer) score++;
  });

  await QuizResult.create({
    studentId: req.user.id,
    studentName: req.user.name,
    quizId: quizId.toString(),
    topic: quiz.topic,
    score,
    total: quiz.questions.length,
  });

  res.json({ score, total: quiz.questions.length });
});

// ─── TEACHER ROUTES ────────────────────────────────────────────────────────────

app.get("/class-students", auth, async (req, res) => {
  const cls = req.query.class || req.user.class;
  const students = await User.find({ role: "student", class: cls }, { password: 0 });
  res.json(students);
});

app.post("/mark-attendance", auth, async (req, res) => {
  const { records, date, class: cls } = req.body;
  await Attendance.deleteMany({ date, class: cls });
  await Attendance.insertMany(records);
  res.json({ message: "Attendance saved!" });
});

app.post("/add-marks", auth, async (req, res) => {
  const mark = await Marks.create(req.body);
  res.json({ message: "Marks saved!", mark });
});

app.get("/class-quiz-results/:quizId", auth, async (req, res) => {
  const results = await QuizResult.find({ quizId: req.params.quizId }).sort({ score: -1 });
  res.json(results);
});

app.post("/complete-chapter", auth, async (req, res) => {
  const { chapterName, subject, class: cls } = req.body;
  await Chapter.create({ chapterName, subject, class: cls, teacherName: req.user.name });
  res.json({ message: "Chapter marked complete!" });
});

// AI Quiz generation using Gemini (FREE)
app.post("/generate-quiz", auth, async (req, res) => {
  const { topic, class: cls } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  let questions;

  if (GEMINI_KEY) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate exactly 5 multiple choice quiz questions about "${topic}" for high school students. Return ONLY a valid JSON array. No extra text, no markdown. Format: [{"question":"...","options":["A. text","B. text","C. text","D. text"],"answer":"A. text"}]` }] }]
        })
      });
      const data = await r.json();
      const raw = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
      questions = JSON.parse(raw);
    } catch (e) {
      console.log("Gemini failed, using fallback:", e.message);
      questions = fallbackQuestions(topic);
    }
  } else {
    questions = fallbackQuestions(topic);
  }

  const quiz = await Quiz.create({ topic, class: cls, createdBy: req.user.name, questions });
  res.json({ quiz, message: GEMINI_KEY ? "AI quiz ready!" : "Quiz ready (add GEMINI_API_KEY for AI)" });
});

function fallbackQuestions(topic) {
  return [
    { question: `What is the main concept of ${topic}?`, options: ["A. Definition A", "B. Definition B", "C. Definition C", "D. Definition D"], answer: "A. Definition A" },
    { question: `Which is an example of ${topic}?`, options: ["A. Example A", "B. Example B", "C. Example C", "D. Example D"], answer: "B. Example B" },
    { question: `${topic} is related to which field?`, options: ["A. Field A", "B. Field B", "C. Field C", "D. Field D"], answer: "A. Field A" },
    { question: `What is a key property of ${topic}?`, options: ["A. Property A", "B. Property B", "C. Property C", "D. Property D"], answer: "C. Property C" },
    { question: `Where is ${topic} used?`, options: ["A. Use A", "B. Use B", "C. Use C", "D. Use D"], answer: "D. Use D" },
  ];
}

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────────────

app.get("/admin/stats", auth, async (req, res) => {
  const totalStudents = await User.countDocuments({ role: "student" });
  const totalTeachers = await User.countDocuments({ role: "teacher" });
  const totalChapters = await Chapter.countDocuments();
  const recentQuizzes = await Quiz.find().sort({ createdAt: -1 }).limit(5);
  const recentResults = await QuizResult.find().sort({ submittedAt: -1 }).limit(8);
  res.json({ totalStudents, totalTeachers, totalChapters, recentQuizzes, recentResults });
});

app.get("/admin/attendance-report", auth, async (req, res) => {
  const students = await User.find({ role: "student" }, { password: 0 });
  const report = [];
  for (const s of students) {
    const records = await Attendance.find({ studentId: s._id.toString() });
    const total = records.length;
    const present = records.filter(r => r.status === "present").length;
    report.push({ name: s.name, class: s.class, total, present, percentage: total ? Math.round((present / total) * 100) : 0 });
  }
  res.json(report);
});

app.get("/admin/chapters", auth, async (req, res) => {
  const chapters = await Chapter.find().sort({ completedAt: -1 });
  res.json(chapters);
});

app.get("/admin/all-marks", auth, async (req, res) => {
  const marks = await Marks.find().sort({ studentName: 1 });
  res.json(marks);
});

// ─── START ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("✅ Smart Classroom Backend Running!"));
app.listen(5000, () => console.log("🚀 Server on port 5000"));