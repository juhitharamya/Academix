import express from "express";
import type { Db } from "../db.ts";

type StudentRow = { roll_number: string; student_name: string };

function normalizeYear(input: any) {
  return String(input || "").trim().toUpperCase();
}

function normalizeSection(input: any) {
  return String(input || "").trim().toUpperCase();
}

function normalizeReg(input: any) {
  return String(input || "").trim().toUpperCase();
}

export function createEvaluationRouter(db: Db) {
  const router = express.Router();

  // HOD uploads a student list for their department (reg/year/section).
  router.post("/api/eval/student-lists", (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const hod_faculty_id = String(body.hod_faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const section = normalizeSection(body.section);
      const students = Array.isArray(body.students) ? (body.students as any[]) : [];

      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!students.length) return res.status(400).json({ error: "students are required" });

      const hod = db.prepare("SELECT faculty_id, department, role, status FROM faculty WHERE faculty_id = ?").get(hod_faculty_id) as any;
      if (!hod) return res.status(404).json({ error: "HOD user not found" });
      if ((hod.status || "Active") === "Disabled") return res.status(403).json({ error: "Account is disabled" });
      if (String(hod.role || "").toUpperCase() !== "HOD") return res.status(403).json({ error: "Only HOD can upload student lists" });
      if (String(hod.department || "").trim() !== department) return res.status(403).json({ error: "HOD department mismatch" });

      // H&S HOD uploads only for 1st year, but must select a branch (ECE/CSM/CSE/...).
      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S uploads are allowed only for year I" });
      }

      const cleanStudents: StudentRow[] = [];
      for (const s of students) {
        const roll = String(s?.roll_number || s?.roll || "").trim();
        const name = String(s?.student_name || s?.name || "").trim();
        if (!roll || !name) continue;
        cleanStudents.push({ roll_number: roll, student_name: name });
      }
      if (!cleanStudents.length) return res.status(400).json({ error: "No valid students found" });

      const tx = db.transaction(() => {
        const existing = db
          .prepare("SELECT id FROM evaluation_student_lists WHERE department = ? AND branch = ? AND regulation = ? AND year = ? AND section = ?")
          .get(department, department === "H&S" ? branch : "", regulation, year, section) as any;

        let listId: number;
        if (existing?.id) {
          listId = Number(existing.id);
          db.prepare("UPDATE evaluation_student_lists SET uploaded_by = ?, uploaded_at = CURRENT_TIMESTAMP WHERE id = ?").run(hod_faculty_id, listId);
          db.prepare("DELETE FROM evaluation_students WHERE list_id = ?").run(listId);
        } else {
          const ins = db
            .prepare("INSERT INTO evaluation_student_lists (department, branch, regulation, year, section, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)")
            .run(department, department === "H&S" ? branch : "", regulation, year, section, hod_faculty_id) as any;
          listId = Number(ins.lastInsertRowid);
        }

        const stmt = db.prepare("INSERT INTO evaluation_students (list_id, roll_number, student_name) VALUES (?, ?, ?)");
        for (const s of cleanStudents) stmt.run(listId, s.roll_number, s.student_name);

        return listId;
      });

      const listId = tx();
      res.json({ success: true, list_id: listId, count: cleanStudents.length });
    } catch (error: any) {
      console.error("Student list upload error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Faculty/HOD fetch student list for their department.
  router.get("/api/eval/student-lists", (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const section = normalizeSection(req.query.section);

      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });

      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S student lists are only for year I" });
      }

      const list = db
        .prepare("SELECT * FROM evaluation_student_lists WHERE department = ? AND branch = ? AND regulation = ? AND year = ? AND section = ?")
        .get(department, department === "H&S" ? branch : "", regulation, year, section) as any;
      if (!list) return res.status(404).json({ error: "Student list not found" });

      const students = db
        .prepare("SELECT roll_number, student_name FROM evaluation_students WHERE list_id = ? ORDER BY roll_number")
        .all(list.id) as StudentRow[];

      res.json({
        success: true,
        list: {
          id: list.id,
          department: list.department,
          branch: list.branch || "",
          regulation: list.regulation,
          year: list.year,
          section: list.section,
          uploaded_by: list.uploaded_by,
          uploaded_at: list.uploaded_at,
          students,
        },
      });
    } catch (error: any) {
      console.error("Student list fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Faculty saves marks (batch upsert per student).
  router.post("/api/eval/marks/batch", (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const section = normalizeSection(body.section);
      const mid_type = String(body.mid_type || "").trim();
      const subject_name = String(body.subject_name || "").trim();
      const subject_code = String(body.subject_code || "").trim().toUpperCase();
      const entries = Array.isArray(body.entries) ? (body.entries as any[]) : [];

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      if (!entries.length) return res.status(400).json({ error: "entries are required" });

      const faculty = db.prepare("SELECT faculty_id, department, role, status FROM faculty WHERE faculty_id = ?").get(faculty_id) as any;
      if (!faculty) return res.status(404).json({ error: "Faculty user not found" });
      if ((faculty.status || "Active") === "Disabled") return res.status(403).json({ error: "Account is disabled" });
      if (String(faculty.department || "").trim() !== department) return res.status(403).json({ error: "Faculty department mismatch" });

      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are allowed only for year I" });
      }

      const tx = db.transaction(() => {
        let upserts = 0;
        const stmt = db.prepare(`
          INSERT INTO evaluation_marks
            (faculty_id, department, branch, regulation, year, section, mid_type, subject_name, subject_code, roll_number, student_name, descriptive_marks, mcq_marks, fb_marks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(department, branch, regulation, year, section, mid_type, subject_code, roll_number)
          DO UPDATE SET
            faculty_id = excluded.faculty_id,
            branch = excluded.branch,
            student_name = excluded.student_name,
            subject_name = excluded.subject_name,
            descriptive_marks = excluded.descriptive_marks,
            mcq_marks = excluded.mcq_marks,
            fb_marks = excluded.fb_marks,
            updated_at = CURRENT_TIMESTAMP
        `);

        for (const e of entries) {
          const roll_number = String(e?.roll_number || "").trim();
          const student_name = String(e?.student_name || "").trim();
          if (!roll_number || !student_name) continue;
          const descriptive_marks = JSON.stringify(Array.isArray(e.descriptive_marks) ? e.descriptive_marks : []);
          const mcq_marks = JSON.stringify(Array.isArray(e.mcq_marks) ? e.mcq_marks : []);
          const fb_marks = JSON.stringify(Array.isArray(e.fb_marks) ? e.fb_marks : []);

          stmt.run(
            faculty_id,
            department,
            department === "H&S" ? branch : "",
            regulation,
            year,
            section,
            mid_type,
            subject_name,
            subject_code,
            roll_number,
            student_name,
            descriptive_marks,
            mcq_marks,
            fb_marks,
          );
          upserts++;
        }
        return upserts;
      });

      const count = tx();
      res.json({ success: true, saved: count });
    } catch (error: any) {
      console.error("Marks save error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fetch marks for an already-started entry.
  router.get("/api/eval/marks", (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const section = normalizeSection(req.query.section);
      const mid_type = String(req.query.mid_type || "").trim();
      const subject_code = String(req.query.subject_code || "").trim().toUpperCase();

      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are only for year I" });
      }

      const rows = db
        .prepare(
          `SELECT roll_number, student_name, descriptive_marks, mcq_marks, fb_marks
           FROM evaluation_marks
           WHERE department = ? AND branch = ? AND regulation = ? AND year = ? AND section = ? AND mid_type = ? AND subject_code = ?
           ORDER BY roll_number`,
        )
        .all(department, department === "H&S" ? branch : "", regulation, year, section, mid_type, subject_code) as any[];

      res.json({
        success: true,
        marks: rows.map((r) => ({
          roll_number: r.roll_number,
          student_name: r.student_name,
          descriptive_marks: JSON.parse(r.descriptive_marks || "[]"),
          mcq_marks: JSON.parse(r.mcq_marks || "[]"),
          fb_marks: JSON.parse(r.fb_marks || "[]"),
        })),
      });
    } catch (error: any) {
      console.error("Marks fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
