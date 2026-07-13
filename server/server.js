import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { all, get, initializeDatabase, run } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const port = process.env.PORT || 4000;
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;

app.get('/api/bootstrap', async (_request, response) => {
  const [subjects, users] = await Promise.all([
    all('SELECT * FROM subjects ORDER BY name'),
    all('SELECT * FROM users ORDER BY role, name'),
  ]);

  response.json({ subjects, users });
});

app.get('/api/assignments', async (request, response) => {
  const role = request.query.role || 'student';
  const userId = request.query.userId || 'stu-001';
  const rows = role === 'faculty'
    ? await all(
        `SELECT a.*, s.name AS subject_name,
          COUNT(sub.submission_id) AS submission_count
        FROM assignments a
        JOIN subjects s ON s.subject_id = a.subject_id
        LEFT JOIN submissions sub ON sub.assignment_id = a.assignment_id
        WHERE a.faculty_id = ?
        GROUP BY a.assignment_id
        ORDER BY a.deadline ASC`,
        [userId],
      )
    : await all(
        `SELECT a.*, s.name AS subject_name, sub.submission_id, sub.grade_value, sub.feedback, sub.is_late
        FROM assignments a
        JOIN subjects s ON s.subject_id = a.subject_id
        JOIN enrollments e ON e.subject_id = a.subject_id
        LEFT JOIN submissions sub ON sub.assignment_id = a.assignment_id AND sub.student_id = ?
        WHERE e.student_id = ?
        ORDER BY a.deadline ASC`,
        [userId, userId],
      );

  response.json(rows);
});

app.post('/api/assignments', upload.single('assignment_file'), async (request, response) => {
  const assignment = {
    assignment_id: id('asn'),
    faculty_id: request.body.faculty_id || 'fac-001',
    title: request.body.title,
    description: request.body.description,
    assignment_file_url: request.file ? `/uploads/${request.file.filename}` : null,
    assignment_original_name: request.file?.originalname || null,
    subject_id: request.body.subject_id,
    deadline: request.body.deadline,
    allow_resubmit: request.body.allow_resubmit === 'on' || request.body.allow_resubmit === 'true' ? 1 : 0,
    allow_late: 1,
    created_at: now(),
  };

  await run(
    `INSERT INTO assignments (
      assignment_id,
      title,
      description,
      assignment_file_url,
      assignment_original_name,
      subject_id,
      faculty_id,
      deadline,
      allow_resubmit,
      allow_late,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assignment.assignment_id,
      assignment.title,
      assignment.description,
      assignment.assignment_file_url,
      assignment.assignment_original_name,
      assignment.subject_id,
      assignment.faculty_id,
      assignment.deadline,
      assignment.allow_resubmit,
      assignment.allow_late,
      assignment.created_at,
    ],
  );

  response.status(201).json(assignment);
});

app.delete('/api/assignments/:assignmentId', async (request, response) => {
  const facultyId = request.query.facultyId || 'fac-001';
  const assignment = await get(
    'SELECT * FROM assignments WHERE assignment_id = ? AND faculty_id = ?',
    [request.params.assignmentId, facultyId],
  );

  if (!assignment) {
    return response.status(404).json({ error: 'Assignment not found for this faculty member' });
  }

  await run('DELETE FROM submissions WHERE assignment_id = ?', [assignment.assignment_id]);
  await run('DELETE FROM assignments WHERE assignment_id = ?', [assignment.assignment_id]);

  response.json({ ok: true });
});

app.get('/api/assignments/:assignmentId/submissions', async (request, response) => {
  const rows = await all(
    `SELECT u.user_id, u.name, sub.*
    FROM enrollments e
    JOIN assignments a ON a.subject_id = e.subject_id
    JOIN users u ON u.user_id = e.student_id
    LEFT JOIN submissions sub ON sub.assignment_id = a.assignment_id AND sub.student_id = u.user_id
    WHERE a.assignment_id = ?
    ORDER BY u.name`,
    [request.params.assignmentId],
  );

  response.json(rows);
});

app.post('/api/assignments/:assignmentId/submit', upload.single('file'), async (request, response) => {
  const assignment = await get('SELECT * FROM assignments WHERE assignment_id = ?', [request.params.assignmentId]);
  if (!assignment) return response.status(404).json({ error: 'Assignment not found' });

  const studentId = request.body.student_id || 'stu-001';
  const enrollment = await get(
    'SELECT 1 FROM enrollments WHERE student_id = ? AND subject_id = ?',
    [studentId, assignment.subject_id],
  );
  if (!enrollment) return response.status(403).json({ error: 'Student is not enrolled in this subject' });

  const existing = await get(
    'SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?',
    [assignment.assignment_id, studentId],
  );
  if (existing && !assignment.allow_resubmit) {
    return response.status(409).json({ error: 'Resubmission is not allowed for this assignment' });
  }

  const submittedAt = now();
  const payload = {
    submission_id: existing?.submission_id || id('sub'),
    assignment_id: assignment.assignment_id,
    student_id: studentId,
    file_url: `/uploads/${request.file.filename}`,
    original_name: request.file.originalname,
    submitted_at: submittedAt,
    is_late: new Date(submittedAt) > new Date(assignment.deadline) ? 1 : 0,
  };

  if (existing) {
    await run(
      `UPDATE submissions SET file_url = ?, original_name = ?, submitted_at = ?, is_late = ?, grade_value = NULL, feedback = NULL, graded_at = NULL, graded_by = NULL
      WHERE submission_id = ?`,
      [payload.file_url, payload.original_name, payload.submitted_at, payload.is_late, payload.submission_id],
    );
  } else {
    await run(
      `INSERT INTO submissions (submission_id, assignment_id, student_id, file_url, original_name, submitted_at, is_late)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      Object.values(payload),
    );
  }

  response.status(201).json(payload);
});

