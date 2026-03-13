import type { Db } from "./db.ts";

export function seedSubjectsIfEmpty(db: Db) {
  const subjectCount = db.prepare("SELECT COUNT(*) as count FROM subjects").get() as any;
  if ((subjectCount?.count || 0) > 0) return;

  const insertSubject = db.prepare(`
    INSERT INTO subjects (regulation, department, branch, year, semester, subject_name, subject_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const subjectsData: Array<[string, string, string, string | null, string, string, string]> = [
    // R25 H&S CSE Sem I
    ["R25", "H&S", "CSE", null, "I", "Matrices and Calculus", "MA101BS"],
    ["R25", "H&S", "CSE", null, "I", "Engineering Chemistry", "CH102BS"],
    ["R25", "H&S", "CSE", null, "I", "Basic Electrical Engineering", "EE103ES"],
    ["R25", "H&S", "CSE", null, "I", "Engineering Workshop", "ME105ES"],
    ["R25", "H&S", "CSE", null, "I", "English", "EN105HS"],
    ["R25", "H&S", "CSE", null, "I", "Engineering Chemistry Lab", "CH106BS"],
    ["R25", "H&S", "CSE", null, "I", "English Language and Communication Skills Lab", "EN107HS"],
    ["R25", "H&S", "CSE", null, "I", "Basic Electrical Engineering Lab", "EE108ES"],
    // R25 H&S CSE Sem II
    ["R25", "H&S", "CSE", null, "II", "Mathematics - II", "MA201BS"],
    ["R25", "H&S", "CSE", null, "II", "Applied Physics", "AP202BS"],
    ["R25", "H&S", "CSE", null, "II", "Programming for Problem Solving", "CS203ES"],
    ["R25", "H&S", "CSE", null, "II", "Engineering Graphics", "ME204ES"],
    ["R25", "H&S", "CSE", null, "II", "Applied Physics Lab", "AP205BS"],
    ["R25", "H&S", "CSE", null, "II", "Programming for Problem Solving Lab", "CS206ES"],
    ["R25", "H&S", "CSE", null, "II", "Environmental Science", "*MC209ES"],
    // R25 H&S CSD Sem I
    ["R25", "H&S", "CSD", null, "I", "Matrices and Calculus", "MA101BS"],
    ["R25", "H&S", "CSD", null, "I", "Advanced Engineering Physics", "PH102BS"],
    ["R25", "H&S", "CSD", null, "I", "Programming for Problem Solving", "CS103ES"],
    ["R25", "H&S", "CSD", null, "I", "Basic Electrical Engineering", "EE104ES"],
    ["R25", "H&S", "CSD", null, "I", "Engineering Drawing and Computer Aided Drafting", "ME105ES"],
    ["R25", "H&S", "CSD", null, "I", "Advanced Engineering Physics Lab", "PH106BS"],
    ["R25", "H&S", "CSD", null, "I", "Programming for Problem Solving Lab", "CS107ES"],
    ["R25", "H&S", "CSD", null, "I", "Basic Electrical Engineering Lab", "EE108ES"],
    ["R25", "H&S", "CSD", null, "I", "IT Workshop", "CS109ES"],
    // R25 H&S CSD Sem II
    ["R25", "H&S", "CSD", null, "II", "Ordinary Differential Equations and Vector Calculus", "MA201BS"],
    ["R25", "H&S", "CSD", null, "II", "Engineering Chemistry", "ACH202BS"],
    ["R25", "H&S", "CSD", null, "II", "Data Structures", "CS203ES"],
    ["R25", "H&S", "CSD", null, "II", "Electronic Devices and Circuits", "EC204ES"],
    ["R25", "H&S", "CSD", null, "II", "English for Skill Enhancement", "EN205HS"],
    ["R25", "H&S", "CSD", null, "II", "Engineering Chemistry Lab", "CH206BS"],
    ["R25", "H&S", "CSD", null, "II", "Data Structures Lab", "CS207ES"],
    ["R25", "H&S", "CSD", null, "II", "English Language and Communication Skills Lab", "EN208HS"],
    ["R25", "H&S", "CSD", null, "II", "Engineering Workshop", "ME209ES"],
    ["R25", "H&S", "CSD", null, "II", "Python Programming Lab", "CS210ES"],
    // R25 H&S CSM Sem I
    ["R25", "H&S", "CSM", null, "I", "Matrices and Calculus", "MA101BS"],
    ["R25", "H&S", "CSM", null, "I", "Advanced Engineering Physics", "PH102BS"],
    ["R25", "H&S", "CSM", null, "I", "Programming for Problem Solving", "CS103ES"],
    ["R25", "H&S", "CSM", null, "I", "Basic Electrical Engineering", "EE104ES"],
    ["R25", "H&S", "CSM", null, "I", "Engineering Drawing and Computer Aided Drafting", "ME105ES"],
    ["R25", "H&S", "CSM", null, "I", "Advanced Engineering Physics Lab", "PH106BS"],
    ["R25", "H&S", "CSM", null, "I", "Programming for Problem Solving Lab", "CS107ES"],
    ["R25", "H&S", "CSM", null, "I", "Basic Electrical Engineering Lab", "EE108ES"],
    ["R25", "H&S", "CSM", null, "I", "IT Workshop", "CS109ES"],
    // R25 H&S CSM Sem II
    ["R25", "H&S", "CSM", null, "II", "Ordinary Differential Equations and Vector Calculus", "MA201BS"],
    ["R25", "H&S", "CSM", null, "II", "Engineering Chemistry", "CH202BS"],
    ["R25", "H&S", "CSM", null, "II", "Data Structures", "CS203ES"],
    ["R25", "H&S", "CSM", null, "II", "Electronic Devices and Circuits", "EC204ES"],
    ["R25", "H&S", "CSM", null, "II", "English for Skill Enhancement", "EN205HS"],
    ["R25", "H&S", "CSM", null, "II", "Engineering Chemistry Lab", "CH206BS"],
    ["R25", "H&S", "CSM", null, "II", "Data Structures Lab", "CS207ES"],
    ["R25", "H&S", "CSM", null, "II", "English Language and Communication Skills Lab", "EN208HS"],
    ["R25", "H&S", "CSM", null, "II", "Engineering Workshop", "ME209ES"],
    ["R25", "H&S", "CSM", null, "II", "Python Programming Lab", "CS210ES"],
    // R25 H&S ECE Sem I
    ["R25", "H&S", "ECE", null, "I", "Matrices and Calculus", "MA101BS"],
    ["R25", "H&S", "ECE", null, "I", "Advanced Engineering Physics", "PH102BS"],
    ["R25", "H&S", "ECE", null, "I", "Programming for Problem Solving", "CS103ES"],
    ["R25", "H&S", "ECE", null, "I", "Basic Electrical Engineering", "EE104ES"],
    ["R25", "H&S", "ECE", null, "I", "Engineering Drawing and Computer Aided Drafting", "ME105ES"],
    ["R25", "H&S", "ECE", null, "I", "English for Skill Enhancement", "EN106HS"],
    ["R25", "H&S", "ECE", null, "I", "Advanced Engineering Physics Lab", "PH107BS"],
    ["R25", "H&S", "ECE", null, "I", "Programming for Problem Solving Lab", "CS108ES"],
    ["R25", "H&S", "ECE", null, "I", "English Language and Communication Skills Lab", "EN109HS"],
    // R25 H&S ECE Sem II
    ["R25", "H&S", "ECE", null, "II", "Differential Equations and Vector Calculus", "MA201BS Ordinary"],
    ["R25", "H&S", "ECE", null, "II", "Engineering Chemistry", "CH202BS"],
    ["R25", "H&S", "ECE", null, "II", "Python Programming", "CS203ES"],
    ["R25", "H&S", "ECE", null, "II", "Data Structures", "CS204ES"],
    ["R25", "H&S", "ECE", null, "II", "Network Analysis and Synthesis", "EE205ES"],
    ["R25", "H&S", "ECE", null, "II", "Engineering Chemistry Lab", "CH206BS"],
    ["R25", "H&S", "ECE", null, "II", "Applied Python Programming Lab", "EC207ES"],
    ["R25", "H&S", "ECE", null, "II", "Data Structures Lab", "CS208ES"],
    ["R25", "H&S", "ECE", null, "II", "Basic Electrical Engineering Lab", "EE209ES"],
    ["R25", "H&S", "ECE", null, "II", "Engineering Workshop", "ME210ES"],
  ];

  const tx = db.transaction(() => {
    for (const s of subjectsData) insertSubject.run(...s);
  });

  tx();
}

