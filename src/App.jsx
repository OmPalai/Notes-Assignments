import { useEffect, useMemo, useState } from 'react';
import { api } from './lib.js';
import FacultyConsolePage from './pages/FacultyConsolePage.jsx';
import ModerationPage from './pages/ModerationPage.jsx';
import NotesLibraryPage from './pages/NotesLibraryPage.jsx';
import StudentAssignmentsPage from './pages/StudentAssignmentsPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('studentAssignments');
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reports, setReports] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [noteSort, setNoteSort] = useState('recent');
  const [message, setMessage] = useState('');

  const pendingAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.submission_id),
    [assignments],
  );

  async function loadBootstrap() {
    const response = await fetch(`${api}/bootstrap`);
    const data = await response.json();
    setSubjects(data.subjects);
  }

  async function loadAssignments() {
    const [studentResponse, facultyResponse] = await Promise.all([
      fetch(`${api}/assignments?role=student&userId=stu-001`),
      fetch(`${api}/assignments?role=faculty&userId=fac-001`),
    ]);
    setAssignments(await studentResponse.json());
    const facultyData = await facultyResponse.json();
    setFacultyAssignments(facultyData);
    setSelectedAssignment((current) => current || facultyData[0] || null);
  }

  async function loadSubmissions(assignmentId = selectedAssignment?.assignment_id) {
    if (!assignmentId) return;
    const response = await fetch(`${api}/assignments/${assignmentId}/submissions`);
    setSubmissions(await response.json());
  }

  async function loadNotes() {
    const response = await fetch(`${api}/notes?subjectId=${subjectFilter}&sort=${noteSort}`);
    setNotes(await response.json());
  }

  async function loadReports() {
    const response = await fetch(`${api}/reports`);
    setReports(await response.json());
  }

  useEffect(() => {
    loadBootstrap();
    loadAssignments();
    loadReports();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [subjectFilter, noteSort]);

  useEffect(() => {
    loadSubmissions();
  }, [selectedAssignment?.assignment_id]);

  async function createAssignment(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    form.set('deadline', new Date(form.get('deadline')).toISOString());

    await fetch(`${api}/assignments`, {
      method: 'POST',
      body: form,
    });
    event.currentTarget.reset();
    setMessage('Assignment created with file and visible to enrolled students.');
    loadAssignments();
  }

  async function deleteAssignment(assignmentId) {
    const response = await fetch(`${api}/assignments/${assignmentId}?facultyId=fac-001`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setMessage('Could not delete assignment.');
      return;
    }

    setMessage('Assignment deleted.');
    setSelectedAssignment((current) => (
      current?.assignment_id === assignmentId ? null : current
    ));
    setSubmissions([]);
    loadAssignments();
  }

  async function submitAssignment(event, assignmentId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.append('student_id', 'stu-001');
    await fetch(`${api}/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: form,
    });
    setMessage('Submission uploaded successfully.');
    loadAssignments();
    loadSubmissions(assignmentId);
  }

  async function gradeSubmission(event, submissionId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch(`${api}/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade_value: form.get('grade_value'),
        feedback: form.get('feedback'),
      }),
    });
    setMessage('Grade posted to the student dashboard.');
    loadAssignments();
    loadSubmissions();
  }

  async function uploadNote(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.append('uploaded_by', 'stu-001');
    await fetch(`${api}/notes`, { method: 'POST', body: form });
    event.currentTarget.reset();
    setMessage('Note uploaded to the shared library.');
    loadNotes();
  }

  async function downloadNote(note) {
    const response = await fetch(`${api}/notes/${note.note_id}/download`, { method: 'POST' });
    const data = await response.json();
    window.open(`http://127.0.0.1:4000${data.file_url}`, '_blank');
    loadNotes();
  }

  async function upvoteNote(noteId) {
    await fetch(`${api}/notes/${noteId}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'stu-001' }),
    });
    loadNotes();
  }

  async function reportNote(event, noteId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch(`${api}/notes/${noteId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: form.get('reason'), reported_by: 'stu-001' }),
    });
    event.currentTarget.reset();
    setMessage('Report sent to admin moderation.');
    loadNotes();
    loadReports();
  }

  async function resolveReport(reportId, action) {
    await fetch(`${api}/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    loadReports();
    loadNotes();
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Student OS</p>
          <h1>Notes Sharing + Assignment Submission</h1>
        </div>
        <div className="status-strip">
          <strong>{pendingAssignments.length}</strong>
          <span>pending</span>
          <strong>{reports.length}</strong>
          <span>reports</span>
        </div>
      </header>

      <nav className="tabs" aria-label="Primary">
        <button className={activePage === 'studentAssignments' ? 'active' : ''} onClick={() => setActivePage('studentAssignments')}>Student Assignments</button>
        <button className={activePage === 'facultyConsole' ? 'active' : ''} onClick={() => setActivePage('facultyConsole')}>Faculty Console</button>
        <button className={activePage === 'notesLibrary' ? 'active' : ''} onClick={() => setActivePage('notesLibrary')}>Notes Library</button>
        <button className={activePage === 'moderation' ? 'active' : ''} onClick={() => setActivePage('moderation')}>Moderation</button>
      </nav>

      {message && <p className="toast">{message}</p>}

      {activePage === 'studentAssignments' && (
        <StudentAssignmentsPage
          assignments={assignments}
          pendingAssignments={pendingAssignments}
          onSubmitAssignment={submitAssignment}
        />
      )}

      {activePage === 'facultyConsole' && (
        <FacultyConsolePage
          subjects={subjects}
          facultyAssignments={facultyAssignments}
          selectedAssignment={selectedAssignment}
          submissions={submissions}
          onCreateAssignment={createAssignment}
          onSelectAssignment={setSelectedAssignment}
          onDeleteAssignment={deleteAssignment}
          onGradeSubmission={gradeSubmission}
        />
      )}

      {activePage === 'notesLibrary' && (
        <NotesLibraryPage
          subjects={subjects}
          notes={notes}
          subjectFilter={subjectFilter}
          noteSort={noteSort}
          onSubjectFilterChange={setSubjectFilter}
          onNoteSortChange={setNoteSort}
          onUploadNote={uploadNote}
          onDownloadNote={downloadNote}
          onUpvoteNote={upvoteNote}
          onReportNote={reportNote}
        />
      )}

      {activePage === 'moderation' && (
        <ModerationPage reports={reports} onResolveReport={resolveReport} />
      )}
    </main>
  );
}
