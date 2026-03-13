import express from "express";
import type { Db } from "../db.ts";

export function createAuthRouter(db: Db) {
  const router = express.Router();

  router.post("/api/auth/signup", (req, res) => {
    const { faculty_id, name, email, password, department, role } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO faculty (faculty_id, name, email, password, department, role) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(faculty_id, name, email || null, password, department || "", role || "FACULTY");
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/auth/login", (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const password = String(body.password || "");

      if (!faculty_id || !password) {
        return res.status(400).json({ error: "faculty_id and password are required" });
      }

      const user = db.prepare("SELECT * FROM faculty WHERE faculty_id = ? AND password = ?").get(faculty_id, password) as any;
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      if ((user.status || "Active") === "Disabled") return res.status(403).json({ error: "Account is disabled" });

      res.json({
        success: true,
        user: {
          faculty_id: user.faculty_id,
          name: user.name,
          department: user.department || "",
          role: user.role,
          email: user.email || "",
          status: user.status || "Active",
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
