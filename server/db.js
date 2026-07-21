import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'studentos.db');
const schemaPath = path.join(__dirname, 'schema.sql');

fs.mkdirSync(dataDir, { recursive: true });
sqlite3.verbose();

export const db = new sqlite3.Database(dbPath);

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

export async function initializeDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await new Promise((resolve, reject) => {
    db.exec(schema, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await migrate();
  await seed();
}

async function migrate() {
  const assignmentColumns = await all('PRAGMA table_info(assignments)');
  const columnNames = assignmentColumns.map((column) => column.name);
  const userColumns = await all('PRAGMA table_info(users)');
  const userColumnNames = userColumns.map((column) => column.name);

  if (!userColumnNames.includes('registration_no')) {
    await run('ALTER TABLE users ADD COLUMN registration_no TEXT');
    await run("UPDATE users SET registration_no = '2505280041' WHERE user_id = 'stu-001'");
    await run("UPDATE users SET registration_no = '2505280042' WHERE user_id = 'stu-002'");
  }

  await run("UPDATE users SET registration_no = 'FAC-001' WHERE user_id = 'fac-001' AND (registration_no IS NULL OR TRIM(registration_no) = '')");

  if (!columnNames.includes('assignment_file_url')) {
    await run('ALTER TABLE assignments ADD COLUMN assignment_file_url TEXT');
  }

  if (!columnNames.includes('assignment_original_name')) {
    await run('ALTER TABLE assignments ADD COLUMN assignment_original_name TEXT');
  }

  if (!columnNames.includes('semester')) {
    await run('ALTER TABLE assignments ADD COLUMN semester TEXT');
  }

  if (!columnNames.includes('course')) {
    await run('ALTER TABLE assignments ADD COLUMN course TEXT');
  }

  const notesTable = await get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notes'");
  if (notesTable?.sql && !notesTable.sql.includes("'hidden'")) {
    await run('ALTER TABLE notes RENAME TO notes_legacy');
    await run(`CREATE TABLE notes (
      note_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      course TEXT,
      semester TEXT,
      topic TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      file_url TEXT NOT NULL,
      original_name TEXT NOT NULL,
      description TEXT,
      download_count INTEGER NOT NULL DEFAULT 0,
      upvote_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'reported', 'taken_down')),
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
      FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
    )`);
    await run(`INSERT INTO notes (
      note_id, title, subject_id, topic, uploaded_by, file_url, original_name,
      description, download_count, upvote_count, status, uploaded_at
    ) SELECT
      note_id, title, subject_id, topic, uploaded_by, file_url, original_name,
      description, download_count, upvote_count, status, uploaded_at
    FROM notes_legacy`);
    await run('DROP TABLE notes_legacy');
  }

  const currentNoteColumns = await all('PRAGMA table_info(notes)');
  const currentNoteColumnNames = currentNoteColumns.map((column) => column.name);

  if (!currentNoteColumnNames.includes('course')) {
    await run('ALTER TABLE notes ADD COLUMN course TEXT');
  }

  if (!currentNoteColumnNames.includes('semester')) {
    await run('ALTER TABLE notes ADD COLUMN semester TEXT');
  }

  // Reports are now reviewed without removing a note from the library. Restore
  // notes hidden by the previous automatic "reported" status behavior.
  await run("UPDATE notes SET status = 'active' WHERE status = 'reported'");
}

async function seed() {
  const existing = await get('SELECT subject_id FROM subjects LIMIT 1');
  if (existing) return;

  await run("INSERT INTO subjects VALUES ('sub-dbms', 'Database Management Systems')");
  await run("INSERT INTO subjects VALUES ('sub-os', 'Operating Systems')");
  await run("INSERT INTO subjects VALUES ('sub-web', 'Web Technologies')");

  await run("INSERT INTO users (user_id, name, registration_no, role) VALUES ('stu-001', 'Aarav Mohanty', '2505280041', 'student')");
  await run("INSERT INTO users (user_id, name, registration_no, role) VALUES ('stu-002', 'Priya Das', '2505280042', 'student')");
  await run("INSERT INTO users (user_id, name, registration_no, role) VALUES ('fac-001', 'Prof. Meera Sen', 'FAC-001', 'faculty')");
  await run("INSERT INTO users (user_id, name, role) VALUES ('admin-001', 'Admin User', 'admin')");

  await run("INSERT INTO enrollments VALUES ('stu-001', 'sub-dbms')");
  await run("INSERT INTO enrollments VALUES ('stu-001', 'sub-os')");
  await run("INSERT INTO enrollments VALUES ('stu-002', 'sub-dbms')");
  await run("INSERT INTO enrollments VALUES ('stu-002', 'sub-web')");

  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  await run(
    `INSERT INTO assignments (
      assignment_id,
      title,
      description,
      subject_id,
      faculty_id,
      deadline,
      allow_resubmit,
      allow_late,
      created_at
    ) VALUES
    ('asn-001', 'DBMS Lab 3', 'Upload your ER diagram and SQL schema as one PDF.', 'sub-dbms', 'fac-001', ?, 1, 1, ?)`,
    [tomorrow, new Date().toISOString()],
  );

  await run(
    `INSERT INTO notes (
      note_id, title, subject_id, course, semester, topic, uploaded_by, file_url,
      original_name, description, download_count, upvote_count, status, uploaded_at
    ) VALUES
    ('note-001', 'OS Unit 3 - Process Scheduling', 'sub-os', 'MCA', '1', 'Process Scheduling', 'stu-001', '/uploads/sample-os-notes.pdf', 'sample-os-notes.pdf', 'Short notes for CPU scheduling algorithms.', 14, 5, 'active', ?)`,
    [new Date().toISOString()],
  );
}
