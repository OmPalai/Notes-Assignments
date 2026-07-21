CREATE TABLE IF NOT EXISTS subjects (
  subject_id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  registration_no TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  PRIMARY KEY (student_id, subject_id),
  FOREIGN KEY (student_id) REFERENCES users(user_id),
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  assignment_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assignment_file_url TEXT,
  assignment_original_name TEXT,
  subject_id TEXT NOT NULL,
  course TEXT,
  semester TEXT,
  faculty_id TEXT NOT NULL,
  deadline TEXT NOT NULL,
  allow_resubmit INTEGER NOT NULL DEFAULT 0,
  allow_late INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
  FOREIGN KEY (faculty_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  submission_id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  is_late INTEGER NOT NULL,
  grade_value TEXT,
  feedback TEXT,
  graded_at TEXT,
  graded_by TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id),
  FOREIGN KEY (student_id) REFERENCES users(user_id),
  FOREIGN KEY (graded_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS notes (
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
);

CREATE TABLE IF NOT EXISTS note_upvotes (
  upvote_id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (note_id, user_id),
  FOREIGN KEY (note_id) REFERENCES notes(note_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS note_reports (
  report_id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  created_at TEXT NOT NULL,
  UNIQUE (note_id, reported_by),
  FOREIGN KEY (note_id) REFERENCES notes(note_id),
  FOREIGN KEY (reported_by) REFERENCES users(user_id)
);
