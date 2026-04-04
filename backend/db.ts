import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { seedSubjectsIfEmpty } from "./seedSubjects.ts";

export type Db = Database.Database;

function ensureColumn(db: Db, table: string, column: string, type: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

export function openDb(dbFile?: string) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.join(__dirname, "..");
  const resolvedDbFile = dbFile || path.join(repoRoot, "database", "academix.db");

  const dbDir = path.dirname(resolvedDbFile);
  if (dbDir && dbDir !== ".") {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(resolvedDbFile);

  // --- Evaluation schema migrations (add branch support for H&S) ---
  const migrateEvaluationTables = () => {
    const listsCols = db.prepare(`PRAGMA table_info(evaluation_student_lists)`).all() as Array<{ name: string }>;
    const hasListsBranch = listsCols.some((c) => c.name === "branch");

    // If the table exists but doesn't have branch, rebuild it with branch + updated UNIQUE constraint.
    if (listsCols.length > 0 && !hasListsBranch) {
      db.exec(`
        BEGIN;
        CREATE TABLE IF NOT EXISTS evaluation_student_lists_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          department TEXT NOT NULL,
          branch TEXT NOT NULL DEFAULT '',
          regulation TEXT NOT NULL,
          year TEXT NOT NULL,
          section TEXT NOT NULL,
          uploaded_by TEXT NOT NULL,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(department, branch, regulation, year, section)
        );
        INSERT INTO evaluation_student_lists_new (id, department, branch, regulation, year, section, uploaded_by, uploaded_at)
        SELECT id, department, '', regulation, year, section, uploaded_by, uploaded_at FROM evaluation_student_lists;
        DROP TABLE evaluation_student_lists;
        ALTER TABLE evaluation_student_lists_new RENAME TO evaluation_student_lists;
        COMMIT;
      `);
    }

    const marksCols = db.prepare(`PRAGMA table_info(evaluation_marks)`).all() as Array<{ name: string }>;
    const hasMarksBranch = marksCols.some((c) => c.name === "branch");
    if (marksCols.length > 0 && !hasMarksBranch) {
      db.exec(`
        BEGIN;
        CREATE TABLE IF NOT EXISTS evaluation_marks_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          faculty_id TEXT NOT NULL,
          department TEXT NOT NULL,
          branch TEXT NOT NULL DEFAULT '',
          regulation TEXT NOT NULL,
          year TEXT NOT NULL,
          section TEXT NOT NULL,
          mid_type TEXT NOT NULL,
          subject_name TEXT NOT NULL,
          subject_code TEXT NOT NULL,
          roll_number TEXT NOT NULL,
          student_name TEXT NOT NULL,
          descriptive_marks TEXT NOT NULL DEFAULT '[]',
          mcq_marks TEXT NOT NULL DEFAULT '[]',
          fb_marks TEXT NOT NULL DEFAULT '[]',
          assignment_marks TEXT NOT NULL DEFAULT '{}',
          assignment_total REAL NOT NULL DEFAULT 0,
          assignment_co_map TEXT NOT NULL DEFAULT '{}',
          grand_total REAL NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(department, branch, regulation, year, section, mid_type, subject_code, roll_number)
        );
        INSERT INTO evaluation_marks_new
          (id, faculty_id, department, branch, regulation, year, section, mid_type, subject_name, subject_code, roll_number, student_name, descriptive_marks, mcq_marks, fb_marks, assignment_marks, assignment_total, assignment_co_map, grand_total, created_at, updated_at)
        SELECT
          id, faculty_id, department, '', regulation, year, section, mid_type, subject_name, subject_code, roll_number, student_name, descriptive_marks, mcq_marks, fb_marks, '{}', 0, '{}', total_marks, created_at, updated_at
        FROM evaluation_marks;
        DROP TABLE evaluation_marks;
        ALTER TABLE evaluation_marks_new RENAME TO evaluation_marks;
        COMMIT;
      `);
    }
  };

  db.exec(`
    CREATE TABLE IF NOT EXISTS faculty (
      faculty_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      department TEXT,
      role TEXT NOT NULL DEFAULT 'FACULTY',
      status TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS question_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id TEXT NOT NULL,
      department TEXT NOT NULL,
      branch TEXT,
      regulation TEXT NOT NULL,
      year TEXT NOT NULL,
      semester TEXT NOT NULL,
      mid_exam_type TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      hod_comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      regulation TEXT NOT NULL,
      department TEXT NOT NULL,
      branch TEXT,
      year TEXT,
      semester TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjective_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      marks INTEGER NOT NULL,
      co_level TEXT,
      btl_level TEXT,
      FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS objective_mcqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      option_A TEXT NOT NULL,
      option_B TEXT NOT NULL,
      option_C TEXT NOT NULL,
      option_D TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      co_level TEXT,
      btl_level TEXT,
      FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fill_blanks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      co_level TEXT,
      btl_level TEXT,
      FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evaluation_student_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT '',
      regulation TEXT NOT NULL,
      year TEXT NOT NULL,
      section TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(department, branch, regulation, year, section)
    );

    CREATE TABLE IF NOT EXISTS evaluation_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      roll_number TEXT NOT NULL,
      student_name TEXT NOT NULL,
      FOREIGN KEY (list_id) REFERENCES evaluation_student_lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evaluation_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id TEXT NOT NULL,
      department TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT '',
      regulation TEXT NOT NULL,
      year TEXT NOT NULL,
      section TEXT NOT NULL,
      mid_type TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      student_name TEXT NOT NULL,
      descriptive_marks TEXT NOT NULL DEFAULT '[]',
      mcq_marks TEXT NOT NULL DEFAULT '[]',
      fb_marks TEXT NOT NULL DEFAULT '[]',
      assignment_marks TEXT NOT NULL DEFAULT '{}',
      assignment_total REAL NOT NULL DEFAULT 0,
      assignment_co_map TEXT NOT NULL DEFAULT '{}',
      grand_total REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(department, branch, regulation, year, section, mid_type, subject_code, roll_number)
    );

    CREATE TABLE IF NOT EXISTS evaluation_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id TEXT NOT NULL,
      faculty_name TEXT,
      department TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT '',
      regulation TEXT NOT NULL,
      year TEXT NOT NULL,
      section TEXT NOT NULL,
      mid_type TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      submitted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(department, branch, regulation, year, section, mid_type, subject_code)
    );
  `);

  migrateEvaluationTables();

  // Migrations for existing DBs.
  ensureColumn(db, "question_papers", "branch", "TEXT");
  ensureColumn(db, "question_papers", "regulation", "TEXT");
  ensureColumn(db, "faculty", "email", "TEXT");
  ensureColumn(db, "faculty", "status", "TEXT");
  ensureColumn(db, "evaluation_marks", "assignment_marks", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "evaluation_marks", "assignment_total", "REAL NOT NULL DEFAULT 0");
  ensureColumn(db, "evaluation_marks", "assignment_co_map", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "evaluation_marks", "grand_total", "REAL NOT NULL DEFAULT 0");
  ensureColumn(db, "subjective_questions", "co_level", "TEXT");
  ensureColumn(db, "subjective_questions", "btl_level", "TEXT");
  ensureColumn(db, "objective_mcqs", "co_level", "TEXT");
  ensureColumn(db, "objective_mcqs", "btl_level", "TEXT");
  ensureColumn(db, "fill_blanks", "co_level", "TEXT");
  ensureColumn(db, "fill_blanks", "btl_level", "TEXT");

  seedSubjectsIfEmpty(db);

  return db;
}
