import type express from "express";

export const openApiSpec = {
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
                  role: { type: "string", enum: ["FACULTY", "HOD", "EXAM_BRANCH", "ADMIN"] },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" } },
      },
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
                properties: { faculty_id: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" }, "403": { description: "Disabled" } },
      },
    },
    "/api/users/{id}": {
      patch: {
        tags: ["Users"],
        summary: "Update own profile (name/email only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } } },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/admin/users": {
      get: { tags: ["Admin"], summary: "List Faculty/HOD users", responses: { "200": { description: "OK" } } },
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
                  status: { type: "string", enum: ["Active", "Disabled"] },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/admin/users/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Disable/Enable account",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["Active", "Disabled"] } } } },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/admin/users/{id}/reset-password": {
      post: {
        tags: ["Admin"],
        summary: "Reset password (dedicated action)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { type: "object", required: ["new_password"], properties: { new_password: { type: "string" } } } },
          },
        },
        responses: { "200": { description: "OK" } },
      },
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
          { name: "semester", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
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
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: { tags: ["Papers"], summary: "Create paper", responses: { "200": { description: "OK" } } },
    },
    "/api/papers/{id}": {
      get: {
        tags: ["Papers"],
        summary: "Get paper by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" }, "404": { description: "Not Found" } },
      },
      put: {
        tags: ["Papers"],
        summary: "Update paper (replaces questions)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/papers/{id}/status": {
      patch: {
        tags: ["Papers"],
        summary: "Update status (HOD approval)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" } },
      },
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
                    items: { type: "object", required: ["roll_number", "student_name"], properties: { roll_number: { type: "string" }, student_name: { type: "string" } } },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" }, "403": { description: "Forbidden" } },
      },
      get: {
        tags: ["Evaluation"],
        summary: "Fetch student list for department/reg/year/section",
        parameters: [
          { name: "department", in: "query", required: true, schema: { type: "string" } },
          { name: "branch", in: "query", required: false, schema: { type: "string" }, description: "Required when department = H&S" },
          { name: "regulation", in: "query", required: true, schema: { type: "string" } },
          { name: "year", in: "query", required: true, schema: { type: "string" } },
          { name: "section", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" }, "404": { description: "Not Found" } },
      },
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
                        fb_marks: { type: "array", items: { type: "number" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" }, "403": { description: "Forbidden" } },
      },
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
          { name: "subject_code", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
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
                  subject_code: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "400": { description: "Bad Request" }, "403": { description: "Forbidden" } },
      },
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
          { name: "subject_code", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } },
      },
    },
  },
} as const;

export function mountSwagger(app: express.Express) {
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openApiSpec);
  });

  app.get("/swagger", (_req, res) => {
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
