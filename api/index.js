// backend/app.ts
import express9 from "express";
import path from "path";
import dns from "node:dns/promises";
import { URL } from "node:url";

// backend/swagger.ts
var openApiSpec = {
  openapi: "3.0.3",
  info: { title: "Academix API", version: "1.0.0" },
  servers: [{ url: "/" }],
  tags: [{ name: "Auth" }, { name: "Users" }, { name: "Admin" }, { name: "Subjects" }, { name: "Papers" }, { name: "Evaluation" }],
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Create user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["faculty_id", "name", "password"],
                properties: {
                  faculty_id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  password: { type: "string" },
                  department: { type: "string" },
                  role: { type: "string", enum: ["FACULTY", "HOD", "EXAM_BRANCH", "ADMIN"] }
                }
              }
            }
          }
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" } }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["faculty_id", "password"],
                properties: { faculty_id: { type: "string" }, password: { type: "string" } }
              }
            }
          }
        },
        responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" }, "403": { description: "Disabled" } }
      }
    },
    "/api/users/{id}": {
      patch: {
        tags: ["Users"],
        summary: "Update own profile (name/email only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } } }
          }
        },
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/admin/users": {
      get: { tags: ["Admin"], summary: "List Faculty/HOD users", responses: { "200": { description: "OK" } } }
    },
    "/api/admin/users/{id}": {
      put: {
        tags: ["Admin"],
        summary: "Edit faculty details (no password here)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["faculty_id", "name", "department", "role", "status"],
                properties: {
                  faculty_id: { type: "string" },
                  name: { type: "string" },
                  department: { type: "string" },
                  role: { type: "string", enum: ["FACULTY", "HOD"] },
                  status: { type: "string", enum: ["Active", "Disabled"] }
                }
              }
            }
          }
        },
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/admin/users/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Disable/Enable account",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["Active", "Disabled"] } } } }
          }
        },
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/admin/users/{id}/reset-password": {
      post: {
        tags: ["Admin"],
        summary: "Reset password (dedicated action)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { type: "object", required: ["new_password"], properties: { new_password: { type: "string" } } } }
          }
        },
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/subjects": {
      get: {
        tags: ["Subjects"],
        summary: "List subjects",
        parameters: [
          { name: "regulation", in: "query", schema: { type: "string" } },
          { name: "department", in: "query", schema: { type: "string" } },
          { name: "branch", in: "query", schema: { type: "string" } },
          { name: "year", in: "query", schema: { type: "string" } },
          { name: "semester", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/papers": {
      get: {
        tags: ["Papers"],
        summary: "List papers (supports hod_department routing)",
        parameters: [
          { name: "faculty_id", in: "query", schema: { type: "string" } },
          { name: "department", in: "query", schema: { type: "string" } },
          { name: "hod_department", in: "query", schema: { type: "string" } },
          { name: "branch", in: "query", schema: { type: "string" } },
          { name: "regulation", in: "query", schema: { type: "string" } },
          { name: "year", in: "query", schema: { type: "string" } },
          { name: "semester", in: "query", schema: { type: "string" } },
          { name: "mid_exam_type", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "OK" } }
      },
      post: { tags: ["Papers"], summary: "Create paper", responses: { "200": { description: "OK" } } }
    },
    "/api/papers/{id}": {
      get: {
        tags: ["Papers"],
        summary: "Get paper by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" }, "404": { description: "Not Found" } }
      },
      put: {
        tags: ["Papers"],
        summary: "Update paper (replaces questions)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/papers/{id}/status": {
      patch: {
        tags: ["Papers"],
        summary: "Update status (HOD approval)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/eval/student-lists": {
      post: {
        tags: ["Evaluation"],
        summary: "HOD upload student list (CSV/XLSX parsed client-side)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["hod_faculty_id", "department", "regulation", "year", "section", "students"],
                properties: {
                  hod_faculty_id: { type: "string" },
                  department: { type: "string" },
                  branch: { type: "string", description: "Required when department = H&S" },
                  regulation: { type: "string" },
                  year: { type: "string" },
                  section: { type: "string" },
                  students: {
                    type: "array",
                    items: { type: "object", required: ["roll_number", "student_name"], properties: { roll_number: { type: "string" }, student_name: { type: "string" } } }
                  }
                }
              }
            }
          }
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" }, "403": { description: "Forbidden" } }
      },
      get: {
        tags: ["Evaluation"],
        summary: "Fetch student list for department/reg/year/section",
        parameters: [
          { name: "department", in: "query", required: true, schema: { type: "string" } },
          { name: "branch", in: "query", required: false, schema: { type: "string" }, description: "Required when department = H&S" },
          { name: "regulation", in: "query", required: true, schema: { type: "string" } },
          { name: "year", in: "query", required: true, schema: { type: "string" } },
          { name: "section", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: { "200": { description: "OK" }, "404": { description: "Not Found" } }
      }
    },
    "/api/eval/marks/batch": {
      post: {
        tags: ["Evaluation"],
        summary: "Save marks (batch upsert per student)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["faculty_id", "department", "regulation", "year", "section", "mid_type", "subject_name", "subject_code", "entries"],
                properties: {
                  faculty_id: { type: "string" },
                  actor_id: { type: "string", description: "Optional. When HOD edits, set actor_id=HOD id and faculty_id=original faculty id." },
                  department: { type: "string" },
                  branch: { type: "string", description: "Required when department = H&S" },
                  regulation: { type: "string" },
                  year: { type: "string" },
                  section: { type: "string" },
                  mid_type: { type: "string" },
                  subject_name: { type: "string" },
                  subject_code: { type: "string" },
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["roll_number", "student_name"],
                      properties: {
                        roll_number: { type: "string" },
                        student_name: { type: "string" },
                        descriptive_marks: { type: "array", items: { type: "number" } },
                        mcq_marks: { type: "array", items: { type: "number" } },
                        fb_marks: { type: "array", items: { type: "number" } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" }, "403": { description: "Forbidden" } }
      }
    },
    "/api/eval/marks": {
      get: {
        tags: ["Evaluation"],
        summary: "Fetch saved marks for a list + subject",
        parameters: [
          { name: "department", in: "query", required: true, schema: { type: "string" } },
          { name: "branch", in: "query", required: false, schema: { type: "string" }, description: "Required when department = H&S" },
          { name: "regulation", in: "query", required: true, schema: { type: "string" } },
          { name: "year", in: "query", required: true, schema: { type: "string" } },
          { name: "section", in: "query", required: true, schema: { type: "string" } },
          { name: "mid_type", in: "query", required: true, schema: { type: "string" } },
          { name: "subject_code", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/eval/submit": {
      post: {
        tags: ["Evaluation"],
        summary: "Faculty submit evaluation for HOD review",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["faculty_id", "department", "regulation", "year", "section", "mid_type", "subject_name", "subject_code"],
                properties: {
                  faculty_id: { type: "string" },
                  department: { type: "string" },
                  branch: { type: "string", description: "Required when department = H&S" },
                  regulation: { type: "string" },
                  year: { type: "string" },
                  section: { type: "string" },
                  mid_type: { type: "string" },
                  subject_name: { type: "string" },
                  subject_code: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" }, "403": { description: "Forbidden" } }
      }
    },
    "/api/eval/submissions": {
      get: {
        tags: ["Evaluation"],
        summary: "HOD list submitted evaluations",
        parameters: [
          { name: "hod_faculty_id", in: "query", required: true, schema: { type: "string" } },
          { name: "department", in: "query", required: false, schema: { type: "string" } },
          { name: "branch", in: "query", required: false, schema: { type: "string" }, description: "Optional filter for H&S" },
          { name: "regulation", in: "query", required: false, schema: { type: "string" } },
          { name: "year", in: "query", required: false, schema: { type: "string" } },
          { name: "section", in: "query", required: false, schema: { type: "string" } },
          { name: "mid_type", in: "query", required: false, schema: { type: "string" } },
          { name: "subject_code", in: "query", required: false, schema: { type: "string" } }
        ],
        responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } }
      }
    }
  }
};
function mountSwagger(app2) {
  app2.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openApiSpec);
  });
  app2.get("/swagger", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Academix API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>body{margin:0;background:#fff;} .topbar{display:none;}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    </script>
  </body>
</html>`);
  });
}

// backend/routes/auth.ts
import express from "express";

// backend/routes/supabaseUtils.ts
function mapRoleDbToApi(role) {
  const r = String(role || "").trim();
  if (r.toLowerCase() === "admin") return "ADMIN";
  if (r.toLowerCase() === "faculty") return "FACULTY";
  if (r.toLowerCase() === "hod") return "HOD";
  if (r.toLowerCase() === "exambranch" || r.toLowerCase() === "exam_branch" || r.toLowerCase() === "exam branch") return "EXAM_BRANCH";
  return r.toUpperCase();
}
function mapRoleApiToDb(role) {
  const r = String(role || "").trim().toUpperCase();
  if (r === "ADMIN") return "Admin";
  if (r === "FACULTY") return "Faculty";
  if (r === "HOD") return "HOD";
  if (r === "EXAM_BRANCH") return "ExamBranch";
  return role;
}
async function requireUserByFacultyId(supabase2, facultyId) {
  const fid = String(facultyId || "").trim();
  if (!fid) return { ok: false, status: 400, error: "faculty_id is required" };
  const { data, error } = await supabase2.from("users").select("faculty_id,name,department,role,email,status").eq("faculty_id", fid).maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: "User not found" };
  if (String(data.status || "Active") === "Disabled") return { ok: false, status: 403, error: "Account is disabled" };
  return {
    ok: true,
    user: {
      faculty_id: data.faculty_id,
      name: data.name,
      department: data.department || "",
      role: mapRoleDbToApi(String(data.role || "")),
      email: data.email || "",
      status: data.status || "Active"
    }
  };
}

// backend/routes/passwordUtils.ts
import crypto from "crypto";
var KEYLEN = 64;
function hashPassword(password) {
  const pw = String(password || "");
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(pw, salt, KEYLEN);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}
function verifyPassword(password, stored) {
  const pw = String(password || "");
  const s = String(stored || "");
  if (!s.includes("$")) return s === pw;
  if (s.startsWith("scrypt$")) {
    const parts = s.split("$");
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], "base64");
    const expected = Buffer.from(parts[2], "base64");
    const actual = crypto.scryptSync(pw, salt, expected.length);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }
  return s === pw;
}

// backend/routes/authToken.ts
import crypto2 from "node:crypto";
function base64UrlEncode(input) {
  return Buffer.from(input, "utf8").toString("base64url");
}
function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}
function timingSafeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto2.timingSafeEqual(ab, bb);
}
function getSecret() {
  return String(process.env.AUTH_SECRET || "").trim() || "dev-insecure-secret";
}
function issueAuthToken(payload, ttlMs = 1e3 * 60 * 60 * 12) {
  const body = {
    v: 1,
    faculty_id: String(payload.faculty_id || "").trim(),
    role: String(payload.role || "").trim().toUpperCase(),
    exp_ms: Date.now() + ttlMs
  };
  const b64 = base64UrlEncode(JSON.stringify(body));
  const sig = crypto2.createHmac("sha256", getSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}
function readAuthTokenFromRequest(req) {
  const raw = String(req.header("authorization") || "");
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}
function verifyAuthToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return { ok: false, status: 401, error: "Missing token" };
  const parts = raw.split(".");
  if (parts.length !== 2) return { ok: false, status: 401, error: "Invalid token format" };
  const [b64, sig] = parts;
  const expected = crypto2.createHmac("sha256", getSecret()).update(b64).digest("base64url");
  if (!timingSafeEqual(sig, expected)) return { ok: false, status: 401, error: "Invalid token signature" };
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(b64));
  } catch {
    return { ok: false, status: 401, error: "Invalid token payload" };
  }
  if (!payload || payload.v !== 1) return { ok: false, status: 401, error: "Unsupported token version" };
  if (!payload.faculty_id) return { ok: false, status: 401, error: "Invalid token payload" };
  if (!payload.exp_ms || !Number.isFinite(payload.exp_ms)) return { ok: false, status: 401, error: "Invalid token payload" };
  if (Date.now() > payload.exp_ms) return { ok: false, status: 401, error: "Token expired" };
  return { ok: true, payload };
}

// backend/routes/auth.ts
function createAuthRouter(supabase2) {
  const router = express.Router();
  router.get("/api/admin/auth/exists", async (_req, res) => {
    try {
      const { data, error } = await supabase2.from("users").select("faculty_id").eq("role", "Admin").limit(1);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, exists: (data || []).length > 0 });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  async function requireAdminFromRequest(req) {
    const token = readAuthTokenFromRequest(req);
    if (!token) return null;
    const v = verifyAuthToken(token);
    if (!v.ok) return null;
    const check = await requireUserByFacultyId(supabase2, v.payload.faculty_id);
    if (!check.ok) return null;
    if (check.user.role !== "ADMIN") return null;
    return check.user;
  }
  router.post("/api/auth/signup", async (req, res) => {
    try {
      const body = req.body || {};
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
        const byToken = await requireAdminFromRequest(req);
        if (!byToken) {
          if (admin_faculty_id) {
            const adminCheck = await requireUserByFacultyId(supabase2, admin_faculty_id);
            if (!adminCheck.ok) return res.status(adminCheck.status).json({ error: adminCheck.error });
            if (adminCheck.user.role !== "ADMIN") return res.status(403).json({ error: "Only Admin can create accounts." });
          } else {
            const { data: anyAdmin, error: anyAdminErr } = await supabase2.from("users").select("faculty_id").eq("role", "Admin").limit(1);
            if (anyAdminErr) return res.status(500).json({ error: anyAdminErr.message });
            if ((anyAdmin || []).length > 0) return res.status(403).json({ error: "Admin already exists. Only Admin can create accounts." });
          }
        }
      } else {
        const allowPublicSignup = String(process.env.ALLOW_PUBLIC_SIGNUP || "").toLowerCase() === "true";
        const publicAllowedRoles = /* @__PURE__ */ new Set(["FACULTY", "HOD", "EXAM_BRANCH"]);
        if (allowPublicSignup && publicAllowedRoles.has(roleApi)) {
          if (!department) return res.status(400).json({ error: "department is required" });
        } else {
          const byToken = await requireAdminFromRequest(req);
          if (!byToken) {
            if (!admin_faculty_id) return res.status(403).json({ error: "Only Admin can create accounts." });
            const adminCheck = await requireUserByFacultyId(supabase2, admin_faculty_id);
            if (!adminCheck.ok) return res.status(adminCheck.status).json({ error: adminCheck.error });
            if (adminCheck.user.role !== "ADMIN") return res.status(403).json({ error: "Only Admin can create accounts." });
          }
        }
      }
      const roleDb = mapRoleApiToDb(roleApi);
      const passwordHash = hashPassword(password);
      const { error } = await supabase2.from("users").insert({
        faculty_id,
        name,
        email,
        password: passwordHash,
        department: roleApi === "EXAM_BRANCH" || roleApi === "ADMIN" ? "" : department,
        role: roleDb
      });
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.post("/api/auth/login", async (req, res) => {
    try {
      const body = req.body || {};
      const faculty_id = String(body.faculty_id || "").trim();
      const password = String(body.password || "");
      if (!faculty_id || !password) return res.status(400).json({ error: "faculty_id and password are required" });
      const { data, error } = await supabase2.from("users").select("faculty_id,name,department,role,email,status,password").eq("faculty_id", faculty_id).maybeSingle();
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
          status: data.status || "Active"
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.post("/api/admin/auth/signup", async (req, res) => {
    try {
      const body = req.body || {};
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!name) return res.status(400).json({ error: "name is required" });
      if (!email) return res.status(400).json({ error: "email is required" });
      if (!password) return res.status(400).json({ error: "password is required" });
      const { data: anyAdmin, error: anyAdminErr } = await supabase2.from("users").select("faculty_id").eq("role", "Admin").limit(1);
      if (anyAdminErr) return res.status(500).json({ error: anyAdminErr.message });
      if ((anyAdmin || []).length > 0) return res.status(403).json({ error: "Admin already exists. Please sign in." });
      const faculty_id = email;
      const { error: insErr } = await supabase2.from("users").insert({
        faculty_id,
        name,
        email,
        password: hashPassword(password),
        department: "",
        role: "Admin"
      });
      if (insErr) return res.status(400).json({ error: insErr.message });
      const token = issueAuthToken({ faculty_id, role: "ADMIN" });
      res.json({
        success: true,
        token,
        user: { faculty_id, name, email, department: "", role: "ADMIN", status: "Active" }
      });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.post("/api/admin/auth/login", async (req, res) => {
    try {
      const body = req.body || {};
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return res.status(400).json({ error: "email and password are required" });
      const { data, error } = await supabase2.from("users").select("faculty_id,name,department,role,email,status,password").eq("email", email).eq("role", "Admin").maybeSingle();
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
          status: data.status || "Active"
        }
      });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  return router;
}

// backend/routes/users.ts
import express2 from "express";
function createUsersRouter(supabase2) {
  const router = express2.Router();
  router.patch("/api/users/:id", async (req, res) => {
    const id = String(req.params.id || "").trim();
    const { name, email } = req.body;
    const { data: existing, error: findErr } = await supabase2.from("users").select("faculty_id,name,department,role,email,status").eq("faculty_id", id).maybeSingle();
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!existing) return res.status(404).json({ error: "User not found" });
    const nextName = String(name ?? existing.name ?? "").trim();
    if (!nextName) return res.status(400).json({ error: "Name is required" });
    const { error: updErr } = await supabase2.from("users").update({ name: nextName, email: String(email ?? "").trim() || null }).eq("faculty_id", id);
    if (updErr) return res.status(400).json({ error: updErr.message });
    const { data: updated, error: readErr } = await supabase2.from("users").select("faculty_id,name,department,role,email,status").eq("faculty_id", id).maybeSingle();
    if (readErr) return res.status(500).json({ error: readErr.message });
    res.json({
      success: true,
      user: {
        faculty_id: updated?.faculty_id || id,
        name: updated?.name || nextName,
        department: updated?.department || "",
        role: mapRoleDbToApi(String(updated?.role || existing.role || "")),
        email: updated?.email || "",
        status: updated?.status || existing.status || "Active"
      }
    });
  });
  return router;
}

// backend/routes/admin.ts
import express3 from "express";
function createAdminRouter(supabase2) {
  const router = express3.Router();
  async function requireAdmin(req, res) {
    const token = readAuthTokenFromRequest(req);
    let actor = "";
    if (token) {
      const v = verifyAuthToken(token);
      if (!v.ok) {
        res.status(v.status).json({ error: v.error });
        return null;
      }
      actor = v.payload.faculty_id;
    } else {
      actor = String(req.query.admin_faculty_id || "").trim();
      if (!actor) {
        res.status(400).json({ error: "admin_faculty_id is required" });
        return null;
      }
    }
    const adminCheck = await requireUserByFacultyId(supabase2, actor);
    if (!adminCheck.ok) {
      res.status(adminCheck.status).json({ error: adminCheck.error });
      return null;
    }
    if (adminCheck.user.role !== "ADMIN") {
      res.status(403).json({ error: "Only Admin can perform this action" });
      return null;
    }
    return adminCheck.user;
  }
  router.get("/api/admin/users", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const { data, error } = await supabase2.from("users").select("faculty_id,name,department,role,email,status").in("role", ["Faculty", "HOD", "ExamBranch"]).order("department", { ascending: true }).order("role", { ascending: true }).order("name", { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      res.json(
        (data || []).map((r) => ({
          faculty_id: r.faculty_id,
          name: r.name,
          department: r.department || "",
          role: mapRoleDbToApi(String(r.role || "")),
          email: r.email || "",
          status: r.status || "Active"
        }))
      );
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.put("/api/admin/users/:id", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = String(req.params.id || "").trim();
    const { faculty_id, name, department, role, status } = req.body;
    const { data: existing, error: findErr } = await supabase2.from("users").select("faculty_id,name,department,role,email,password,status").eq("faculty_id", id).maybeSingle();
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!existing) return res.status(404).json({ error: "User not found" });
    const nextId = String(faculty_id || "").trim();
    const nextName = String(name || "").trim();
    const nextDept = String(department || "").trim();
    const nextRole = String(role || "").trim();
    const nextStatus = String(status || "Active").trim();
    if (!nextId) return res.status(400).json({ error: "Faculty ID is required" });
    if (!nextName) return res.status(400).json({ error: "Name is required" });
    if (!["FACULTY", "HOD", "EXAM_BRANCH"].includes(nextRole.toUpperCase())) return res.status(400).json({ error: "Role must be Faculty, HOD, or Exam Branch" });
    if (nextRole.toUpperCase() !== "EXAM_BRANCH" && !nextDept) return res.status(400).json({ error: "Department is required" });
    if (!["Active", "Disabled"].includes(nextStatus)) return res.status(400).json({ error: "Invalid status" });
    try {
      if (nextId !== id) {
        const { data: conflict, error: conflictErr } = await supabase2.from("users").select("faculty_id").eq("faculty_id", nextId).maybeSingle();
        if (conflictErr) return res.status(500).json({ error: conflictErr.message });
        if (conflict) return res.status(400).json({ error: "Faculty ID already exists" });
      }
      const nextRoleDb = mapRoleApiToDb(nextRole);
      const deptForDb = nextRole.toUpperCase() === "EXAM_BRANCH" ? "" : nextDept;
      const { error: updErr } = await supabase2.from("users").update({ faculty_id: nextId, name: nextName, department: deptForDb, role: nextRoleDb, status: nextStatus }).eq("faculty_id", id);
      if (updErr) return res.status(400).json({ error: updErr.message });
      if (nextId !== id) {
        await supabase2.from("question_papers").update({ faculty_id: nextId }).eq("faculty_id", id);
        await supabase2.from("evaluations").update({ faculty_id: nextId }).eq("faculty_id", id);
        await supabase2.from("faculty_subjects").update({ faculty_id: nextId }).eq("faculty_id", id);
      }
      const { data: updated, error: readErr } = await supabase2.from("users").select("faculty_id,name,department,role,email,status").eq("faculty_id", nextId).maybeSingle();
      if (readErr) return res.status(500).json({ error: readErr.message });
      res.json({
        success: true,
        user: {
          faculty_id: updated?.faculty_id || nextId,
          name: updated?.name || nextName,
          department: updated?.department || deptForDb,
          role: mapRoleDbToApi(String(updated?.role || nextRoleDb)),
          email: updated?.email || "",
          status: updated?.status || nextStatus
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.patch("/api/admin/users/:id/status", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = String(req.params.id || "").trim();
    const { status } = req.body;
    const nextStatus = String(status || "").trim();
    if (!["Active", "Disabled"].includes(nextStatus)) return res.status(400).json({ error: "Invalid status" });
    try {
      const { error } = await supabase2.from("users").update({ status: nextStatus }).eq("faculty_id", id).in("role", ["Faculty", "HOD", "ExamBranch"]);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/api/admin/users/:id/reset-password", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = String(req.params.id || "").trim();
    const { new_password } = req.body;
    const pw = String(new_password || "");
    if (!pw) return res.status(400).json({ error: "New password is required" });
    try {
      const { error } = await supabase2.from("users").update({ password: hashPassword(pw) }).eq("faculty_id", id).in("role", ["Faculty", "HOD", "ExamBranch"]);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.get("/api/admin/data/:table", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const key = String(req.params.table || "").trim().toLowerCase();
      const allowed = {
        users: { table: "users", order: "created_at" },
        students: { table: "students", order: "uploaded_at" },
        question_papers: { table: "question_papers", order: "created_at" },
        evaluations: { table: "evaluations", order: "created_at" },
        student_marks: { table: "student_marks", order: "updated_at" }
      };
      const target = allowed[key];
      if (!target) return res.status(400).json({ error: "Invalid table. Use: users, students, question_papers, evaluations, student_marks" });
      let q = supabase2.from(target.table).select("*").limit(500);
      if (target.order) q = q.order(target.order, { ascending: false });
      const { data, error } = await q;
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, table: target.table, rows: data || [] });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  return router;
}

// backend/routes/subjects.ts
import express4 from "express";

// backend/routes/subjectCatalog.ts
var subjectsData = [
  // CSM — R22
  {
    department: "CSM",
    regulation: "R22",
    year: "II",
    semester: "I",
    subjects: [
      { name: "Mathematical and Statistical Foundations", code: "CS301PC" },
      { name: "Data Structures", code: "CS302PC" },
      { name: "Computer Organization and Architecture", code: "CS303PC" },
      { name: "Software Engineering", code: "CS304PC" },
      { name: "Operating Systems", code: "CS305PC" },
      { name: "Constitution of India", code: "*MC310" }
    ]
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "II",
    semester: "II",
    subjects: [
      { name: "Discrete Mathematics", code: "CS401PC" },
      { name: "Automata Theory and Compiler Design", code: "CS402PC" },
      { name: "Database Management Systems", code: "CS403PC" },
      { name: "Introduction to Artificial Intelligence", code: "CS404PC" },
      { name: "Object Oriented Programming through Java", code: "CS405PC" },
      { name: "Gender Sensitization Lab", code: "*MC410" }
    ]
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "III",
    semester: "I",
    subjects: [
      { name: "Design and Analysis of Algorithms", code: "AM501PC" },
      { name: "Machine Learning", code: "AM502PC" },
      { name: "Computer Networks", code: "AM503PC" },
      { name: "Business Economics & Financial Analysis", code: "SM504MS" },
      { name: "Web Programming", code: "AM513PE" }
    ]
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "III",
    semester: "II",
    subjects: [
      { name: "Knowledge Representation and Reasoning", code: "AM601PC" },
      { name: "Data Analytics", code: "AM602PC" },
      { name: "Natural Language Processing", code: "AM603PC" },
      { name: "Internet of Things", code: "AM731PE" },
      { name: "Software Testing Methodologies", code: "AM621PE" }
    ]
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "IV",
    semester: "I",
    subjects: [
      { name: "Deep Learning", code: "AM701PC" },
      { name: "Scripting Languages", code: "AM733PE" },
      { name: "Mobile Application Development Lab", code: "AM714PE" },
      { name: "Intellectual Property Rights", code: "MC510" }
    ]
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "IV",
    semester: "II",
    subjects: [
      { name: "Web Security", code: "AM854PE" },
      { name: "Project Work", code: "CS800PC" },
      { name: "Seminar", code: "CS801MC" }
    ]
  }
];
function normalizeDepartment(departmentRaw) {
  const d = String(departmentRaw || "").trim();
  if (!d) return "";
  const upperNoSpaces = d.toUpperCase().replace(/\s+/g, "");
  if (upperNoSpaces === "CSEAIML" || upperNoSpaces === "CSE-AIML" || upperNoSpaces === "AIML") return "CSM";
  return d.toUpperCase();
}
function normalizeSemester(semesterRaw) {
  const sem = String(semesterRaw || "").trim();
  const upper = sem.toUpperCase();
  if (upper === "I" || upper === "SEM I" || upper === "SEMESTER I") return "I";
  if (upper === "II" || upper === "SEM II" || upper === "SEMESTER II") return "II";
  return sem;
}
function normalizeYear(yearRaw) {
  const y = String(yearRaw || "").trim();
  if (!y) return "";
  const upper = y.toUpperCase();
  const roman = upper.match(/\b(I|II|III|IV)\b/);
  if (roman?.[1]) return roman[1];
  const numeric = upper.match(/\b([1-4])\b/);
  if (numeric?.[1]) {
    const map = { "1": "I", "2": "II", "3": "III", "4": "IV" };
    return map[numeric[1]] || upper;
  }
  return upper;
}
function getCatalogSubjects(params) {
  const department = normalizeDepartment(params.department);
  const regulation = String(params.regulation || "").trim().toUpperCase();
  const year = normalizeYear(params.year);
  const semester = normalizeSemester(params.semester);
  const row = subjectsData.find(
    (r) => r.department.toUpperCase() === department && r.regulation.toUpperCase() === regulation && r.year.toUpperCase() === year && r.semester.toUpperCase() === semester.toUpperCase()
  );
  return row?.subjects || [];
}

// backend/routes/subjectMaster.ts
var HS_DEPARTMENT = "H&S";
var CORE_DEPARTMENTS = ["CSM", "CSD", "CSE", "ECE"];
var ALL_DEPARTMENTS = [HS_DEPARTMENT, ...CORE_DEPARTMENTS];
var ALL_BRANCHES = [...CORE_DEPARTMENTS];
var HS_YEARS = ["I"];
var CORE_YEARS = ["II", "III", "IV"];
var ALL_YEARS = [...HS_YEARS, ...CORE_YEARS];
var ALL_SEMESTERS = ["I", "II"];
function norm(value) {
  return String(value || "").trim();
}
function normUpper(value) {
  return norm(value).toUpperCase();
}
function normalizeDepartment2(value) {
  const upper = normUpper(value);
  return upper === "H&S" ? HS_DEPARTMENT : upper;
}
function normalizeBranch(value) {
  return normUpper(value);
}
function normalizeYear2(value) {
  const upper = normUpper(value);
  if (!upper) return "";
  if (upper.startsWith("IV")) return "IV";
  if (upper.startsWith("III")) return "III";
  if (upper.startsWith("II")) return "II";
  if (upper.startsWith("I")) return "I";
  return upper;
}
function normalizeSemester2(value) {
  const upper = normUpper(value);
  if (!upper) return "";
  if (upper === "I" || upper === "SEM I" || upper === "SEMESTER I") return "I";
  if (upper === "II" || upper === "SEM II" || upper === "SEMESTER II") return "II";
  return upper;
}
function branchesForDepartment(department) {
  if (department === HS_DEPARTMENT) return [...ALL_BRANCHES];
  if (CORE_DEPARTMENTS.includes(department)) return [department];
  return [];
}
function yearsForDepartment(department) {
  if (department === HS_DEPARTMENT) return [...HS_YEARS];
  if (CORE_DEPARTMENTS.includes(department)) return [...CORE_YEARS];
  return [...ALL_YEARS];
}
function normalizeSubjectMasterInput(input) {
  const department = normalizeDepartment2(input.department);
  const branchRaw = normalizeBranch(input.branch);
  const yearRaw = normalizeYear2(input.year);
  const semester = normalizeSemester2(input.semester);
  const subject_name = norm(input.subject_name);
  const subject_code = normUpper(input.subject_code);
  const regulation = normUpper(input.regulation);
  if (!regulation) return { error: "regulation is required" };
  if (!department) return { error: "department is required" };
  if (!ALL_DEPARTMENTS.includes(department)) {
    return { error: `department must be one of ${ALL_DEPARTMENTS.join(", ")}` };
  }
  const allowedBranches = branchesForDepartment(department);
  const branch = branchRaw || (department !== HS_DEPARTMENT ? department : "");
  if (!branch) return { error: "branch is required" };
  if (!allowedBranches.includes(branch)) {
    return { error: department === HS_DEPARTMENT ? "invalid H&S branch" : "branch must match department" };
  }
  const year = department === HS_DEPARTMENT ? "I" : yearRaw;
  if (!year) return { error: "year is required" };
  if (!yearsForDepartment(department).includes(year)) {
    return { error: department === HS_DEPARTMENT ? "H&S subjects must belong to Year I only" : "core departments support only Years II, III, and IV" };
  }
  if (!semester) return { error: "semester is required" };
  if (!ALL_SEMESTERS.includes(semester)) {
    return { error: "semester must be I or II" };
  }
  if (!subject_name) return { error: "subject_name is required" };
  if (!subject_code) return { error: "subject_code is required" };
  return {
    value: {
      regulation,
      department,
      branch,
      year,
      semester,
      subject_name,
      subject_code,
      is_active: input.is_active === void 0 ? true : Boolean(input.is_active)
    }
  };
}
function isMissingSubjectMasterTableError(error) {
  const message = String(error?.message || "");
  return message.includes("subject_master") && (message.includes("does not exist") || message.includes("schema cache") || message.includes("Could not find the table"));
}

// backend/routes/subjects.ts
function createSubjectsRouter(supabase2) {
  const router = express4.Router();
  const normalize = (v) => String(v || "").trim();
  const buildCatalogRows = (params) => {
    const regulation = normalize(params.regulation);
    const department = normalize(params.department);
    const year = normalize(params.year);
    const semester = normalize(params.semester);
    if (!regulation || !department || !year || !semester) return [];
    if (regulation.toUpperCase() !== "R22") return [];
    const list = getCatalogSubjects({ department, regulation, year, semester }).slice();
    list.sort((a, b) => a.name.localeCompare(b.name, void 0, { sensitivity: "base" }));
    return list.map((s, idx) => ({
      id: idx + 1,
      regulation,
      department,
      branch: normalize(params.branch),
      year,
      semester,
      subject_name: s.name,
      subject_code: s.code
    }));
  };
  const expandSemester = (semesterRaw) => {
    const sem = normalize(semesterRaw);
    const upper = sem.toUpperCase();
    if (!sem) return [];
    if (upper === "I" || upper === "SEM I" || upper === "SEMESTER I") return ["I", "Sem I", "Semester I", "SEM I", "SEMESTER I"];
    if (upper === "II" || upper === "SEM II" || upper === "SEMESTER II") return ["II", "Sem II", "Semester II", "SEM II", "SEMESTER II"];
    return [sem];
  };
  const expandYear = (yearRaw) => {
    const y = normalize(yearRaw);
    const upper = y.toUpperCase();
    if (!y) return [];
    if (["I", "II", "III", "IV"].includes(upper)) return [upper, `${upper} Year`, `${upper} YEAR`];
    return [y];
  };
  const buildLegacyQuery = (params) => {
    let q = supabase2.from("subjects").select("id,regulation,department,branch,year,semester,subject_name,subject_code").order("subject_name", { ascending: true });
    if (params.regulation) q = q.eq("regulation", normalize(params.regulation));
    if (params.department) q = q.eq("department", normalizeDepartment2(params.department));
    if (params.branch) q = q.eq("branch", normalize(params.branch));
    const dept = normalizeDepartment2(params.department);
    const years = expandYear(normalizeYear2(params.year));
    if (dept !== "H&S") {
      if (years.length === 1) q = q.eq("year", years[0]);
      else if (years.length > 1) q = q.in("year", years);
    }
    const semesters = expandSemester(normalizeSemester2(params.semester));
    if (semesters.length === 1) q = q.eq("semester", semesters[0]);
    else if (semesters.length > 1) q = q.in("semester", semesters);
    return q;
  };
  router.get("/api/subjects", async (req, res) => {
    const { regulation, department, branch, year, semester } = req.query;
    const catalogRows = buildCatalogRows({ regulation, department, branch, year, semester });
    try {
      let q = supabase2.from("subject_master").select("id,regulation,department,branch,year,semester,subject_name,subject_code,is_active").eq("is_active", true).order("subject_name", { ascending: true });
      if (regulation) q = q.eq("regulation", normalize(regulation));
      if (department) q = q.eq("department", normalizeDepartment2(department));
      if (branch) q = q.eq("branch", normalize(branch));
      const years = expandYear(normalizeYear2(year));
      if (years.length === 1) q = q.eq("year", years[0]);
      else if (years.length > 1) q = q.in("year", years);
      const semesters = expandSemester(normalizeSemester2(semester));
      if (semesters.length === 1) q = q.eq("semester", semesters[0]);
      else if (semesters.length > 1) q = q.in("semester", semesters);
      const { data, error } = await q;
      if (error && isMissingSubjectMasterTableError(error)) {
        const { data: legacyData, error: legacyError } = await buildLegacyQuery({ regulation, department, branch, year, semester });
        if (!legacyError && (legacyData || []).length) {
          return res.json((legacyData || []).map((row) => ({
            ...row,
            year: row?.year || (String(row?.department || "").trim() === "H&S" ? "I" : row?.year || ""),
            branch: row?.branch || (String(row?.department || "").trim() === "H&S" ? "" : String(row?.department || "").trim()),
            is_active: true
          })));
        }
        if (catalogRows.length) return res.json(catalogRows);
        if (legacyError) return res.status(400).json({ error: legacyError.message });
        return res.json([]);
      }
      if (error) {
        if (catalogRows.length) return res.json(catalogRows);
        return res.status(400).json({ error: error.message });
      }
      const rows = data || [];
      if (rows.length) return res.json(rows);
    } catch (error) {
      if (catalogRows.length) return res.json(catalogRows);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
    if (catalogRows.length) return res.json(catalogRows);
    return res.json([]);
  });
  return router;
}

// backend/routes/papers.ts
import express5 from "express";
function asSetBuckets(questions) {
  const subjective = [];
  const mcqs = [];
  const blanks = [];
  for (const q of questions || []) {
    const base = {
      id: q.id,
      set_type: q.set_type || null,
      question_text: q.question_text,
      marks: q.marks,
      co_level: q.co_number || null,
      btl_level: q.btl_level || null
    };
    if (q.question_type === "subjective") subjective.push(base);
    else if (q.question_type === "mcq") {
      mcqs.push({
        ...base,
        option_A: q.options?.option_A ?? q.options?.A ?? "",
        option_B: q.options?.option_B ?? q.options?.B ?? "",
        option_C: q.options?.option_C ?? q.options?.C ?? "",
        option_D: q.options?.option_D ?? q.options?.D ?? "",
        correct_answer: q.correct_answer ?? ""
      });
    } else if (q.question_type === "fill_blank") {
      blanks.push({ ...base, correct_answer: q.correct_answer ?? "" });
    }
  }
  return { subjective, mcqs, blanks };
}
function createPapersRouter(supabase2) {
  const router = express5.Router();
  router.get("/api/papers", async (req, res) => {
    try {
      const query = req.query;
      let faculty_id = String(query.faculty_id || "").trim();
      let department = String(query.department || "").trim();
      let branch = String(query.branch || "").trim();
      let regulation = String(query.regulation || "").trim();
      let year = String(query.year || "").trim();
      let semester = String(query.semester || "").trim();
      let mid_exam_type = String(query.mid_exam_type || "").trim();
      let status = String(query.status || "").trim();
      let hod_department = String(query.hod_department || "").trim();
      const subject_code = String(query.subject_code || "").trim();
      const subject_name = String(query.subject_name || "").trim();
      const actorId = String(query.actor_faculty_id || "").trim();
      if (actorId) {
        const actorCheck = await requireUserByFacultyId(supabase2, actorId);
        if (!actorCheck.ok) return res.status(actorCheck.status).json({ error: actorCheck.error });
        const actorRole = actorCheck.user.role;
        if (actorRole === "FACULTY") {
          faculty_id = actorCheck.user.faculty_id;
          hod_department = "";
        } else if (actorRole === "HOD") {
          faculty_id = "";
          hod_department = actorCheck.user.department;
        } else if (actorRole === "EXAM_BRANCH") {
          faculty_id = "";
          hod_department = "";
          status = "Approved";
        } else if (actorRole === "ADMIN") {
        }
      }
      let q = supabase2.from("question_papers").select("*");
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
      if (subject_code) q = q.eq("subject_code", subject_code);
      if (subject_name) q = q.eq("subject_name", subject_name);
      q = q.order("created_at", { ascending: false });
      const { data: papers, error } = await q;
      if (error) return res.status(400).json({ error: error.message });
      const facultyIds = Array.from(new Set((papers || []).map((p) => p.faculty_id).filter(Boolean)));
      const facultyMap = /* @__PURE__ */ new Map();
      if (facultyIds.length) {
        const { data: users } = await supabase2.from("users").select("faculty_id,name").in("faculty_id", facultyIds);
        for (const u of users || []) facultyMap.set(u.faculty_id, u.name);
      }
      res.json(
        (papers || []).map((p) => ({
          ...p,
          id: p.id,
          faculty_name: facultyMap.get(p.faculty_id) || "",
          mid_exam_type: p.mid_type
        }))
      );
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.get("/api/papers/:id", async (req, res) => {
    const id = String(req.params.id || "").trim();
    const { data: paper, error } = await supabase2.from("question_papers").select("*").eq("id", id).maybeSingle();
    if (error) return res.status(400).json({ error: error.message });
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    const { data: user } = await supabase2.from("users").select("name").eq("faculty_id", paper.faculty_id).maybeSingle();
    const { data: questions, error: qErr } = await supabase2.from("questions").select("*").eq("paper_id", id);
    if (qErr) return res.status(400).json({ error: qErr.message });
    const buckets = asSetBuckets(questions || []);
    res.json({
      ...paper,
      id: paper.id,
      faculty_name: user?.name || "",
      mid_exam_type: paper.mid_type,
      ...buckets
    });
  });
  router.post("/api/papers", async (req, res) => {
    const { faculty_id, department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status, set1, set2 } = req.body;
    const { data: inserted, error } = await supabase2.from("question_papers").insert({
      faculty_id,
      department,
      branch: branch || "",
      regulation,
      year,
      semester,
      mid_type: mid_exam_type,
      subject_name,
      subject_code,
      status
    }).select("id").single();
    if (error) return res.status(400).json({ error: error.message });
    const paperId = inserted.id;
    const questions = [];
    const pushSet = (set, setType) => {
      for (const q of set?.subjective || []) {
        questions.push({
          paper_id: paperId,
          question_type: "subjective",
          question_text: q.question_text,
          marks: q.marks,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType
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
          correct_answer: q.correct_answer
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
          correct_answer: q.correct_answer
        });
      }
    };
    if (set1) pushSet(set1, "Set 1");
    if (set2) pushSet(set2, "Set 2");
    if (questions.length) {
      const { error: qErr } = await supabase2.from("questions").insert(questions);
      if (qErr) return res.status(400).json({ error: qErr.message });
    }
    res.json({ success: true, id: paperId });
  });
  router.patch("/api/papers/:id/status", async (req, res) => {
    const id = String(req.params.id || "").trim();
    const { status, hod_comments } = req.body;
    const { error } = await supabase2.from("question_papers").update({ status, hod_comments: hod_comments || null }).eq("id", id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });
  router.put("/api/papers/:id", async (req, res) => {
    const paperId = String(req.params.id || "").trim();
    const { department, branch, regulation, year, semester, mid_exam_type, subject_name, subject_code, status, hod_comments, set1, set2 } = req.body;
    const { error } = await supabase2.from("question_papers").update({
      department,
      branch: branch || "",
      regulation,
      year,
      semester,
      mid_type: mid_exam_type,
      subject_name,
      subject_code,
      status,
      hod_comments: hod_comments || null
    }).eq("id", paperId);
    if (error) return res.status(400).json({ error: error.message });
    const { error: delErr } = await supabase2.from("questions").delete().eq("paper_id", paperId);
    if (delErr) return res.status(400).json({ error: delErr.message });
    const questions = [];
    const pushSet = (set, setType) => {
      for (const q of set?.subjective || []) {
        questions.push({
          paper_id: paperId,
          question_type: "subjective",
          question_text: q.question_text,
          marks: q.marks,
          co_number: q.co_level || null,
          btl_level: q.btl_level || null,
          set_type: setType
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
          correct_answer: q.correct_answer
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
          correct_answer: q.correct_answer
        });
      }
    };
    if (set1) pushSet(set1, "Set 1");
    if (set2) pushSet(set2, "Set 2");
    if (questions.length) {
      const { error: insErr } = await supabase2.from("questions").insert(questions);
      if (insErr) return res.status(400).json({ error: insErr.message });
    }
    res.json({ success: true });
  });
  return router;
}

// backend/routes/evaluation.ts
import express6 from "express";
function normalizeYear3(input) {
  return String(input || "").trim().toUpperCase();
}
function normalizeSection(input) {
  return String(input || "").trim().toUpperCase();
}
function normalizeReg(input) {
  return String(input || "").trim().toUpperCase();
}
function normalizeSemester3(input) {
  return String(input || "").trim().toUpperCase();
}
function normalizeMidType(input) {
  const value = String(input || "").trim();
  if (value === "Mid1") return "Mid I";
  if (value === "Mid2") return "Mid II";
  return value;
}
function normalizeDescriptiveMark(value) {
  if (!Number.isFinite(Number(value))) return null;
  const parsed = Number(value);
  return parsed >= 0 && parsed <= 5 ? parsed : null;
}
function normalizeObjectiveMark(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? 0.5 : 0;
}
function bestFourDescriptiveTotal(values) {
  return (values || []).map((v) => normalizeDescriptiveMark(v)).filter((v) => v !== null).sort((a, b) => b - a).slice(0, 4).reduce((sum, v) => sum + v, 0);
}
function objectiveSectionTotal(values) {
  return (values || []).reduce((sum, value) => sum + (normalizeObjectiveMark(value) ?? 0), 0);
}
function assignmentSectionTotal(values) {
  return (values || []).reduce((sum, value) => sum + (normalizeAssignmentMark(value) ?? 0), 0);
}
function normalizeAssignmentMark(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > 1) return null;
  return parsed >= 1 ? 1 : 0;
}
function normalizeAssignmentMarksObject(value) {
  const out = {};
  for (let i = 0; i < 5; i++) {
    const key = `A${i + 1}`;
    const mark = normalizeAssignmentMark(value?.[key]);
    out[key] = mark ?? 0;
  }
  return out;
}
function normalizeAssignmentCoMap(value) {
  const out = {};
  for (let i = 0; i < 5; i++) {
    const key = `A${i + 1}`;
    const next = String(value?.[key] || `CO${i + 1}`).trim().toUpperCase();
    out[key] = ["CO1", "CO2", "CO3", "CO4", "CO5"].includes(next) ? next : `CO${i + 1}`;
  }
  return out;
}
function normalizePptMark(value, maxMarks = 5) {
  if (value === null || value === void 0 || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > maxMarks) return null;
  return parsed;
}
function isMissingFinalMarksTableError(error) {
  const message = String(error?.message || "");
  return message.includes("evaluation_final_marks") && (message.includes("does not exist") || message.includes("schema cache") || message.includes("Could not find the table"));
}
function isMissingStudentMarksColumnError(error) {
  const message = String(error?.message || "");
  return message.includes("student_marks") && (message.includes("assignment_marks") || message.includes("assignment_total") || message.includes("assignment_co_map") || message.includes("grand_total")) && (message.includes("does not exist") || message.includes("schema cache") || message.includes("Could not find"));
}
function evaluationTotal(descriptive, mcq, fb, assignment) {
  return bestFourDescriptiveTotal(descriptive) + objectiveSectionTotal(mcq || []) + objectiveSectionTotal(fb || []) + assignmentSectionTotal(assignment || []);
}
function createEvaluationRouter(supabase2) {
  const router = express6.Router();
  function canHodAccessDepartment(hodDept, targetDept) {
    return hodDept === targetDept;
  }
  async function facultyHasAssignedSubject(input) {
    let query = supabase2.from("faculty_subjects").select("id", { head: true, count: "exact" }).eq("faculty_id", String(input.faculty_id || "").trim()).eq("department", String(input.department || "").trim()).eq("regulation", normalizeReg(input.regulation)).eq("year", normalizeYear3(input.year)).eq("subject_code", String(input.subject_code || "").trim().toUpperCase());
    const semester = normalizeSemester3(input.semester);
    if (semester) query = query.eq("semester", semester);
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    if (Number(count || 0) > 0) return true;
    const department = String(input.department || "").trim();
    const legacyBranch = department === "H&S" ? String(input.branch || "").trim().toUpperCase() : "";
    let legacyQuery = supabase2.from("faculty_subjects").select("id", { head: true, count: "exact" }).eq("faculty_id", String(input.faculty_id || "").trim()).eq("department", department).eq("branch", legacyBranch).eq("regulation", normalizeReg(input.regulation)).eq("year", normalizeYear3(input.year)).eq("subject_code", String(input.subject_code || "").trim().toUpperCase());
    if (semester) legacyQuery = legacyQuery.eq("semester", semester);
    const { count: legacyCount, error: legacyError } = await legacyQuery;
    if (legacyError) throw new Error(legacyError.message);
    return Number(legacyCount || 0) > 0;
  }
  async function fetchSubmittedMidEvaluations(input) {
    const { data, error } = await supabase2.from("evaluations").select("id,mid_type,status,submitted_at").eq("department", input.department).eq("branch", input.branch).eq("regulation", input.regulation).eq("year", input.year).eq("section", input.section).eq("subject_code", input.subject_code).in("mid_type", ["Mid I", "Mid II", "Mid1", "Mid2"]);
    if (error) throw new Error(error.message);
    const byMid = /* @__PURE__ */ new Map();
    for (const row of data || []) {
      const key = normalizeMidType(row.mid_type);
      const existing = byMid.get(key);
      if (!existing || String(row.submitted_at || "") > String(existing.submitted_at || "")) {
        byMid.set(key, row);
      }
    }
    return {
      mid1: byMid.get("Mid I") || null,
      mid2: byMid.get("Mid II") || null
    };
  }
  async function fetchStudentTotalsByEvaluationId(evaluationId) {
    const { data, error } = await supabase2.from("student_marks").select("roll_number,student_name,total_marks").eq("evaluation_id", evaluationId);
    if (error) throw new Error(error.message);
    const totals = /* @__PURE__ */ new Map();
    for (const row of data || []) {
      totals.set(String(row.roll_number || "").trim(), {
        student_name: String(row.student_name || "").trim(),
        total: Number(row.total_marks ?? 0)
      });
    }
    return totals;
  }
  async function buildFinalMarksState(input) {
    const mids = await fetchSubmittedMidEvaluations(input);
    const mid1Submitted = mids.mid1?.status === "submitted";
    const mid2Submitted = mids.mid2?.status === "submitted";
    const canEnterPpt = mid1Submitted && mid2Submitted;
    const mid1Totals = mids.mid1?.id ? await fetchStudentTotalsByEvaluationId(mids.mid1.id) : /* @__PURE__ */ new Map();
    const mid2Totals = mids.mid2?.id ? await fetchStudentTotalsByEvaluationId(mids.mid2.id) : /* @__PURE__ */ new Map();
    const { data: finalRowsData, error: finalError } = await supabase2.from("evaluation_final_marks").select("*").eq("department", input.department).eq("branch", input.branch).eq("regulation", input.regulation).eq("year", input.year).eq("semester", input.semester).eq("section", input.section).eq("subject_code", input.subject_code).order("roll_number", { ascending: true });
    if (finalError && !isMissingFinalMarksTableError(finalError)) throw new Error(finalError.message);
    const finalRows = isMissingFinalMarksTableError(finalError) ? [] : finalRowsData || [];
    const finalByRoll = /* @__PURE__ */ new Map();
    for (const row of finalRows) finalByRoll.set(String(row.roll_number || "").trim(), row);
    const rolls = Array.from(/* @__PURE__ */ new Set([
      ...Array.from(mid1Totals.keys()),
      ...Array.from(mid2Totals.keys()),
      ...Array.from(finalByRoll.keys())
    ])).sort((a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" }));
    const rows = rolls.map((roll_number) => {
      const mid1 = mid1Totals.get(roll_number);
      const mid2 = mid2Totals.get(roll_number);
      const finalRow = finalByRoll.get(roll_number);
      const pptMarks = Number(finalRow?.ppt_marks ?? 0);
      const mid1Total = Number(finalRow?.mid1_total ?? mid1?.total ?? 0);
      const mid2Total = Number(finalRow?.mid2_total ?? mid2?.total ?? 0);
      return {
        roll_number,
        student_name: String(finalRow?.student_name || mid1?.student_name || mid2?.student_name || "").trim(),
        mid1_total: mid1Total,
        mid2_total: mid2Total,
        ppt_marks: pptMarks,
        ppt_max_marks: Number(finalRow?.ppt_max_marks ?? 5),
        final_total: Number(finalRow?.final_total ?? mid1Total + mid2Total + pptMarks),
        status: String(finalRow?.status || "draft")
      };
    });
    return {
      mid1Submitted,
      mid2Submitted,
      canEnterPpt,
      finalSubmitted: rows.length > 0 && rows.every((row) => row.status === "submitted"),
      rows
    };
  }
  function buildStudentListId(department, branch, regulation, year, semester, section) {
    return `${department}:${branch}:${regulation}:${year}:${semester}:${section}`;
  }
  function buildStudentListFileName(list) {
    const parts = ["students", list.regulation, list.year];
    if (list.semester) parts.push(list.semester);
    if (list.branch) parts.push(list.branch);
    parts.push(list.section);
    return `${parts.join("_")}.csv`;
  }
  async function fetchStudentListRows(input) {
    const baseQuery = () => supabase2.from("students").select("roll_number,student_name,department,branch,regulation,year,semester,section,uploaded_by,uploaded_at").eq("department", input.department).eq("branch", input.branch).eq("regulation", input.regulation).eq("year", input.year).eq("section", input.section).order("roll_number", { ascending: true });
    const { data: exactRows, error: exactErr } = await baseQuery().eq("semester", input.semester);
    if (exactErr) throw new Error(exactErr.message);
    if ((exactRows || []).length) {
      return { rows: exactRows || [], matchedSemester: input.semester, usedLegacyFallback: false };
    }
    const { data: legacyRows, error: legacyErr } = await baseQuery().eq("semester", "");
    if (legacyErr) throw new Error(legacyErr.message);
    if ((legacyRows || []).length) {
      return {
        rows: legacyRows || [],
        matchedSemester: input.semester,
        usedLegacyFallback: true
      };
    }
    const { data: anySemesterRows, error: anySemesterErr } = await baseQuery();
    if (anySemesterErr) throw new Error(anySemesterErr.message);
    const matchedSemester = String(anySemesterRows?.[0]?.semester || input.semester).trim();
    return {
      rows: anySemesterRows || [],
      matchedSemester,
      usedLegacyFallback: true
    };
  }
  async function checkStudentListAvailability(input) {
    const exact = await supabase2.from("students").select("id", { head: true, count: "exact" }).eq("department", input.department).eq("branch", input.branch).eq("regulation", input.regulation).eq("year", input.year).eq("semester", input.semester).eq("section", input.section);
    if (exact.error) throw new Error(exact.error.message);
    const exactCount = Number(exact.count || 0);
    if (exactCount > 0) return { exists: true, count: exactCount, usedLegacyFallback: false };
    const legacy = await supabase2.from("students").select("id", { head: true, count: "exact" }).eq("department", input.department).eq("branch", input.branch).eq("regulation", input.regulation).eq("year", input.year).eq("semester", "").eq("section", input.section);
    if (legacy.error) throw new Error(legacy.error.message);
    return { exists: Number(legacy.count || 0) > 0, count: Number(legacy.count || 0), usedLegacyFallback: true };
  }
  function summarizeStudentLists(rows) {
    const grouped = /* @__PURE__ */ new Map();
    for (const row of rows || []) {
      const department = String(row.department || "").trim();
      const branch = String(row.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(row.regulation);
      const year = normalizeYear3(row.year);
      const semester = normalizeSemester3(row.semester);
      const section = normalizeSection(row.section);
      const id = buildStudentListId(department, branch, regulation, year, semester, section);
      const existing = grouped.get(id);
      if (!existing) {
        grouped.set(id, {
          id,
          department,
          branch,
          regulation,
          year,
          semester,
          section,
          uploaded_by: String(row.uploaded_by || "").trim(),
          uploaded_at: String(row.uploaded_at || "").trim(),
          file_name: buildStudentListFileName({ regulation, year, semester, section, branch }),
          count: 1
        });
        continue;
      }
      existing.count += 1;
      if (String(row.uploaded_at || "") >= existing.uploaded_at) {
        existing.uploaded_at = String(row.uploaded_at || "").trim();
        existing.uploaded_by = String(row.uploaded_by || "").trim();
      }
    }
    return Array.from(grouped.values()).sort((a, b) => String(b.uploaded_at || "").localeCompare(String(a.uploaded_at || "")));
  }
  router.post("/api/eval/student-lists", async (req, res) => {
    try {
      const body = req.body || {};
      const hod_faculty_id = String(body.hod_faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear3(body.year);
      const semester = normalizeSemester3(body.semester);
      const section = normalizeSection(body.section);
      const students = Array.isArray(body.students) ? body.students : [];
      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!students.length) return res.status(400).json({ error: "students are required" });
      const hodCheck = await requireUserByFacultyId(supabase2, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can upload student lists" });
      if (!canHodAccessDepartment(String(hod.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });
      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S uploads are allowed only for year I" });
      }
      const cleanStudents = [];
      for (const s of students) {
        const roll = String(s?.roll_number || s?.roll || "").trim();
        const name = String(s?.student_name || s?.name || "").trim();
        if (!roll || !name) continue;
        cleanStudents.push({ roll_number: roll, student_name: name });
      }
      if (!cleanStudents.length) return res.status(400).json({ error: "No valid students found" });
      const effectiveBranch = department === "H&S" ? branch : "";
      const uploadedAt = (/* @__PURE__ */ new Date()).toISOString();
      const { error: delErr } = await supabase2.from("students").delete().eq("department", department).eq("branch", effectiveBranch).eq("regulation", regulation).eq("year", year).eq("semester", semester).eq("section", section);
      if (delErr) return res.status(400).json({ error: delErr.message });
      const toInsert = cleanStudents.map((s) => ({
        roll_number: s.roll_number,
        student_name: s.student_name,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester: semester || "",
        section,
        uploaded_by: hod_faculty_id,
        uploaded_at: uploadedAt
      }));
      const { error: insErr, count } = await supabase2.from("students").insert(toInsert, { count: "exact" });
      if (insErr) return res.status(400).json({ error: insErr.message });
      res.json({
        success: true,
        list_id: buildStudentListId(department, effectiveBranch, regulation, year, semester || "", section),
        count: typeof count === "number" ? count : cleanStudents.length
      });
    } catch (error) {
      console.error("Student list upload error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.get("/api/eval/student-lists", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear3(req.query.year);
      const semester = normalizeSemester3(req.query.semester);
      const section = normalizeSection(req.query.section);
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
      const { rows, matchedSemester } = await fetchStudentListRows({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section
      });
      if (!rows || rows.length === 0) return res.status(404).json({ error: "Student list not found" });
      let uploaded_by = rows[0].uploaded_by || "";
      let uploaded_at = rows[0].uploaded_at || "";
      for (const r of rows) {
        if (r.uploaded_at && (!uploaded_at || String(r.uploaded_at) > String(uploaded_at))) {
          uploaded_at = r.uploaded_at;
          uploaded_by = r.uploaded_by || uploaded_by;
        }
      }
      const students = rows.map((r) => ({ roll_number: r.roll_number, student_name: r.student_name }));
      res.json({
        success: true,
        matchedSemester,
        list: {
          id: buildStudentListId(department, effectiveBranch, regulation, year, matchedSemester, section),
          department,
          branch: effectiveBranch,
          regulation,
          year,
          semester: matchedSemester,
          section,
          uploaded_by,
          uploaded_at,
          students
        }
      });
    } catch (error) {
      console.error("Student list fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.get("/api/eval/student-lists/manage", async (req, res) => {
    try {
      const hod_faculty_id = String(req.query.hod_faculty_id || "").trim();
      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });
      const hodCheck = await requireUserByFacultyId(supabase2, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can manage student lists" });
      const { data: rows, error } = await supabase2.from("students").select("department,branch,regulation,year,semester,section,uploaded_by,uploaded_at").eq("department", String(hod.department || "").trim()).order("uploaded_at", { ascending: false });
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, lists: summarizeStudentLists(rows || []) });
    } catch (error) {
      console.error("Student list management fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.get("/api/eval/student-lists/availability", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear3(req.query.year);
      const semester = normalizeSemester3(req.query.semester);
      const section = normalizeSection(req.query.section);
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
      const availability = await checkStudentListAvailability({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section
      });
      res.json({ success: true, exists: availability.exists, count: availability.count });
    } catch (error) {
      console.error("Student list availability error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.delete("/api/eval/student-lists", async (req, res) => {
    try {
      const body = req.body || {};
      const hod_faculty_id = String(body.hod_faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear3(body.year);
      const semester = normalizeSemester3(body.semester);
      const section = normalizeSection(body.section);
      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      const hodCheck = await requireUserByFacultyId(supabase2, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can delete student lists" });
      if (!canHodAccessDepartment(String(hod.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });
      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
      const runDelete = async (semesterValue) => supabase2.from("students").delete({ count: "exact" }).eq("department", department).eq("branch", effectiveBranch).eq("regulation", regulation).eq("year", year).eq("semester", semesterValue).eq("section", section);
      let deletedCount = 0;
      if (semester) {
        const { error, count } = await runDelete(semester);
        if (error) return res.status(400).json({ error: error.message });
        deletedCount += Number(count || 0);
      } else {
        const { error, count } = await runDelete("");
        if (error) return res.status(400).json({ error: error.message });
        deletedCount += Number(count || 0);
      }
      res.json({ success: true, deleted: deletedCount });
    } catch (error) {
      console.error("Student list delete error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.post("/api/eval/marks/batch", async (req, res) => {
    try {
      const body = req.body || {};
      const faculty_id = String(body.faculty_id || "").trim();
      const actor_id = String(body.actor_id || faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear3(body.year);
      const semester = normalizeSemester3(body.semester);
      const section = normalizeSection(body.section);
      const mid_type = String(body.mid_type || "").trim();
      const subject_name = String(body.subject_name || "").trim();
      const subject_code = String(body.subject_code || "").trim().toUpperCase();
      const assignment_co_map = normalizeAssignmentCoMap(body.assignment_co_map || {});
      const entries = Array.isArray(body.entries) ? body.entries : [];
      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      if (!entries.length) return res.status(400).json({ error: "entries are required" });
      const actorCheck = await requireUserByFacultyId(supabase2, actor_id);
      if (!actorCheck.ok) return res.status(actorCheck.status).json({ error: actorCheck.error });
      const actor = actorCheck.user;
      const targetCheck = await requireUserByFacultyId(supabase2, faculty_id);
      if (!targetCheck.ok) return res.status(targetCheck.status).json({ error: targetCheck.error });
      if (actor.role !== "FACULTY" && actor.role !== "HOD") return res.status(403).json({ error: "Only Faculty/HOD can save marks" });
      if (actor.role === "FACULTY" && actor.faculty_id !== faculty_id) return res.status(403).json({ error: "Faculty can only edit their own marks" });
      if (actor.role === "HOD" && !canHodAccessDepartment(String(actor.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });
      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are allowed only for year I" });
      }
      const effectiveBranch = department === "H&S" ? branch : "";
      const hasAssignedSubject = await facultyHasAssignedSubject({
        faculty_id,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        subject_code
      });
      if (!hasAssignedSubject) return res.status(403).json({ error: "Faculty subject allocation mismatch" });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { data: existingEval, error: findErr } = await supabase2.from("evaluations").select("id,status,submitted_at").eq("department", department).eq("branch", effectiveBranch).eq("regulation", regulation).eq("year", year).eq("section", section).eq("mid_type", mid_type).eq("subject_code", subject_code).maybeSingle();
      if (findErr) return res.status(400).json({ error: findErr.message });
      let evaluationId = existingEval?.id;
      if (!evaluationId) {
        const { data: created, error: createErr } = await supabase2.from("evaluations").insert({
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
          updated_at: now
        }).select("id").single();
        if (createErr) return res.status(400).json({ error: createErr.message });
        evaluationId = created.id;
      } else {
        await supabase2.from("evaluations").update({ faculty_id, subject_name, updated_at: now }).eq("id", evaluationId);
      }
      const rows = [];
      for (const e of entries) {
        const roll_number = String(e?.roll_number || "").trim();
        const student_name = String(e?.student_name || "").trim();
        if (!roll_number || !student_name) continue;
        const d = Array.isArray(e.descriptive_marks) ? e.descriptive_marks : [];
        const m = Array.isArray(e.mcq_marks) ? e.mcq_marks : [];
        const f = Array.isArray(e.fb_marks) ? e.fb_marks : [];
        const assignmentMarksObject = normalizeAssignmentMarksObject(e.assignment_marks || {});
        const assignmentValues = Array.from({ length: 5 }, (_, i) => assignmentMarksObject[`A${i + 1}`] ?? 0);
        const assignmentTotal = assignmentSectionTotal(assignmentValues);
        const total = evaluationTotal(d, m, f, assignmentValues);
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
          assignment_marks: assignmentMarksObject,
          assignment_total: assignmentTotal,
          assignment_co_map,
          total_marks: total,
          updated_at: now
        });
      }
      if (!rows.length) return res.status(400).json({ error: "No valid entries found" });
      const { error: upErr } = await supabase2.from("student_marks").upsert(rows, { onConflict: "evaluation_id,roll_number" });
      if (upErr && isMissingStudentMarksColumnError(upErr)) {
        const legacyRows = rows.map((row) => {
          const { assignment_marks, assignment_total, assignment_co_map: assignment_co_map2, grand_total, ...legacyRow } = row;
          void assignment_marks;
          void assignment_total;
          void assignment_co_map2;
          void grand_total;
          return legacyRow;
        });
        const { error: legacyUpErr } = await supabase2.from("student_marks").upsert(legacyRows, { onConflict: "evaluation_id,roll_number" });
        if (legacyUpErr) return res.status(400).json({ error: legacyUpErr.message });
      } else if (upErr) {
        return res.status(400).json({ error: upErr.message });
      }
      await supabase2.from("evaluations").update({ updated_at: now }).eq("id", evaluationId);
      res.json({ success: true, saved: rows.length });
    } catch (error) {
      console.error("Marks save error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.get("/api/eval/marks", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear3(req.query.year);
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
      const { data: evaluation, error: eErr } = await supabase2.from("evaluations").select("id").eq("department", department).eq("branch", effectiveBranch).eq("regulation", regulation).eq("year", year).eq("section", section).eq("mid_type", mid_type).eq("subject_code", subject_code).maybeSingle();
      if (eErr) return res.status(400).json({ error: eErr.message });
      if (!evaluation) return res.json({ success: true, marks: [] });
      const { data: rows, error } = await supabase2.from("student_marks").select("*").eq("evaluation_id", evaluation.id).order("roll_number", { ascending: true });
      if (error) return res.status(400).json({ error: error.message });
      const assignmentCoMap = rows?.find((r) => r.assignment_co_map && typeof r.assignment_co_map === "object")?.assignment_co_map || normalizeAssignmentCoMap({});
      res.json({
        success: true,
        assignment_co_map: assignmentCoMap,
        marks: (rows || []).map((r) => ({
          roll_number: r.roll_number,
          student_name: r.student_name || "",
          descriptive_marks: [r.q1, r.q2, r.q3, r.q4, r.q5, r.q6].map((v) => v === null || v === void 0 ? null : Number(v)),
          mcq_marks: [r.mcq1, r.mcq2, r.mcq3, r.mcq4, r.mcq5, r.mcq6, r.mcq7, r.mcq8, r.mcq9, r.mcq10].map((v) => v === null || v === void 0 ? null : Number(v)),
          fb_marks: [r.fb1, r.fb2, r.fb3, r.fb4, r.fb5, r.fb6, r.fb7, r.fb8, r.fb9, r.fb10].map((v) => v === null || v === void 0 ? null : Number(v)),
          assignment_marks: normalizeAssignmentMarksObject(r.assignment_marks || {}),
          assignment_total: Number(r.assignment_total || 0),
          grand_total: Number(r.grand_total ?? r.total_marks ?? 0)
        }))
      });
    } catch (error) {
      console.error("Marks fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.get("/api/eval/final-marks", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear3(req.query.year);
      const semester = normalizeSemester3(req.query.semester);
      const section = normalizeSection(req.query.section);
      const subject_code = String(req.query.subject_code || "").trim().toUpperCase();
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
      const state = await buildFinalMarksState({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
        subject_code
      });
      res.json({ success: true, ...state, pptMaxMarks: state.rows[0]?.ppt_max_marks ?? 5 });
    } catch (error) {
      console.error("Final marks fetch error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.post("/api/eval/final-marks/save", async (req, res) => {
    try {
      const body = req.body || {};
      const faculty_id = String(body.faculty_id || "").trim();
      const actor_id = String(body.actor_id || faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear3(body.year);
      const semester = normalizeSemester3(body.semester);
      const section = normalizeSection(body.section);
      const subject_name = String(body.subject_name || "").trim();
      const subject_code = String(body.subject_code || "").trim().toUpperCase();
      const pptMaxMarks = Number(body.ppt_max_marks ?? 5);
      const entries = Array.isArray(body.entries) ? body.entries : [];
      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      if (!entries.length) return res.status(400).json({ error: "entries are required" });
      if (!Number.isFinite(pptMaxMarks) || pptMaxMarks <= 0) return res.status(400).json({ error: "ppt_max_marks must be greater than 0" });
      const actorCheck = await requireUserByFacultyId(supabase2, actor_id);
      if (!actorCheck.ok) return res.status(actorCheck.status).json({ error: actorCheck.error });
      const actor = actorCheck.user;
      if (actor.role !== "FACULTY" && actor.role !== "HOD") return res.status(403).json({ error: "Only Faculty/HOD can save final marks" });
      if (actor.role === "FACULTY" && actor.faculty_id !== faculty_id) return res.status(403).json({ error: "Faculty can only edit their own final marks" });
      if (actor.role === "HOD" && !canHodAccessDepartment(String(actor.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });
      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S") {
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are allowed only for year I" });
      }
      const hasAssignedSubject = await facultyHasAssignedSubject({
        faculty_id,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        subject_code
      });
      if (!hasAssignedSubject) return res.status(403).json({ error: "Faculty subject allocation mismatch" });
      const state = await buildFinalMarksState({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
        subject_code
      });
      if (!state.canEnterPpt) {
        return res.status(400).json({ error: "PPT marks can be entered only after Mid 1 and Mid 2 submission." });
      }
      const stateByRoll = new Map(state.rows.map((row) => [row.roll_number, row]));
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const rows = [];
      for (const entry of entries) {
        const roll_number = String(entry?.roll_number || "").trim();
        const student_name = String(entry?.student_name || "").trim();
        if (!roll_number || !student_name) continue;
        const prior = stateByRoll.get(roll_number);
        const pptMarks = normalizePptMark(entry?.ppt_marks, pptMaxMarks);
        if (pptMarks === null) return res.status(400).json({ error: `Invalid PPT marks for ${roll_number}` });
        const mid1Total = Number(prior?.mid1_total ?? 0);
        const mid2Total = Number(prior?.mid2_total ?? 0);
        rows.push({
          faculty_id,
          department,
          branch: effectiveBranch,
          regulation,
          year,
          semester,
          section,
          subject_name,
          subject_code,
          roll_number,
          student_name,
          mid1_total: mid1Total,
          mid2_total: mid2Total,
          ppt_marks: pptMarks ?? 0,
          ppt_max_marks: pptMaxMarks,
          final_total: mid1Total + mid2Total + (pptMarks ?? 0),
          status: "draft",
          submitted_at: null,
          updated_at: now
        });
      }
      if (!rows.length) return res.status(400).json({ error: "No valid PPT rows found" });
      const { error } = await supabase2.from("evaluation_final_marks").upsert(rows, { onConflict: "department,branch,regulation,year,semester,section,subject_code,roll_number" });
      if (error && isMissingFinalMarksTableError(error)) {
        return res.status(400).json({ error: "PPT final marks table is missing. Run database/migrations/2026-04-06-add-evaluation-final-marks.sql before saving PPT marks." });
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, saved: rows.length });
    } catch (error) {
      console.error("Final marks save error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.post("/api/eval/final-marks/submit", async (req, res) => {
    try {
      const body = req.body || {};
      const faculty_id = String(body.faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear3(body.year);
      const semester = normalizeSemester3(body.semester);
      const section = normalizeSection(body.section);
      const subject_code = String(body.subject_code || "").trim().toUpperCase();
      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      const userCheck = await requireUserByFacultyId(supabase2, faculty_id);
      if (!userCheck.ok) return res.status(userCheck.status).json({ error: userCheck.error });
      const user = userCheck.user;
      if (user.role !== "FACULTY") return res.status(403).json({ error: "Only Faculty can submit final marks" });
      const effectiveBranch = department === "H&S" ? branch : "";
      const state = await buildFinalMarksState({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
        subject_code
      });
      if (!state.canEnterPpt) return res.status(400).json({ error: "PPT marks can be entered only after Mid 1 and Mid 2 submission." });
      if (!state.rows.length) return res.status(400).json({ error: "Save PPT marks before submitting final marks." });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { error } = await supabase2.from("evaluation_final_marks").update({ status: "submitted", submitted_at: now, updated_at: now }).eq("department", department).eq("branch", effectiveBranch).eq("regulation", regulation).eq("year", year).eq("semester", semester).eq("section", section).eq("subject_code", subject_code);
      if (error && isMissingFinalMarksTableError(error)) {
        return res.status(400).json({ error: "PPT final marks table is missing. Run database/migrations/2026-04-06-add-evaluation-final-marks.sql before submitting final marks." });
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (error) {
      console.error("Final marks submit error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.post("/api/eval/submit", async (req, res) => {
    try {
      const body = req.body || {};
      const faculty_id = String(body.faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear3(body.year);
      const semester = normalizeSemester3(body.semester);
      const section = normalizeSection(body.section);
      const mid_type = String(body.mid_type || "").trim();
      const subject_name = String(body.subject_name || "").trim();
      const subject_code = String(body.subject_code || "").trim().toUpperCase();
      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      const userCheck = await requireUserByFacultyId(supabase2, faculty_id);
      if (!userCheck.ok) return res.status(userCheck.status).json({ error: userCheck.error });
      const user = userCheck.user;
      if (user.role !== "FACULTY") return res.status(403).json({ error: "Only Faculty can submit evaluations" });
      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S") {
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S submissions are only for year I" });
      }
      const hasAssignedSubject = await facultyHasAssignedSubject({
        faculty_id,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        subject_code
      });
      if (!hasAssignedSubject) return res.status(403).json({ error: "Faculty subject allocation mismatch" });
      const { data: evaluation, error: eErr } = await supabase2.from("evaluations").select("id").eq("department", department).eq("branch", effectiveBranch).eq("regulation", regulation).eq("year", year).eq("section", section).eq("mid_type", mid_type).eq("subject_code", subject_code).maybeSingle();
      if (eErr) return res.status(400).json({ error: eErr.message });
      if (!evaluation) return res.status(400).json({ error: "No marks saved yet. Please save marks before submitting." });
      const { count, error: countErr } = await supabase2.from("student_marks").select("id", { count: "exact", head: true }).eq("evaluation_id", evaluation.id);
      if (countErr) return res.status(400).json({ error: countErr.message });
      if (!count) return res.status(400).json({ error: "No marks saved yet. Please save marks before submitting." });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { error: updErr } = await supabase2.from("evaluations").update({ status: "submitted", submitted_at: now, updated_at: now, faculty_id, subject_name }).eq("id", evaluation.id);
      if (updErr) return res.status(400).json({ error: updErr.message });
      res.json({ success: true });
    } catch (error) {
      console.error("Submit error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  router.get("/api/eval/submissions", async (req, res) => {
    try {
      const hod_faculty_id = String(req.query.hod_faculty_id || "").trim();
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear3(req.query.year);
      const section = normalizeSection(req.query.section);
      const mid_type = String(req.query.mid_type || "").trim();
      const subject_code = String(req.query.subject_code || "").trim().toUpperCase();
      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });
      const hodCheck = await requireUserByFacultyId(supabase2, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can view submissions" });
      const hodDept = String(hod.department || "").trim();
      const targetDept = department || hodDept;
      if (!canHodAccessDepartment(hodDept, targetDept)) return res.status(403).json({ error: "HOD department mismatch" });
      let q = supabase2.from("evaluations").select("*").eq("department", targetDept).eq("status", "submitted");
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
      const facultyIds = Array.from(new Set((rows || []).map((r) => r.faculty_id).filter(Boolean)));
      const facultyMap = /* @__PURE__ */ new Map();
      if (facultyIds.length) {
        const { data: users } = await supabase2.from("users").select("faculty_id,name").in("faculty_id", facultyIds);
        for (const u of users || []) facultyMap.set(u.faculty_id, u.name);
      }
      res.json({
        success: true,
        submissions: (rows || []).map((r) => ({
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
          updated_at: r.updated_at
        }))
      });
    } catch (error) {
      console.error("Submissions list error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  return router;
}

// backend/routes/facultySubjects.ts
import express7 from "express";
function norm2(v) {
  return String(v || "").trim();
}
function normUpper2(v) {
  return norm2(v).toUpperCase();
}
function createFacultySubjectsRouter(supabase2) {
  const router = express7.Router();
  let facultySubjectsHasBranch = null;
  async function hasFacultySubjectsBranch() {
    if (facultySubjectsHasBranch !== null) return facultySubjectsHasBranch;
    const { error } = await supabase2.from("faculty_subjects").select("branch", { head: true, count: "exact" }).limit(1);
    facultySubjectsHasBranch = !error;
    return facultySubjectsHasBranch;
  }
  function assignmentSelect(includeBranch) {
    return includeBranch ? "id,faculty_id,faculty_name,department,branch,regulation,year,semester,subject_name,subject_code,created_at" : "id,faculty_id,faculty_name,department,regulation,year,semester,subject_name,subject_code,created_at";
  }
  function withBranchFallback(rows, includeBranch) {
    if (includeBranch) return rows || [];
    return (rows || []).map((row) => ({ ...row, branch: "" }));
  }
  async function requireAdmin(req, res) {
    const token = readAuthTokenFromRequest(req);
    let actor = "";
    if (token) {
      const v = verifyAuthToken(token);
      if (!v.ok) {
        res.status(v.status).json({ error: v.error });
        return null;
      }
      actor = v.payload.faculty_id;
    } else {
      actor = norm2(req.query.admin_faculty_id);
      if (!actor) {
        res.status(400).json({ error: "admin_faculty_id is required" });
        return null;
      }
    }
    const adminCheck = await requireUserByFacultyId(supabase2, actor);
    if (!adminCheck.ok) {
      res.status(adminCheck.status).json({ error: adminCheck.error });
      return null;
    }
    if (adminCheck.user.role !== "ADMIN") {
      res.status(403).json({ error: "Only Admin can perform this action" });
      return null;
    }
    return adminCheck.user;
  }
  router.get("/api/faculty/subjects", async (req, res) => {
    try {
      const token = readAuthTokenFromRequest(req);
      let faculty_id = "";
      if (token) {
        const v = verifyAuthToken(token);
        if (!v.ok) return res.status(v.status).json({ error: v.error });
        faculty_id = v.payload.faculty_id;
      } else {
        faculty_id = norm2(req.query.faculty_id);
      }
      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      const check = await requireUserByFacultyId(supabase2, faculty_id);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
      const includeBranch = await hasFacultySubjectsBranch();
      const { data, error } = await supabase2.from("faculty_subjects").select(assignmentSelect(includeBranch)).eq("faculty_id", faculty_id).order("created_at", { ascending: false });
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, assignments: withBranchFallback(data, includeBranch) });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.post("/api/admin/faculty-subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const body = req.body || {};
      const faculty_id = norm2(body.faculty_id);
      const regulation = normUpper2(body.regulation);
      const year = normalizeYear2(body.year);
      const semester = normalizeSemester2(body.semester);
      const subject_name = norm2(body.subject_name);
      const subject_code = normUpper2(body.subject_code);
      const branchFromBody = normUpper2(body.branch);
      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      const { data: faculty, error: fErr } = await supabase2.from("users").select("faculty_id,name,department,role,status").eq("faculty_id", faculty_id).maybeSingle();
      if (fErr) return res.status(500).json({ error: fErr.message });
      if (!faculty) return res.status(404).json({ error: "Faculty not found" });
      if (String(faculty.status || "Active") === "Disabled") return res.status(403).json({ error: "Account is disabled" });
      if (String(faculty.role || "").toLowerCase() !== "faculty") return res.status(400).json({ error: "Assignments can be created only for Faculty accounts" });
      const effectiveDepartment = normalizeDepartment2(faculty.department);
      if (!effectiveDepartment) return res.status(400).json({ error: "Faculty department is missing" });
      const includeBranch = await hasFacultySubjectsBranch();
      const effectiveBranch = effectiveDepartment === HS_DEPARTMENT ? branchFromBody : effectiveDepartment;
      const normalizedSubject = normalizeSubjectMasterInput({
        regulation,
        department: effectiveDepartment,
        branch: effectiveBranch,
        year,
        semester,
        subject_name,
        subject_code
      });
      if ("error" in normalizedSubject) return res.status(400).json({ error: normalizedSubject.error });
      const subjectRow = normalizedSubject.value;
      const { data: masterSubject, error: masterSubjectError } = await supabase2.from("subject_master").select("id,subject_name,subject_code").eq("regulation", subjectRow.regulation).eq("department", subjectRow.department).eq("branch", subjectRow.branch).eq("year", subjectRow.year).eq("semester", subjectRow.semester).eq("subject_code", subjectRow.subject_code).eq("is_active", true).maybeSingle();
      if (masterSubjectError && isMissingSubjectMasterTableError(masterSubjectError)) {
        return res.status(400).json({ error: "subject_master table is missing. Run the latest Supabase migration first." });
      }
      if (masterSubjectError) return res.status(400).json({ error: masterSubjectError.message });
      if (!masterSubject) {
        return res.status(400).json({ error: "Selected subject was not found in subject_master for the chosen regulation, department, branch, year, and semester" });
      }
      let existingQuery = supabase2.from("faculty_subjects").select("id").eq("faculty_id", faculty_id).eq("regulation", subjectRow.regulation).eq("year", subjectRow.year).eq("semester", subjectRow.semester).eq("subject_code", subjectRow.subject_code);
      if (includeBranch) existingQuery = existingQuery.eq("branch", subjectRow.branch);
      const { data: existing, error: exErr } = await existingQuery.maybeSingle();
      if (exErr) return res.status(400).json({ error: exErr.message });
      if (existing) return res.status(400).json({ error: "This subject is already assigned to the selected faculty for the selected term" });
      const payload = {
        faculty_id,
        faculty_name: String(faculty.name || "").trim(),
        department: subjectRow.department,
        regulation: subjectRow.regulation,
        year: subjectRow.year,
        semester: subjectRow.semester,
        subject_name: masterSubject.subject_name,
        subject_code: masterSubject.subject_code,
        subject_master_id: masterSubject.id
      };
      if (includeBranch) payload.branch = subjectRow.branch;
      const { data: created, error: insErr } = await supabase2.from("faculty_subjects").insert(payload).select(assignmentSelect(includeBranch)).single();
      if (insErr) return res.status(400).json({ error: insErr.message });
      const assignment = includeBranch ? created : {
        ...created && typeof created === "object" ? created : {},
        branch: ""
      };
      res.json({ success: true, assignment });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.get("/api/admin/faculty-subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const faculty_id = norm2(req.query.faculty_id);
      const department = norm2(req.query.department);
      const branch = normUpper2(req.query.branch);
      const regulation = normUpper2(req.query.regulation);
      const year = normUpper2(req.query.year);
      const semester = norm2(req.query.semester);
      const role = normUpper2(req.query.role);
      void role;
      const q = norm2(req.query.q);
      const includeBranch = await hasFacultySubjectsBranch();
      let query = supabase2.from("faculty_subjects").select(assignmentSelect(includeBranch)).order("created_at", { ascending: false });
      if (faculty_id) query = query.eq("faculty_id", faculty_id);
      if (department) query = query.eq("department", department);
      if (branch && includeBranch) query = query.eq("branch", branch);
      if (regulation) query = query.eq("regulation", regulation);
      if (year) query = query.eq("year", year);
      if (semester) query = query.eq("semester", semester);
      if (q) {
        const like = `%${q.replace(/%/g, "")}%`;
        query = includeBranch ? query.or(`faculty_name.ilike.${like},faculty_id.ilike.${like},subject_name.ilike.${like},subject_code.ilike.${like},branch.ilike.${like}`) : query.or(`faculty_name.ilike.${like},faculty_id.ilike.${like},subject_name.ilike.${like},subject_code.ilike.${like}`);
      }
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, assignments: withBranchFallback(data, includeBranch) });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  return router;
}

// backend/routes/adminSubjects.ts
import express8 from "express";
function norm3(v) {
  return String(v || "").trim();
}
function normUpper3(v) {
  return norm3(v).toUpperCase();
}
function legacySelect() {
  return "id,regulation,department,branch,year,semester,subject_name,subject_code";
}
function createAdminSubjectsRouter(supabase2) {
  const router = express8.Router();
  async function requireAdmin(req, res) {
    const token = readAuthTokenFromRequest(req);
    let actor = "";
    if (token) {
      const v = verifyAuthToken(token);
      if (!v.ok) {
        res.status(v.status).json({ error: v.error });
        return null;
      }
      actor = v.payload.faculty_id;
    } else {
      actor = norm3(req.query.admin_faculty_id);
      if (!actor) {
        res.status(400).json({ error: "admin_faculty_id is required" });
        return null;
      }
    }
    const adminCheck = await requireUserByFacultyId(supabase2, actor);
    if (!adminCheck.ok) {
      res.status(adminCheck.status).json({ error: adminCheck.error });
      return null;
    }
    if (adminCheck.user.role !== "ADMIN") {
      res.status(403).json({ error: "Only Admin can perform this action" });
      return null;
    }
    return adminCheck.user;
  }
  router.get("/api/admin/subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const regulation = normUpper3(req.query.regulation);
      const department = normalizeDepartment2(req.query.department);
      const branch = normUpper3(req.query.branch);
      const year = normalizeYear2(req.query.year);
      const semester = normalizeSemester2(req.query.semester);
      const q = norm3(req.query.q);
      const is_active = norm3(req.query.is_active);
      let query = supabase2.from("subject_master").select("id,regulation,department,branch,year,semester,subject_name,subject_code,is_active,created_at,updated_at").order("regulation", { ascending: true }).order("department", { ascending: true }).order("branch", { ascending: true }).order("year", { ascending: true }).order("semester", { ascending: true }).order("subject_name", { ascending: true }).limit(500);
      if (regulation) query = query.eq("regulation", regulation);
      if (department) query = query.eq("department", department);
      if (branch) query = query.eq("branch", branch);
      if (year) query = query.eq("year", year);
      if (semester) query = query.eq("semester", semester);
      if (is_active === "true") query = query.eq("is_active", true);
      if (is_active === "false") query = query.eq("is_active", false);
      if (q) {
        const like = `%${q.replace(/%/g, "")}%`;
        query = query.or(`subject_name.ilike.${like},subject_code.ilike.${like}`);
      }
      const { data, error } = await query;
      if (error && isMissingSubjectMasterTableError(error)) {
        let legacyQuery = supabase2.from("subjects").select(legacySelect()).order("regulation", { ascending: true }).order("department", { ascending: true }).order("branch", { ascending: true }).order("year", { ascending: true }).order("semester", { ascending: true }).order("subject_name", { ascending: true }).limit(500);
        if (regulation) legacyQuery = legacyQuery.eq("regulation", regulation);
        if (department) legacyQuery = legacyQuery.eq("department", department);
        if (branch) legacyQuery = legacyQuery.eq("branch", branch);
        if (semester) legacyQuery = legacyQuery.eq("semester", semester);
        if (year && department !== "H&S") legacyQuery = legacyQuery.eq("year", year);
        if (q) {
          const like = `%${q.replace(/%/g, "")}%`;
          legacyQuery = legacyQuery.or(`subject_name.ilike.${like},subject_code.ilike.${like}`);
        }
        const { data: legacyData, error: legacyError } = await legacyQuery;
        if (legacyError) return res.status(400).json({ error: legacyError.message });
        return res.json({
          success: true,
          subjects: (legacyData || []).map((row) => ({
            ...row,
            year: row?.year || (String(row?.department || "").trim() === "H&S" ? "I" : row?.year || ""),
            branch: row?.branch || (String(row?.department || "").trim() === "H&S" ? "" : String(row?.department || "").trim()),
            is_active: true,
            created_at: null,
            updated_at: null
          })),
          warning: "Using legacy subjects table. Run the subject_master migration when convenient."
        });
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, subjects: data || [] });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  router.post("/api/admin/subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const body = req.body || {};
      const normalized = normalizeSubjectMasterInput(body);
      if ("error" in normalized) return res.status(400).json({ error: normalized.error });
      const row = normalized.value;
      const { data: duplicate, error: duplicateError } = await supabase2.from("subject_master").select("id").eq("regulation", row.regulation).eq("branch", row.branch).eq("year", row.year).eq("semester", row.semester).eq("subject_code", row.subject_code).limit(1).maybeSingle();
      if (duplicateError && isMissingSubjectMasterTableError(duplicateError)) {
        const legacyRow = {
          regulation: row.regulation,
          department: row.department,
          branch: row.branch,
          year: row.department === "H&S" ? null : row.year,
          semester: row.semester,
          subject_name: row.subject_name,
          subject_code: row.subject_code
        };
        const { data: created, error: legacySaveError } = await supabase2.from("subjects").upsert(legacyRow, { onConflict: "regulation,department,branch,year,semester,subject_code" }).select(legacySelect()).single();
        if (legacySaveError) return res.status(400).json({ error: legacySaveError.message });
        if (!created || typeof created !== "object") {
          return res.status(500).json({ error: "Legacy subject save did not return a row" });
        }
        const createdRow = created;
        return res.json({
          success: true,
          subject: {
            ...createdRow,
            year: createdRow.year || (createdRow.department === "H&S" ? "I" : createdRow.year || ""),
            is_active: true,
            created_at: null,
            updated_at: null
          },
          warning: "Saved to legacy subjects table because subject_master is not available yet."
        });
      }
      if (duplicateError) return res.status(400).json({ error: duplicateError.message });
      if (duplicate) {
        const { data: existing, error: existingError } = await supabase2.from("subject_master").select("id,subject_name").eq("id", duplicate.id).maybeSingle();
        if (existingError) return res.status(400).json({ error: existingError.message });
        if (existing && String(existing.subject_name || "") !== row.subject_name) {
          return res.status(400).json({ error: "Duplicate subject code already exists for the selected regulation, branch, year, and semester" });
        }
      }
      const payload = {
        ...row,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { data, error } = await supabase2.from("subject_master").upsert(payload, { onConflict: "regulation,department,branch,year,semester,subject_code" }).select("id,regulation,department,branch,year,semester,subject_name,subject_code,is_active,created_at,updated_at").single();
      if (error && isMissingSubjectMasterTableError(error)) {
        return res.status(400).json({
          error: "subject_master table is missing. Run the latest Supabase migration before using Admin Subject Management."
        });
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, subject: data });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });
  return router;
}

// backend/app.ts
function createApp(opts) {
  const { supabase: supabase2, apiOnly, serveStatic, distDir } = opts;
  const app2 = express9();
  app2.use(express9.json());
  app2.get("/api", (_req, res) => {
    res.json({
      ok: true,
      message: "Academix API",
      endpoints: {
        health: "/api/health",
        subjects: "/api/subjects?regulation=R22&department=CSM&year=II&semester=I",
        login: "POST /api/auth/login",
        signup: "POST /api/auth/signup",
        swagger: "/swagger"
      }
    });
  });
  app2.get("/api/health", async (_req, res) => {
    const rawUrl = process.env.SUPABASE_URL || "";
    let host = "";
    try {
      host = rawUrl ? new URL(rawUrl).hostname : "";
    } catch {
      host = "";
    }
    let dnsOk = false;
    let dnsError = null;
    if (host) {
      try {
        await dns.lookup(host);
        dnsOk = true;
      } catch (e) {
        dnsError = e?.message || String(e);
      }
    }
    let fetchOk = false;
    let fetchStatus = null;
    let fetchError = null;
    if (rawUrl) {
      try {
        const target = new URL("/rest/v1/", rawUrl).toString();
        const r = await fetch(target, {
          method: "GET",
          headers: {
            apikey: process.env.SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ""}`
          }
        });
        fetchOk = true;
        fetchStatus = r.status;
      } catch (e) {
        fetchError = {
          message: e?.message || String(e),
          code: e?.code,
          cause: e?.cause?.message || e?.cause
        };
      }
    }
    try {
      const { error: usersErr } = await supabase2.from("users").select("id", { head: true, count: "exact" }).limit(1);
      if (usersErr) {
        return res.status(500).json({
          ok: false,
          supabase: false,
          supabaseUrlHost: host,
          dnsOk,
          dnsError,
          fetchOk,
          fetchStatus,
          fetchError,
          error: usersErr.message
        });
      }
      const { error: facultySubjectsErr } = await supabase2.from("faculty_subjects").select("id,branch", { head: true, count: "exact" }).limit(1);
      return res.json({
        ok: true,
        supabase: true,
        supabaseUrlHost: host,
        dnsOk,
        dnsError,
        fetchOk,
        fetchStatus,
        fetchError,
        tables: {
          users: true,
          faculty_subjects: !facultySubjectsErr
        },
        warnings: facultySubjectsErr ? [
          {
            table: "faculty_subjects",
            error: facultySubjectsErr.message,
            hint: "Run database/supabase-schema.sql, or the targeted migration database/migrations/2026-03-25-add-branch-to-faculty-subjects.sql, in the Supabase SQL editor and wait a moment for the API schema cache to refresh."
          }
        ] : []
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        supabase: false,
        supabaseUrlHost: host,
        dnsOk,
        dnsError,
        fetchOk,
        fetchStatus,
        fetchError,
        error: e?.message || String(e)
      });
    }
  });
  mountSwagger(app2);
  app2.use(createAuthRouter(supabase2));
  app2.use(createUsersRouter(supabase2));
  app2.use(createAdminRouter(supabase2));
  app2.use(createAdminSubjectsRouter(supabase2));
  app2.use(createFacultySubjectsRouter(supabase2));
  app2.use(createSubjectsRouter(supabase2));
  app2.use(createPapersRouter(supabase2));
  app2.use(createEvaluationRouter(supabase2));
  app2.use((err, _req, res, _next) => {
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });
  if (!apiOnly && serveStatic) {
    app2.use(express9.static(distDir));
    app2.get(["/", "/admin", "/admin/*"], (_req, res) => res.sendFile(path.join(distDir, "index.html")));
  } else {
    app2.get("/", (_req, res) => res.redirect("/swagger"));
  }
  app2.use((_req, res) => res.status(404).json({ error: "Not Found" }));
  return app2;
}

// database/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!supabaseAnonKey) throw new Error("Missing SUPABASE_ANON_KEY");
var supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// api/_index.ts
var app = createApp({
  supabase,
  apiOnly: true,
  serveStatic: false,
  distDir: ""
});
var index_default = app;
export {
  index_default as default
};