app.patch('/api/submissions/:submissionId/grade', async (request, response) => {
  await run(
    `UPDATE submissions
    SET grade_value = ?, feedback = ?, graded_at = ?, graded_by = ?
    WHERE submission_id = ?`,
    [request.body.grade_value, request.body.feedback || '', now(), request.body.graded_by || 'fac-001', request.params.submissionId],
  );

  response.json({ ok: true });
});

app.get('/api/notes', async (request, response) => {
  const sort = request.query.sort || 'recent';
  const subjectId = request.query.subjectId;
  const orderBy = {
    recent: 'n.uploaded_at DESC',
    downloaded: 'n.download_count DESC',
    upvoted: 'n.upvote_count DESC',
  }[sort] || 'n.uploaded_at DESC';
  const params = [];
  let where = "n.status != 'taken_down'";

  if (subjectId && subjectId !== 'all') {
    where += ' AND n.subject_id = ?';
    params.push(subjectId);
  }

  const rows = await all(
    `SELECT n.*, s.name AS subject_name, u.name AS uploader
    FROM notes n
    JOIN subjects s ON s.subject_id = n.subject_id
    JOIN users u ON u.user_id = n.uploaded_by
    WHERE ${where}
    ORDER BY ${orderBy}`,
    params,
  );

  response.json(rows);
});

app.post('/api/notes', upload.single('file'), async (request, response) => {
  const note = {
    note_id: id('note'),
    title: request.body.title,
    subject_id: request.body.subject_id,
    topic: request.body.topic,
    uploaded_by: request.body.uploaded_by || 'stu-001',
    file_url: `/uploads/${request.file.filename}`,
    original_name: request.file.originalname,
    description: request.body.description || '',
    download_count: 0,
    upvote_count: 0,
    status: 'active',
    uploaded_at: now(),
  };

  await run(`INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, Object.values(note));
  response.status(201).json(note);
});

app.post('/api/notes/:noteId/download', async (request, response) => {
  await run('UPDATE notes SET download_count = download_count + 1 WHERE note_id = ?', [request.params.noteId]);
  const note = await get('SELECT file_url FROM notes WHERE note_id = ?', [request.params.noteId]);
  response.json(note);
});

app.post('/api/notes/:noteId/upvote', async (request, response) => {
  try {
    await run('INSERT INTO note_upvotes VALUES (?, ?, ?, ?)', [
      id('vote'),
      request.params.noteId,
      request.body.user_id || 'stu-001',
      now(),
    ]);
    await run('UPDATE notes SET upvote_count = upvote_count + 1 WHERE note_id = ?', [request.params.noteId]);
  } catch (error) {
    if (!String(error).includes('UNIQUE')) throw error;
  }

  response.json({ ok: true });
});

app.post('/api/notes/:noteId/report', async (request, response) => {
  await run('INSERT INTO note_reports VALUES (?, ?, ?, ?, ?, ?)', [
    id('report'),
    request.params.noteId,
    request.body.reported_by || 'stu-001',
    request.body.reason,
    'open',
    now(),
  ]);
  await run("UPDATE notes SET status = 'reported' WHERE note_id = ?", [request.params.noteId]);
  response.status(201).json({ ok: true });
});

app.get('/api/reports', async (_request, response) => {
  const rows = await all(
    `SELECT r.*, n.title, n.file_url, u.name AS reporter
    FROM note_reports r
    JOIN notes n ON n.note_id = r.note_id
    JOIN users u ON u.user_id = r.reported_by
    WHERE r.status = 'open'
    ORDER BY r.created_at DESC`,
  );
  response.json(rows);
});

app.patch('/api/reports/:reportId', async (request, response) => {
  const report = await get('SELECT * FROM note_reports WHERE report_id = ?', [request.params.reportId]);
  if (!report) return response.status(404).json({ error: 'Report not found' });

  const action = request.body.action;
  if (action === 'take_down') {
    await run("UPDATE notes SET status = 'taken_down' WHERE note_id = ?", [report.note_id]);
    await run("UPDATE note_reports SET status = 'action_taken' WHERE report_id = ?", [report.report_id]);
  } else {
    await run("UPDATE notes SET status = 'active' WHERE note_id = ?", [report.note_id]);
    await run("UPDATE note_reports SET status = 'dismissed' WHERE report_id = ?", [report.report_id]);
  }

  response.json({ ok: true });
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Student OS API running on http://127.0.0.1:${port}`);
  });
});
