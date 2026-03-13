import express from "express";
import type { Db } from "../db.ts";

export function createPapersRouter(db: Db) {
  const router = express.Router();

  router.get("/api/papers", (req, res) => {
    const { faculty_id, department, branch, regulation, year, semester, mid_exam_type, status, hod_department } = req.query as any;
    let query = "SELECT qp.*, f.name as faculty_name FROM question_papers qp JOIN faculty f ON qp.faculty_id = f.faculty_id";
    const params: any[] = [];

    const conditions: string[] = [];
    if (faculty_id) {
      conditions.push("qp.faculty_id = ?");
      params.push(faculty_id);
    }
    if (hod_department) {
      const hd = String(hod_department);
      if (hd === "H&S") {
        conditions.push("(qp.department = 'H&S' AND qp.year = 'I')");
      } else {
        conditions.push("((qp.department = ?) OR (qp.department = 'H&S' AND qp.branch = ? AND qp.year <> 'I'))");
        params.push(hd, hd);
      }
    } else if (department) {
      conditions.push("qp.department = ?");
      params.push(department);
    }
    if (branch) {
      conditions.push("qp.branch = ?");
      params.push(branch);
    }
    if (regulation) {
      conditions.push("qp.regulation = ?");
      params.push(regulation);
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
    try {
      const papers = db.prepare(query).all(...params);
      res.json(papers);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/api/papers/:id", (req, res) => {
    const paper = db
      .prepare("SELECT qp.*, f.name as faculty_name FROM question_papers qp JOIN faculty f ON qp.faculty_id = f.faculty_id WHERE qp.id = ?")
      .get(req.params.id) as any;
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    const subjective = db.prepare("SELECT * FROM subjective_questions WHERE paper_id = ?").all(req.params.id);
    const mcqs = db.prepare("SELECT * FROM objective_mcqs WHERE paper_id = ?").all(req.params.id);
    const blanks = db.prepare("SELECT * FROM fill_blanks WHERE paper_id = ?").all(req.params.id);

    res.json({ ...paper, subjective, mcqs, blanks });
  });

  router.post("/api/papers", (req, res) => {
    const { faculty_id, department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status, set1, set2 } = req.body;

    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO question_papers (faculty_id, department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(faculty_id, department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status);
      const paperId = result.lastInsertRowid;

      const subStmt = db.prepare("INSERT INTO subjective_questions (paper_id, set_type, question_text, marks, co_level, btl_level) VALUES (?, ?, ?, ?, ?, ?)");
      const mcqStmt = db.prepare(
        "INSERT INTO objective_mcqs (paper_id, set_type, question_text, option_A, option_B, option_C, option_D, correct_answer, co_level, btl_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const blankStmt = db.prepare("INSERT INTO fill_blanks (paper_id, set_type, question_text, correct_answer, co_level, btl_level) VALUES (?, ?, ?, ?, ?, ?)");

      const insertSet = (set: any, setType: string) => {
        for (const q of set.subjective) {
          subStmt.run(paperId, setType, q.question_text, q.marks, q.co_level, q.btl_level);
        }
        for (const q of set.mcqs) {
          mcqStmt.run(paperId, setType, q.question_text, q.option_A, q.option_B, q.option_C, q.option_D, q.correct_answer, q.co_level || null, q.btl_level || null);
        }
        for (const q of set.blanks) {
          blankStmt.run(paperId, setType, q.question_text, q.correct_answer, q.co_level || null, q.btl_level || null);
        }
      };

      if (set1) insertSet(set1, "Set 1");
      if (set2) insertSet(set2, "Set 2");

      return paperId;
    });

    try {
      const paperId = transaction();
      res.json({ success: true, id: paperId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/papers/:id/status", (req, res) => {
    const { status, hod_comments } = req.body;
    try {
      const stmt = db.prepare("UPDATE question_papers SET status = ?, hod_comments = ? WHERE id = ?");
      stmt.run(status, hod_comments || null, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.put("/api/papers/:id", (req, res) => {
    const { department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status, hod_comments, set1, set2 } = req.body;
    const paperId = req.params.id;

    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE question_papers
        SET department = ?, branch = ?, regulation = ?, year = ?, semester = ?, mid_exam_type = ?, subject_name = ?, subject_code = ?, status = ?, hod_comments = ?
        WHERE id = ?
      `);
      stmt.run(department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status, hod_comments || null, paperId);

      db.prepare("DELETE FROM subjective_questions WHERE paper_id = ?").run(paperId);
      db.prepare("DELETE FROM objective_mcqs WHERE paper_id = ?").run(paperId);
      db.prepare("DELETE FROM fill_blanks WHERE paper_id = ?").run(paperId);

      const subStmt = db.prepare("INSERT INTO subjective_questions (paper_id, set_type, question_text, marks, co_level, btl_level) VALUES (?, ?, ?, ?, ?, ?)");
      const mcqStmt = db.prepare(
        "INSERT INTO objective_mcqs (paper_id, set_type, question_text, option_A, option_B, option_C, option_D, correct_answer, co_level, btl_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const blankStmt = db.prepare("INSERT INTO fill_blanks (paper_id, set_type, question_text, correct_answer, co_level, btl_level) VALUES (?, ?, ?, ?, ?, ?)");

      const insertSet = (set: any, setType: string) => {
        for (const q of set.subjective) {
          subStmt.run(paperId, setType, q.question_text, q.marks, q.co_level, q.btl_level);
        }
        for (const q of set.mcqs) {
          mcqStmt.run(paperId, setType, q.question_text, q.option_A, q.option_B, q.option_C, q.option_D, q.correct_answer, q.co_level || null, q.btl_level || null);
        }
        for (const q of set.blanks) {
          blankStmt.run(paperId, setType, q.question_text, q.correct_answer, q.co_level || null, q.btl_level || null);
        }
      };

      if (set1) insertSet(set1, "Set 1");
      if (set2) insertSet(set2, "Set 2");
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

