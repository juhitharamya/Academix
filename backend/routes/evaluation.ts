import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUserByFacultyId } from "./supabaseUtils.ts";

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

function toNumOrNull(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sumNums(values: any[]) {
  return values.reduce((sum, v) => sum + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
}

function normalizeDescriptiveMark(value: any) {
  if (!Number.isFinite(Number(value))) return null;
  const parsed = Number(value);
  return parsed >= 0 && parsed <= 5 ? parsed : null;
}

function normalizeObjectiveMark(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? 0.5 : 0;
}

function bestFourDescriptiveTotal(values: any[]) {
  return (values || [])
    .map((v) => normalizeDescriptiveMark(v))
    .filter((v): v is number => v !== null)
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((sum, v) => sum + v, 0);
}

function objectiveSectionTotal(values: any[]) {
  return (values || []).reduce((sum, value) => sum + (normalizeObjectiveMark(value) ?? 0), 0);
}

function evaluationTotal(descriptive: any[], mcq: any[], fb: any[]) {
  return bestFourDescriptiveTotal(descriptive) + objectiveSectionTotal(mcq || []) + objectiveSectionTotal(fb || []);
}

export function createEvaluationRouter(supabase: SupabaseClient) {
  const router = express.Router();

  function canHodAccessDepartment(hodDept: string, targetDept: string) {
    return hodDept === targetDept;
  }

  // HOD uploads a student list for their department (reg/year/section).
  router.post("/api/eval/student-lists", async (req, res) => {
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

      const hodCheck = await requireUserByFacultyId(supabase, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can upload student lists" });
      if (!canHodAccessDepartment(String(hod.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });

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

      const effectiveBranch = department === "H&S" ? branch : "";
      const uploadedAt = new Date().toISOString();

      const { error: delErr } = await supabase
        .from("students")
        .delete()
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section);

      if (delErr) return res.status(400).json({ error: delErr.message });

      const toInsert = cleanStudents.map((s) => ({
        roll_number: s.roll_number,
        student_name: s.student_name,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester: "",
        section,
        uploaded_by: hod_faculty_id,
        uploaded_at: uploadedAt,
      }));

      const { error: insErr, count } = await supabase.from("students").insert(toInsert, { count: "exact" });
      if (insErr) return res.status(400).json({ error: insErr.message });

      res.json({
        success: true,
        list_id: `${department}:${effectiveBranch}:${regulation}:${year}:${section}`,
        count: typeof count === "number" ? count : cleanStudents.length,
      });
    } catch (error: any) {
      console.error("Student list upload error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Faculty/HOD fetches student list.
  router.get("/api/eval/student-lists", async (req, res) => {
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

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });

      const { data: rows, error } = await supabase
        .from("students")
        .select("roll_number,student_name,department,branch,regulation,year,section,uploaded_by,uploaded_at")
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section)
        .order("roll_number", { ascending: true });

      if (error) return res.status(400).json({ error: error.message });
      if (!rows || rows.length === 0) return res.status(404).json({ error: "Student list not found" });

      let uploaded_by = rows[0].uploaded_by || "";
      let uploaded_at = rows[0].uploaded_at || "";
      for (const r of rows) {
        if (r.uploaded_at && (!uploaded_at || String(r.uploaded_at) > String(uploaded_at))) {
          uploaded_at = r.uploaded_at;
          uploaded_by = r.uploaded_by || uploaded_by;
        }
      }

      const students: StudentRow[] = rows.map((r: any) => ({ roll_number: r.roll_number, student_name: r.student_name }));
      res.json({
        success: true,
        list: {
          id: `${department}:${effectiveBranch}:${regulation}:${year}:${section}`,
          department,
          branch: effectiveBranch,
          regulation,
          year,
          section,
          uploaded_by,
          uploaded_at,
          students,
        },
      });
    } catch (error: any) {
      console.error("Student list fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Faculty/HOD saves marks (batch upsert per student).
  router.post("/api/eval/marks/batch", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const actor_id = String(body.actor_id || faculty_id || "").trim();
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

      const actorCheck = await requireUserByFacultyId(supabase, actor_id);
      if (!actorCheck.ok) return res.status(actorCheck.status).json({ error: actorCheck.error });
      const actor = actorCheck.user;

      const targetCheck = await requireUserByFacultyId(supabase, faculty_id);
      if (!targetCheck.ok) return res.status(targetCheck.status).json({ error: targetCheck.error });
      const target = targetCheck.user;

      if (actor.role !== "FACULTY" && actor.role !== "HOD") return res.status(403).json({ error: "Only Faculty/HOD can save marks" });
      if (actor.role === "FACULTY" && actor.faculty_id !== faculty_id) return res.status(403).json({ error: "Faculty can only edit their own marks" });
      if (actor.role === "HOD" && !canHodAccessDepartment(String(actor.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });
      if (String(target.department || "").trim() !== department) return res.status(403).json({ error: "Faculty department mismatch" });

      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are allowed only for year I" });
      }

      const effectiveBranch = department === "H&S" ? branch : "";
      const now = new Date().toISOString();

      const { data: existingEval, error: findErr } = await supabase
        .from("evaluations")
        .select("id,status,submitted_at")
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section)
        .eq("mid_type", mid_type)
        .eq("subject_code", subject_code)
        .maybeSingle();

      if (findErr) return res.status(400).json({ error: findErr.message });

      let evaluationId = existingEval?.id as string | undefined;
      if (!evaluationId) {
        const { data: created, error: createErr } = await supabase
          .from("evaluations")
          .insert({
            faculty_id,
            department,
            branch: effectiveBranch,
            regulation,
            year,
            section,
            mid_type,
            subject_name,
            subject_code,
            status: "draft",
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();
        if (createErr) return res.status(400).json({ error: createErr.message });
        evaluationId = created.id;
      } else {
        await supabase
          .from("evaluations")
          .update({ faculty_id, subject_name, updated_at: now })
          .eq("id", evaluationId);
      }

      const rows: any[] = [];
      for (const e of entries) {
        const roll_number = String(e?.roll_number || "").trim();
        const student_name = String(e?.student_name || "").trim();
        if (!roll_number || !student_name) continue;

        const d = Array.isArray(e.descriptive_marks) ? e.descriptive_marks : [];
        const m = Array.isArray(e.mcq_marks) ? e.mcq_marks : [];
        const f = Array.isArray(e.fb_marks) ? e.fb_marks : [];

        const total = evaluationTotal(d, m, f);

        rows.push({
          evaluation_id: evaluationId,
          roll_number,
          student_name,
          q1: normalizeDescriptiveMark(d[0]),
          q2: normalizeDescriptiveMark(d[1]),
          q3: normalizeDescriptiveMark(d[2]),
          q4: normalizeDescriptiveMark(d[3]),
          q5: normalizeDescriptiveMark(d[4]),
          q6: normalizeDescriptiveMark(d[5]),
          mcq1: normalizeObjectiveMark(m[0]),
          mcq2: normalizeObjectiveMark(m[1]),
          mcq3: normalizeObjectiveMark(m[2]),
          mcq4: normalizeObjectiveMark(m[3]),
          mcq5: normalizeObjectiveMark(m[4]),
          mcq6: normalizeObjectiveMark(m[5]),
          mcq7: normalizeObjectiveMark(m[6]),
          mcq8: normalizeObjectiveMark(m[7]),
          mcq9: normalizeObjectiveMark(m[8]),
          mcq10: normalizeObjectiveMark(m[9]),
          fb1: normalizeObjectiveMark(f[0]),
          fb2: normalizeObjectiveMark(f[1]),
          fb3: normalizeObjectiveMark(f[2]),
          fb4: normalizeObjectiveMark(f[3]),
          fb5: normalizeObjectiveMark(f[4]),
          fb6: normalizeObjectiveMark(f[5]),
          fb7: normalizeObjectiveMark(f[6]),
          fb8: normalizeObjectiveMark(f[7]),
          fb9: normalizeObjectiveMark(f[8]),
          fb10: normalizeObjectiveMark(f[9]),
          total_marks: total,
          updated_at: now,
        });
      }

      if (!rows.length) return res.status(400).json({ error: "No valid entries found" });

      const { error: upErr } = await supabase.from("student_marks").upsert(rows, { onConflict: "evaluation_id,roll_number" });
      if (upErr) return res.status(400).json({ error: upErr.message });

      await supabase.from("evaluations").update({ updated_at: now }).eq("id", evaluationId);

      res.json({ success: true, saved: rows.length });
    } catch (error: any) {
      console.error("Marks save error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fetch marks for an already-started entry.
  router.get("/api/eval/marks", async (req, res) => {
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

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S") {
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are only for year I" });
      }

      const { data: evaluation, error: eErr } = await supabase
        .from("evaluations")
        .select("id")
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section)
        .eq("mid_type", mid_type)
        .eq("subject_code", subject_code)
        .maybeSingle();

      if (eErr) return res.status(400).json({ error: eErr.message });
      if (!evaluation) return res.json({ success: true, marks: [] });

      const { data: rows, error } = await supabase
        .from("student_marks")
        .select("*")
        .eq("evaluation_id", evaluation.id)
        .order("roll_number", { ascending: true });

      if (error) return res.status(400).json({ error: error.message });

      res.json({
        success: true,
        marks: (rows || []).map((r: any) => ({
          roll_number: r.roll_number,
          student_name: r.student_name || "",
          descriptive_marks: [r.q1, r.q2, r.q3, r.q4, r.q5, r.q6].map((v: any) => (v === null || v === undefined ? null : Number(v))),
          mcq_marks: [r.mcq1, r.mcq2, r.mcq3, r.mcq4, r.mcq5, r.mcq6, r.mcq7, r.mcq8, r.mcq9, r.mcq10].map((v: any) => (v === null || v === undefined ? null : Number(v))),
          fb_marks: [r.fb1, r.fb2, r.fb3, r.fb4, r.fb5, r.fb6, r.fb7, r.fb8, r.fb9, r.fb10].map((v: any) => (v === null || v === undefined ? null : Number(v))),
        })),
      });
    } catch (error: any) {
      console.error("Marks fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Faculty submits marks for HOD review.
  router.post("/api/eval/submit", async (req, res) => {
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

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      const userCheck = await requireUserByFacultyId(supabase, faculty_id);
      if (!userCheck.ok) return res.status(userCheck.status).json({ error: userCheck.error });
      const user = userCheck.user;

      if (user.role !== "FACULTY") return res.status(403).json({ error: "Only Faculty can submit evaluations" });
      if (String(user.department || "").trim() !== department) return res.status(403).json({ error: "Faculty department mismatch" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S") {
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S submissions are only for year I" });
      }

      const { data: evaluation, error: eErr } = await supabase
        .from("evaluations")
        .select("id")
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section)
        .eq("mid_type", mid_type)
        .eq("subject_code", subject_code)
        .maybeSingle();

      if (eErr) return res.status(400).json({ error: eErr.message });
      if (!evaluation) return res.status(400).json({ error: "No marks saved yet. Please save marks before submitting." });

      const { count, error: countErr } = await supabase.from("student_marks").select("id", { count: "exact", head: true }).eq("evaluation_id", evaluation.id);
      if (countErr) return res.status(400).json({ error: countErr.message });
      if (!count) return res.status(400).json({ error: "No marks saved yet. Please save marks before submitting." });

      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("evaluations")
        .update({ status: "submitted", submitted_at: now, updated_at: now, faculty_id, subject_name })
        .eq("id", evaluation.id);

      if (updErr) return res.status(400).json({ error: updErr.message });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Submit error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // HOD lists submitted evaluations for their department.
  router.get("/api/eval/submissions", async (req, res) => {
    try {
      const hod_faculty_id = String(req.query.hod_faculty_id || "").trim();
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const section = normalizeSection(req.query.section);
      const mid_type = String(req.query.mid_type || "").trim();
      const subject_code = String(req.query.subject_code || "").trim().toUpperCase();

      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });

      const hodCheck = await requireUserByFacultyId(supabase, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can view submissions" });

      const hodDept = String(hod.department || "").trim();
      const targetDept = department || hodDept;
      if (!canHodAccessDepartment(hodDept, targetDept)) return res.status(403).json({ error: "HOD department mismatch" });

      let q = supabase.from("evaluations").select("*").eq("department", targetDept).eq("status", "submitted");

      if (targetDept === "H&S") {
        q = q.eq("year", "I");
        if (branch) q = q.eq("branch", branch);
      } else {
        q = q.eq("branch", "");
      }

      if (regulation) q = q.eq("regulation", regulation);
      if (year) q = q.eq("year", year);
      if (section) q = q.eq("section", section);
      if (mid_type) q = q.eq("mid_type", mid_type);
      if (subject_code) q = q.eq("subject_code", subject_code);

      q = q.order("submitted_at", { ascending: false }).order("updated_at", { ascending: false });

      const { data: rows, error } = await q;
      if (error) return res.status(400).json({ error: error.message });

      const facultyIds = Array.from(new Set((rows || []).map((r: any) => r.faculty_id).filter(Boolean)));
      const facultyMap = new Map<string, string>();
      if (facultyIds.length) {
        const { data: users } = await supabase.from("users").select("faculty_id,name").in("faculty_id", facultyIds);
        for (const u of users || []) facultyMap.set(u.faculty_id, u.name);
      }

      res.json({
        success: true,
        submissions: (rows || []).map((r: any) => ({
          id: r.id,
          faculty_id: r.faculty_id,
          faculty_name: facultyMap.get(r.faculty_id) || "",
          department: r.department,
          branch: r.branch || "",
          regulation: r.regulation,
          year: r.year,
          section: r.section,
          mid_type: r.mid_type,
          subject_name: r.subject_name,
          subject_code: r.subject_code,
          status: r.status,
          submitted_at: r.submitted_at,
          updated_at: r.updated_at,
        })),
      });
    } catch (error: any) {
      console.error("Submissions list error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
