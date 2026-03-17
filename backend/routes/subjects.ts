import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCatalogSubjects } from "./subjectCatalog.ts";

export function createSubjectsRouter(supabase: SupabaseClient) {
  const router = express.Router();

  const normalize = (v: any) => String(v || "").trim();

  const buildCatalogRows = (params: { regulation?: any; department?: any; branch?: any; year?: any; semester?: any }) => {
    const regulation = normalize(params.regulation);
    const department = normalize(params.department);
    const year = normalize(params.year);
    const semester = normalize(params.semester);

    if (!regulation || !department || !year || !semester) return [];
    if (regulation.toUpperCase() !== "R22") return [];

    const list = getCatalogSubjects({ department, regulation, year, semester }).slice();
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    return list.map((s, idx) => ({
      id: idx + 1,
      regulation,
      department,
      branch: normalize(params.branch),
      year,
      semester,
      subject_name: s.name,
      subject_code: s.code,
    }));
  };

  const expandSemester = (semesterRaw: any) => {
    const sem = normalize(semesterRaw);
    const upper = sem.toUpperCase();
    if (!sem) return [];
    if (upper === "I" || upper === "SEM I" || upper === "SEMESTER I") return ["I", "Sem I", "Semester I", "SEM I", "SEMESTER I"];
    if (upper === "II" || upper === "SEM II" || upper === "SEMESTER II") return ["II", "Sem II", "Semester II", "SEM II", "SEMESTER II"];
    return [sem];
  };

  const expandYear = (yearRaw: any) => {
    const y = normalize(yearRaw);
    const upper = y.toUpperCase();
    if (!y) return [];
    if (["I", "II", "III", "IV"].includes(upper)) return [upper, `${upper} Year`, `${upper} YEAR`];
    return [y];
  };

  router.get("/api/subjects", async (req, res) => {
    const { regulation, department, branch, year, semester } = req.query as any;
    const catalogRows = buildCatalogRows({ regulation, department, branch, year, semester });

    try {
      let q = supabase
        .from("subjects")
        .select("id,regulation,department,branch,year,semester,subject_name,subject_code")
        .order("subject_name", { ascending: true });

      if (regulation) q = q.eq("regulation", normalize(regulation));
      if (department) q = q.eq("department", normalize(department));
      if (branch) q = q.eq("branch", normalize(branch));

      const years = expandYear(year);
      if (years.length === 1) q = q.eq("year", years[0]);
      else if (years.length > 1) q = q.in("year", years);

      const semesters = expandSemester(semester);
      if (semesters.length === 1) q = q.eq("semester", semesters[0]);
      else if (semesters.length > 1) q = q.in("semester", semesters);

      const { data, error } = await q;
      if (error) {
        // If DB is unreachable / table is empty, still serve catalog for R22.
        if (catalogRows.length) return res.json(catalogRows);
        return res.status(400).json({ error: error.message });
      }

      const rows = data || [];
      if (rows.length) return res.json(rows);
    } catch (error: any) {
      if (catalogRows.length) return res.json(catalogRows);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }

    // DB returned no rows, serve catalog for R22 if we have it.
    if (catalogRows.length) return res.json(catalogRows);

    return res.json([]);
  });

  return router;
}
