import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

function asSetBuckets(questions: any[]) {
  const subjective: any[] = [];
  const mcqs: any[] = [];
  const blanks: any[] = [];

  for (const q of questions || []) {
    const base = {
      id: q.id,
      set_type: q.set_type || null,
      question_text: q.question_text,
      marks: q.marks,
      co_level: q.co_number || null,
      btl_level: q.btl_level || null,
    };

    if (q.question_type === "subjective") subjective.push(base);
    else if (q.question_type === "mcq") {
      mcqs.push({
        ...base,
        option_A: q.options?.option_A ?? q.options?.A ?? "",
        option_B: q.options?.option_B ?? q.options?.B ?? "",
        option_C: q.options?.option_C ?? q.options?.C ?? "",
        option_D: q.options?.option_D ?? q.options?.D ?? "",
        correct_answer: q.correct_answer ?? "",
      });
    } else if (q.question_type === "fill_blank") {
      blanks.push({ ...base, correct_answer: q.correct_answer ?? "" });
    }
  }

  return { subjective, mcqs, blanks };
}

export function createPapersRouter(supabase: SupabaseClient) {
  const router = express.Router();

  router.get("/api/papers", async (req, res) => {
    try {
      const { faculty_id, department, branch, regulation, year, semester, mid_exam_type, status, hod_department, subject_code, subject_name } = req.query as any;
      let q = supabase.from("question_papers").select("*");

      if (faculty_id) q = q.eq("faculty_id", faculty_id);

      if (hod_department) {
        const hd = String(hod_department);
        if (hd === "H&S") {
          q = q.eq("department", "H&S").eq("year", "I");
        } else {
          q = q.or(`department.eq.${hd},and(department.eq.H&S,branch.eq.${hd},year.neq.I)`);
        }
      } else if (department) {
        q = q.eq("department", department);
      }

      if (branch) q = q.eq("branch", branch);
      if (regulation) q = q.eq("regulation", regulation);
      if (year) q = q.eq("year", year);
      if (semester) q = q.eq("semester", semester);
      if (mid_exam_type) q = q.eq("mid_type", mid_exam_type);
      if (status) q = q.eq("status", status);
      if (subject_code) q = q.eq("subject_code", String(subject_code).trim());
      if (subject_name) q = q.eq("subject_name", String(subject_name).trim());

      q = q.order("created_at", { ascending: false });

      const { data: papers, error } = await q;
      if (error) return res.status(400).json({ error: error.message });

      const facultyIds = Array.from(new Set((papers || []).map((p: any) => p.faculty_id).filter(Boolean)));
      const facultyMap = new Map<string, string>();
      if (facultyIds.length) {
        const { data: users } = await supabase.from("users").select("faculty_id,name").in("faculty_id", facultyIds);
        for (const u of users || []) facultyMap.set(u.faculty_id, u.name);
      }

      res.json(
        (papers || []).map((p: any) => ({
          ...p,
          id: p.id,
          faculty_name: facultyMap.get(p.faculty_id) || "",
          mid_exam_type: p.mid_type,
        })),
      );
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  router.get("/api/papers/:id", async (req, res) => {
    const id = String(req.params.id || "").trim();

    const { data: paper, error } = await supabase.from("question_papers").select("*").eq("id", id).maybeSingle();
    if (error) return res.status(400).json({ error: error.message });
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    const { data: user } = await supabase.from("users").select("name").eq("faculty_id", paper.faculty_id).maybeSingle();

    const { data: questions, error: qErr } = await supabase.from("questions").select("*").eq("paper_id", id);
    if (qErr) return res.status(400).json({ error: qErr.message });

    const buckets = asSetBuckets(questions || []);
    res.json({
      ...paper,
      id: paper.id,
      faculty_name: user?.name || "",
      mid_exam_type: paper.mid_type,
      ...buckets,
    });
  });

  router.post("/api/papers", async (req, res) => {
    const { faculty_id, department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status, set1, set2 } = req.body as any;

    const { data: inserted, error } = await supabase
      .from("question_papers")
      .insert({
        faculty_id,
        department,
        branch: branch || "",
        regulation,
        year,
        semester,
        mid_type: mid_exam_type,
        subject_name,
        subject_code,
        status,
      })
      .select("id")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    const paperId = inserted.id;

    const questions: any[] = [];
    const pushSet = (set: any, setType: string) => {
      for (const q of set?.subjective || []) {
        questions.push({
          paper_id: paperId,
          question_type: "subjective",
          question_text: q.question_text,
          marks: q.marks,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType,
        });
      }
      for (const q of set?.mcqs || []) {
        questions.push({
          paper_id: paperId,
          question_type: "mcq",
          question_text: q.question_text,
          marks: q.marks || 0,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType,
          options: { option_A: q.option_A, option_B: q.option_B, option_C: q.option_C, option_D: q.option_D },
          correct_answer: q.correct_answer,
        });
      }
      for (const q of set?.blanks || []) {
        questions.push({
          paper_id: paperId,
          question_type: "fill_blank",
          question_text: q.question_text,
          marks: q.marks || 0,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType,
          correct_answer: q.correct_answer,
        });
      }
    };

    if (set1) pushSet(set1, "Set 1");
    if (set2) pushSet(set2, "Set 2");

    if (questions.length) {
      const { error: qErr } = await supabase.from("questions").insert(questions);
      if (qErr) return res.status(400).json({ error: qErr.message });
    }

    res.json({ success: true, id: paperId });
  });

  router.patch("/api/papers/:id/status", async (req, res) => {
    const id = String(req.params.id || "").trim();
    const { status, hod_comments } = req.body as any;
    const { error } = await supabase.from("question_papers").update({ status, hod_comments: hod_comments || null }).eq("id", id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  router.put("/api/papers/:id", async (req, res) => {
    const paperId = String(req.params.id || "").trim();
    const { department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status, hod_comments, set1, set2 } = req.body as any;

    const { error } = await supabase
      .from("question_papers")
      .update({
        department,
        branch: branch || "",
        regulation,
        year,
        semester,
        mid_type: mid_exam_type,
        subject_name,
        subject_code,
        status,
        hod_comments: hod_comments || null,
      })
      .eq("id", paperId);

    if (error) return res.status(400).json({ error: error.message });

    const { error: delErr } = await supabase.from("questions").delete().eq("paper_id", paperId);
    if (delErr) return res.status(400).json({ error: delErr.message });

    const questions: any[] = [];
    const pushSet = (set: any, setType: string) => {
      for (const q of set?.subjective || []) {
        questions.push({
          paper_id: paperId,
          question_type: "subjective",
          question_text: q.question_text,
          marks: q.marks,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType,
        });
      }
      for (const q of set?.mcqs || []) {
        questions.push({
          paper_id: paperId,
          question_type: "mcq",
          question_text: q.question_text,
          marks: q.marks || 0,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType,
          options: { option_A: q.option_A, option_B: q.option_B, option_C: q.option_C, option_D: q.option_D },
          correct_answer: q.correct_answer,
        });
      }
      for (const q of set?.blanks || []) {
        questions.push({
          paper_id: paperId,
          question_type: "fill_blank",
          question_text: q.question_text,
          marks: q.marks || 0,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType,
          correct_answer: q.correct_answer,
        });
      }
    };

    if (set1) pushSet(set1, "Set 1");
    if (set2) pushSet(set2, "Set 2");

    if (questions.length) {
      const { error: insErr } = await supabase.from("questions").insert(questions);
      if (insErr) return res.status(400).json({ error: insErr.message });
    }

    res.json({ success: true });
  });

  return router;
}
