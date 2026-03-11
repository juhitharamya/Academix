import Database from "better-sqlite3";

export function openDb(dbFile = "academix.db") {
  const db = new Database(dbFile);
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS faculty (
      faculty_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'FACULTY'
    );

    CREATE TABLE IF NOT EXISTS question_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id TEXT NOT NULL,
      department TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS subjective_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      marks INTEGER NOT NULL,
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
      FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fill_blanks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE
    );
  `);
}

