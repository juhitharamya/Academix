import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { openDb } from "../database/db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = openDb();

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post("/api/auth/signup", (req, res) => {
    const { faculty_id, name, password, department, role } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO faculty (faculty_id, name, password, department, role) VALUES (?, ?, ?, ?, ?)");
      stmt.run(faculty_id, name, password, department, role || 'FACULTY');
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { faculty_id, password } = req.body;
    const user = db.prepare("SELECT * FROM faculty WHERE faculty_id = ? AND password = ?").get(faculty_id, password) as any;
    if (user) {
      res.json({ success: true, user: { faculty_id: user.faculty_id, name: user.name, department: user.department, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Question Papers
  app.get("/api/papers", (req, res) => {
    const { faculty_id, department, year, semester, mid_exam_type, status } = req.query;
    let query = "SELECT qp.*, f.name as faculty_name FROM question_papers qp JOIN faculty f ON qp.faculty_id = f.faculty_id";
    const params: any[] = [];

    const conditions: string[] = [];
    if (faculty_id) {
      conditions.push("qp.faculty_id = ?");
      params.push(faculty_id);
    }
    if (department) {
      conditions.push("qp.department = ?");
      params.push(department);
    }
    if (year) {
      conditions.push("qp.year = ?");
      params.push(year);
    }
    if (semester) {
      conditions.push("qp.semester = ?");
      params.push(semester);
    }
    if (mid_exam_type) {
      conditions.push("qp.mid_exam_type = ?");
      params.push(mid_exam_type);
    }
    if (status) {
      conditions.push("qp.status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY qp.created_at DESC";
    const papers = db.prepare(query).all(...params);
    res.json(papers);
  });

  app.get("/api/papers/:id", (req, res) => {
    const paper = db.prepare("SELECT qp.*, f.name as faculty_name FROM question_papers qp JOIN faculty f ON qp.faculty_id = f.faculty_id WHERE qp.id = ?").get(req.params.id) as any;
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    const subjective = db.prepare("SELECT * FROM subjective_questions WHERE paper_id = ?").all(req.params.id);
    const mcqs = db.prepare("SELECT * FROM objective_mcqs WHERE paper_id = ?").all(req.params.id);
    const blanks = db.prepare("SELECT * FROM fill_blanks WHERE paper_id = ?").all(req.params.id);

    res.json({ ...paper, subjective, mcqs, blanks });
  });

  app.post("/api/papers", (req, res) => {
    const { faculty_id, department, year, semester, mid_exam_type, subject_name, subject_code, status, set1, set2 } = req.body;
    
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO question_papers (faculty_id, department, year, semester, mid_exam_type, subject_name, subject_code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(faculty_id, department, year, semester, mid_exam_type, subject_name, subject_code, status);
      const paperId = result.lastInsertRowid;

      const subStmt = db.prepare("INSERT INTO subjective_questions (paper_id, set_type, question_text, marks) VALUES (?, ?, ?, ?)");
      const mcqStmt = db.prepare("INSERT INTO objective_mcqs (paper_id, set_type, question_text, option_A, option_B, option_C, option_D, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      const blankStmt = db.prepare("INSERT INTO fill_blanks (paper_id, set_type, question_text, correct_answer) VALUES (?, ?, ?, ?)");

      const insertSet = (set: any, setType: string) => {
        for (const q of set.subjective) {
          subStmt.run(paperId, setType, q.question_text, q.marks);
        }
        for (const q of set.mcqs) {
          mcqStmt.run(paperId, setType, q.question_text, q.option_A, q.option_B, q.option_C, q.option_D, q.correct_answer);
        }
        for (const q of set.blanks) {
          blankStmt.run(paperId, setType, q.question_text, q.correct_answer);
        }
      };

      if (set1) insertSet(set1, 'Set 1');
      if (set2) insertSet(set2, 'Set 2');

      return paperId;
    });

    try {
      const paperId = transaction();
      res.json({ success: true, id: paperId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/papers/:id/status", (req, res) => {
    const { status, hod_comments } = req.body;
    try {
      const stmt = db.prepare("UPDATE question_papers SET status = ?, hod_comments = ? WHERE id = ?");
      stmt.run(status, hod_comments || null, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/papers/:id", (req, res) => {
    const { department, year, semester, mid_exam_type, subject_name, subject_code, status, hod_comments, set1, set2 } = req.body;
    const paperId = req.params.id;

    const transaction = db.transaction(() => {
      // Update paper metadata
      const stmt = db.prepare(`
        UPDATE question_papers 
        SET department = ?, year = ?, semester = ?, mid_exam_type = ?, subject_name = ?, subject_code = ?, status = ?, hod_comments = ?
        WHERE id = ?
      `);
      stmt.run(department, year, semester, mid_exam_type, subject_name, subject_code, status, hod_comments || null, paperId);

      // Clear existing questions
      db.prepare("DELETE FROM subjective_questions WHERE paper_id = ?").run(paperId);
      db.prepare("DELETE FROM objective_mcqs WHERE paper_id = ?").run(paperId);
      db.prepare("DELETE FROM fill_blanks WHERE paper_id = ?").run(paperId);

      // Insert new questions
      const subStmt = db.prepare("INSERT INTO subjective_questions (paper_id, set_type, question_text, marks) VALUES (?, ?, ?, ?)");
      const mcqStmt = db.prepare("INSERT INTO objective_mcqs (paper_id, set_type, question_text, option_A, option_B, option_C, option_D, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      const blankStmt = db.prepare("INSERT INTO fill_blanks (paper_id, set_type, question_text, correct_answer) VALUES (?, ?, ?, ?)");

      const insertSet = (set: any, setType: string) => {
        for (const q of set.subjective) {
          subStmt.run(paperId, setType, q.question_text, q.marks);
        }
        for (const q of set.mcqs) {
          mcqStmt.run(paperId, setType, q.question_text, q.option_A, q.option_B, q.option_C, q.option_D, q.correct_answer);
        }
        for (const q of set.blanks) {
          blankStmt.run(paperId, setType, q.question_text, q.correct_answer);
        }
      };

      if (set1) insertSet(set1, 'Set 1');
      if (set2) insertSet(set2, 'Set 2');

      return paperId;
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const frontendRoot = path.join(__dirname, "..", "frontend");
  const viteConfigFile = path.join(frontendRoot, "vite.config.ts");

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: frontendRoot,
      configFile: viteConfigFile,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(frontendRoot, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(frontendRoot, "dist", "index.html"));
    });
  }

  const portFromEnv = Number.parseInt(process.env.PORT || "", 10);
  const PORT = Number.isFinite(portFromEnv) ? portFromEnv : 3000;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
