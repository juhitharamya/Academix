import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRoleApiToDb, mapRoleDbToApi, requireUserByFacultyId } from "./supabaseUtils.ts";
import { hashPassword, verifyPassword } from "./passwordUtils.ts";
import { issueAuthToken, readAuthTokenFromRequest, verifyAuthToken } from "./authToken.ts";

export function createAuthRouter(supabase: SupabaseClient) {
  const router = express.Router();

  router.get("/api/admin/auth/exists", async (_req, res) => {
    try {
      const { data, error } = await supabase.from("users").select("faculty_id").eq("role", "Admin").limit(1);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, exists: (data || []).length > 0 });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  async function requireAdminFromRequest(req: express.Request) {
    const token = readAuthTokenFromRequest(req);
    if (!token) return null;

    const v = verifyAuthToken(token);
    if (!v.ok) return null;

    const check = await requireUserByFacultyId(supabase, v.payload.faculty_id);
    if (!check.ok) return null;
    if (check.user.role !== "ADMIN") return null;
    return check.user;
  }

  // Admin-only user creation. Keep this endpoint for compatibility with the existing UI,
  // but require a logged-in Admin to create Faculty/HOD/ExamBranch accounts.
  router.post("/api/auth/signup", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim() || null;
      const password = String(body.password || "");
      const department = String(body.department || "").trim();
      const roleApi = String(body.role || "").trim().toUpperCase();
      const admin_faculty_id = String(body.admin_faculty_id || "").trim();

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!name) return res.status(400).json({ error: "name is required" });
      if (!password) return res.status(400).json({ error: "password is required" });
      if (!roleApi) return res.status(400).json({ error: "role is required" });

      const creatingAdmin = roleApi === "ADMIN";
      if (creatingAdmin) {
        // Allow only the first Admin without existing Admin credentials.
        // After that, require an authenticated Admin.
        const byToken = await requireAdminFromRequest(req);
        if (!byToken) {
          if (admin_faculty_id) {
            const adminCheck = await requireUserByFacultyId(supabase, admin_faculty_id);
            if (!adminCheck.ok) return res.status(adminCheck.status).json({ error: adminCheck.error });
            if (adminCheck.user.role !== "ADMIN") return res.status(403).json({ error: "Only Admin can create accounts." });
          } else {
            const { data: anyAdmin, error: anyAdminErr } = await supabase.from("users").select("faculty_id").eq("role", "Admin").limit(1);
            if (anyAdminErr) return res.status(500).json({ error: anyAdminErr.message });
            if ((anyAdmin || []).length > 0) return res.status(403).json({ error: "Admin already exists. Only Admin can create accounts." });
          }
        }
      } else {
        const allowPublicSignup = String(process.env.ALLOW_PUBLIC_SIGNUP || "").toLowerCase() === "true";
        const publicAllowedRoles = new Set(["FACULTY", "HOD", "EXAM_BRANCH"]);

        if (allowPublicSignup && publicAllowedRoles.has(roleApi)) {
          if (!department) return res.status(400).json({ error: "department is required" });
        } else {
          const byToken = await requireAdminFromRequest(req);
          if (!byToken) {
            if (!admin_faculty_id) return res.status(403).json({ error: "Only Admin can create accounts." });
            const adminCheck = await requireUserByFacultyId(supabase, admin_faculty_id);
            if (!adminCheck.ok) return res.status(adminCheck.status).json({ error: adminCheck.error });
            if (adminCheck.user.role !== "ADMIN") return res.status(403).json({ error: "Only Admin can create accounts." });
          }
        }
      }

      const roleDb = mapRoleApiToDb(roleApi);
      const passwordHash = hashPassword(password);

      const { error } = await supabase.from("users").insert({
        faculty_id,
        name,
        email,
        password: passwordHash,
        department: roleApi === "EXAM_BRANCH" || roleApi === "ADMIN" ? "" : department,
        role: roleDb,
      });

      if (error) return res.status(400).json({ error: error.message });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  router.post("/api/auth/login", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const password = String(body.password || "");

      if (!faculty_id || !password) return res.status(400).json({ error: "faculty_id and password are required" });

      const { data, error } = await supabase
        .from("users")
        .select("faculty_id,name,department,role,email,status,password")
        .eq("faculty_id", faculty_id)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!data || !verifyPassword(password, String(data.password || ""))) return res.status(401).json({ error: "Invalid credentials" });
      if ((data.status || "Active") === "Disabled") return res.status(403).json({ error: "Account is disabled" });

      const roleApi = mapRoleDbToApi(String(data.role || ""));
      const token = issueAuthToken({ faculty_id: data.faculty_id, role: roleApi });
      res.json({
        success: true,
        token,
        user: {
          faculty_id: data.faculty_id,
          name: data.name,
          department: data.department || "",
          role: roleApi,
          email: data.email || "",
          status: data.status || "Active",
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Admin auth for /admin: email + password (no faculty_id field shown on UI).
  router.post("/api/admin/auth/signup", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!name) return res.status(400).json({ error: "name is required" });
      if (!email) return res.status(400).json({ error: "email is required" });
      if (!password) return res.status(400).json({ error: "password is required" });

      const { data: anyAdmin, error: anyAdminErr } = await supabase.from("users").select("faculty_id").eq("role", "Admin").limit(1);
      if (anyAdminErr) return res.status(500).json({ error: anyAdminErr.message });
      if ((anyAdmin || []).length > 0) return res.status(403).json({ error: "Admin already exists. Please sign in." });

      const faculty_id = email;
      const { error: insErr } = await supabase.from("users").insert({
        faculty_id,
        name,
        email,
        password: hashPassword(password),
        department: "",
        role: "Admin",
      });
      if (insErr) return res.status(400).json({ error: insErr.message });

      const token = issueAuthToken({ faculty_id, role: "ADMIN" });
      res.json({
        success: true,
        token,
        user: { faculty_id, name, email, department: "", role: "ADMIN", status: "Active" },
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  router.post("/api/admin/auth/login", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return res.status(400).json({ error: "email and password are required" });

      const { data, error } = await supabase
        .from("users")
        .select("faculty_id,name,department,role,email,status,password")
        .eq("email", email)
        .eq("role", "Admin")
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!data || !verifyPassword(password, String(data.password || ""))) return res.status(401).json({ error: "Invalid credentials" });
      if ((data.status || "Active") === "Disabled") return res.status(403).json({ error: "Account is disabled" });

      const token = issueAuthToken({ faculty_id: data.faculty_id, role: "ADMIN" });
      res.json({
        success: true,
        token,
        user: {
          faculty_id: data.faculty_id,
          name: data.name,
          department: data.department || "",
          role: "ADMIN",
          email: data.email || "",
          status: data.status || "Active",
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  return router;
}
