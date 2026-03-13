import express from "express";
import type { Db } from "../db.ts";

export function createSubjectsRouter(db: Db) {
  const router = express.Router();

  router.get("/api/subjects", (req, res) => {
    const { regulation, department, branch, year, semester } = req.query;
    let query = "SELECT * FROM subjects";
    const params: any[] = [];
    const conditions: string[] = [];

    if (regulation) {
      conditions.push("regulation = ?");
      params.push(regulation);
    }
    if (department) {
      conditions.push("department = ?");
      params.push(department);
    }
    if (branch) {
      conditions.push("branch = ?");
      params.push(branch);
    }
    if (year) {
      conditions.push("year = ?");
      params.push(year);
    }
    if (semester) {
      conditions.push("semester = ?");
      params.push(semester);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    try {
      const subjects = db.prepare(query).all(...params);
      res.json(subjects);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

