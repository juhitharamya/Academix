import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const { supabase } = await import("./supabaseClient.js");

const file = process.argv[2] || "database/r22-subjects-template.csv";
const text = fs.readFileSync(file, "utf8");

function parseCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const split = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim().replace(/^"|"$/g, ""));
  };

  const header = split(lines[0]).map((h) => h.toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cols[j] ?? "";
    rows.push(row);
  }
  return rows;
}

const rows = parseCsv(text).map((r) => ({
  regulation: String(r.regulation || "").trim().toUpperCase(),
  department: String(r.department || "").trim().toUpperCase() === "H&S" ? "H&S" : String(r.department || "").trim().toUpperCase(),
  year: String(r.department || "").trim().toUpperCase() === "H&S" ? "I" : String(r.year || "").trim().toUpperCase(),
  semester: String(r.semester || "").trim().replace(/^SEM(?:ESTER)?\s*/i, "").toUpperCase(),
  subject_name: String(r.subject_name || "").trim(),
  subject_code: String(r.subject_code || "").trim().toUpperCase(),
  branch: (() => {
    const department = String(r.department || "").trim().toUpperCase();
    const branch = String(r.branch || "").trim().toUpperCase();
    return department === "H&S" ? branch : (branch || department);
  })(),
  is_active: String(r.is_active || "true").trim().toLowerCase() !== "false",
}));

const valid = rows.filter((r) => r.regulation && r.department && r.branch && r.year && r.semester && r.subject_name && r.subject_code);
if (!valid.length) {
  console.error("No valid rows. Check CSV header/values.");
  process.exit(1);
}

const { error } = await supabase.from("subject_master").upsert(valid, {
  onConflict: "regulation,department,branch,year,semester,subject_code",
});

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Imported ${valid.length} subjects from ${file}`);
