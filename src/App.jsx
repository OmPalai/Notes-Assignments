import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib.js';
import FacultyConsolePage from './pages/FacultyConsolePage.jsx';
import FacultyGradingPage from './pages/FacultyGradingPage.jsx';
import FacultyStudentGradesPage from './pages/FacultyStudentGradesPage.jsx';
import NotesLibraryPage from './pages/NotesLibraryPage.jsx';
import StudentAssignmentsPage from './pages/StudentAssignmentsPage.jsx';
import niisLogo from './assets/niis-logo.jpg';
import niisCampus from './assets/niis-campus.jpg';

export default function App() {
  const [role, setRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activePage, setActivePage] = useState('studentAssignments');
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [notes, setNotes] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [noteSort, setNoteSort] = useState('recent');
  const [message, setMessage] = useState('');
  const notesRequestId = useRef(0);

  const pendingAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.submission_id),
    [assignments],
  );

  async function loadBootstrap() {
    const response = await fetch(`${api}/bootstrap`);
    const data = await response.json();
    setSubjects(data.subjects);
    setUsers(data.users);
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

  async function loadGrades() {
    const response = await fetch(`${api}/grades?facultyId=fac-001`);
    if (response.ok) {
      setGrades(await response.json());
      return;
    }

    // Supports an already-running API server while it is restarted to pick up
    // the dedicated grades endpoint.
    const assignmentsResponse = await fetch(`${api}/assignments?role=faculty&userId=fac-001`);
    const facultyData = await assignmentsResponse.json();
    const submissionGroups = await Promise.all(facultyData.map(async (assignment) => {
      const submissionsResponse = await fetch(`${api}/assignments/${assignment.assignment_id}/submissions`);
      const assignmentSubmissions = await submissionsResponse.json();
      return assignmentSubmissions
        .filter((submission) => submission.grade_value)
        .map((submission) => ({
          ...submission,
          student_name: submission.name,
          assignment_title: assignment.title,
          subject_name: assignment.subject_name,
          graded_at: submission.graded_at,
        }));
    }));
    setGrades(submissionGroups.flat().sort((first, second) => new Date(second.graded_at) - new Date(first.graded_at)));
  }

  async function loadNotes() {
    const requestId = ++notesRequestId.current;
    const facultyView = role === 'faculty' ? '&facultyId=fac-001' : '';
    const response = await fetch(`${api}/notes?subjectId=${subjectFilter}&sort=${noteSort}${facultyView}`);
    const data = await response.json();
    if (requestId === notesRequestId.current) setNotes(data);
  }

  useEffect(() => {
    loadBootstrap();
    loadAssignments();
    loadGrades();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [subjectFilter, noteSort, role]);

  useEffect(() => {
    if (role !== 'student' || activePage !== 'notesLibrary') return undefined;

    const refreshNotes = () => loadNotes();
    const intervalId = window.setInterval(refreshNotes, 1500);
    window.addEventListener('focus', refreshNotes);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshNotes);
    };
  }, [role, activePage, subjectFilter, noteSort]);

  useEffect(() => {
    if (role === 'faculty' && activePage === 'studentGrades') loadGrades();
  }, [role, activePage]);

  useEffect(() => {
    loadSubmissions();
  }, [selectedAssignment?.assignment_id]);

  async function createAssignment(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (form.get('assignment_file')?.size > 6 * 1024 * 1024) {
      setMessage('Faculty assignment files must be 6 MB or smaller.');
      return;
    }

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
    setFacultyAssignments((current) => current.filter((assignment) => assignment.assignment_id !== assignmentId));
    setAssignments((current) => current.filter((assignment) => assignment.assignment_id !== assignmentId));
    setSelectedAssignment((current) => (
      current?.assignment_id === assignmentId
        ? facultyAssignments.find((assignment) => assignment.assignment_id !== assignmentId) || null
        : current
    ));
    setSubmissions([]);
  }

  async function submitAssignment(event, assignmentId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('file')?.size > 2 * 1024 * 1024) {
      setMessage('Student assignment submissions must be 2 MB or smaller.');
      return;
    }
    form.append('student_id', 'stu-001');
    const response = await fetch(`${api}/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      setMessage('Could not upload the submission. Please check the file and try again.');
      return;
    }
    setMessage('Submission uploaded successfully.');
    loadAssignments();
    loadSubmissions(assignmentId);
  }

  async function gradeSubmission(event, submissionId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${api}/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade_value: form.get('grade_value'),
        feedback: form.get('feedback'),
      }),
    });
    if (!response.ok) {
      setMessage('Could not save the grade. Please try again.');
      return;
    }
    setMessage('Grade posted to the student dashboard.');
    loadAssignments();
    loadSubmissions();
    loadGrades();
  }

  async function saveProfile(event, userId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${api}/users/${userId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        registration_no: form.get('registration_no'),
      }),
    });

    if (!response.ok) {
      setMessage('Could not save profile changes. Please try again.');
      return;
    }

    const updatedProfile = await response.json();
    setUsers((current) => current.map((user) => (
      user.user_id === updatedProfile.user_id ? { ...user, ...updatedProfile } : user
    )));
    setProfileOpen(false);
    setMessage('Profile updated successfully.');
  }

  async function uploadNote(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('file')?.size > 6 * 1024 * 1024) {
      setMessage('Faculty note files must be 6 MB or smaller.');
      return;
    }
    form.append('uploaded_by', 'fac-001');
    await fetch(`${api}/notes`, { method: 'POST', body: form });
    event.currentTarget.reset();
    setMessage('Note uploaded to the shared library.');
    loadNotes();
  }

  async function downloadNote(note) {
    window.open(`${api}/notes/${note.note_id}/download`, '_blank', 'noopener,noreferrer');
    setNotes((current) => current.map((item) => (
      item.note_id === note.note_id ? { ...item, download_count: item.download_count + 1 } : item
    )));
  }

  async function upvoteNote(noteId) {
    const response = await fetch(`${api}/notes/${noteId}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'stu-001' }),
    });
    if (!response.ok) {
      setMessage('Could not upvote this note.');
      return;
    }
    setNotes((current) => current.map((note) => (
      note.note_id === noteId ? { ...note, upvote_count: note.upvote_count + 1 } : note
    )));
  }

  async function reportNote(noteId) {
    const response = await fetch(`${api}/notes/${noteId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Reported by student', reported_by: 'stu-001' }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setMessage(error.error || 'Could not send the report.');
      return;
    }
    const data = await response.json();
    setMessage('Report sent to admin moderation. The note remains available while it is reviewed.');
    setNotes((current) => current.map((note) => (
      note.note_id === noteId ? { ...note, report_count: data.report_count } : note
    )));
  }

  async function deleteNote(noteId) {
    const deletedNote = notes.find((note) => note.note_id === noteId);
    ++notesRequestId.current;
    setNotes((current) => current.filter((note) => note.note_id !== noteId));
    const response = await fetch(`${api}/notes/${noteId}?facultyId=fac-001`, { method: 'DELETE' });
    if (!response.ok) {
      if (deletedNote) setNotes((current) => [deletedNote, ...current]);
      setMessage('Could not delete this note.');
      return;
    }
    setMessage('Note deleted.');
  }

  async function hideNote(noteId) {
    const previousNote = notes.find((note) => note.note_id === noteId);
    ++notesRequestId.current;
    setNotes((current) => current.map((note) => (
      note.note_id === noteId ? { ...note, status: 'hidden' } : note
    )));
    const response = await fetch(`${api}/notes/${noteId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'hidden', faculty_id: 'fac-001' }),
    });
    if (!response.ok) {
      if (previousNote) setNotes((current) => current.map((note) => (
        note.note_id === noteId ? previousNote : note
      )));
      return setMessage('Could not hide this note.');
    }
    setMessage('Note hidden from the student notes portal.');
  }

  async function republishNote(noteId) {
    const previousNote = notes.find((note) => note.note_id === noteId);
    ++notesRequestId.current;
    setNotes((current) => current.map((note) => (
      note.note_id === noteId ? { ...note, status: 'active' } : note
    )));
    const response = await fetch(`${api}/notes/${noteId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', faculty_id: 'fac-001' }),
    });
    if (!response.ok) {
      if (previousNote) setNotes((current) => current.map((note) => (
        note.note_id === noteId ? previousNote : note
      )));
      return setMessage('Could not re-publish this note.');
    }
    setMessage('Note re-published to the student notes portal.');
  }

  function signIn(selectedRole) {
    setRole(selectedRole);
    setActivePage(selectedRole === 'student' ? 'studentAssignments' : 'facultyConsole');
    setMessage('');
  }

  function signOut() {
    setRole(null);
    setProfileOpen(false);
    setMessage('');
  }

  if (!role) {
    return <LoginPage onLogin={signIn} />;
  }

  const isStudent = role === 'student';
  const studentProfile = users.find((user) => user.user_id === 'stu-001') || {
    name: 'Aarav Mohanty',
    registration_no: '2505280041',
  };
  const facultyProfile = users.find((user) => user.user_id === 'fac-001') || {
    name: 'Prof. Meera Sen',
    registration_no: 'FAC-001',
  };
  const activeProfile = isStudent ? studentProfile : facultyProfile;
  const pages = isStudent
    ? [
        ['studentAssignments', 'Student Assignments'],
        ['notesLibrary', 'Notes Library'],
      ]
    : [
        ['facultyConsole', 'Faculty Console'],
        ['facultyGrading', 'Grade Submissions'],
        ['notesManagement', 'Notes Management'],
        ['studentGrades', 'Student Grades'],
      ];

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{isStudent ? 'NIBA STUDENT PORTAL' : 'NIBA FACULTY PORTAL'}</p>
          <h1>{pages.find(([page]) => page === activePage)?.[1]}</h1>
        </div>
        <div className="account-actions">
          <div className="status-strip">
            <strong>{isStudent ? pendingAssignments.length : facultyAssignments.length}</strong>
            <span>{isStudent ? 'Pending' : 'Assignments'}</span>
          </div>
          <div className="profile-menu">
            <button
              className="profile-button"
              type="button"
              aria-label={`View ${isStudent ? 'student' : 'faculty'} profile`}
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              {activeProfile.name.charAt(0)}
            </button>
            {profileOpen && (
              <section className="profile-card" aria-label={`Edit ${isStudent ? 'student' : 'faculty'} profile`}>
                <form className="profile-form" onSubmit={(event) => saveProfile(event, isStudent ? 'stu-001' : 'fac-001')}>
                  <label>
                    Name
                    <input name="name" defaultValue={activeProfile.name} required />
                  </label>
                  <label>
                    {isStudent ? 'Registration number' : 'Faculty ID'}
                    <input name="registration_no" defaultValue={activeProfile.registration_no || (isStudent ? '2505280041' : 'FAC-001')} required />
                  </label>
                  {isStudent && <span>Course: MCA</span>}
                  <button type="submit">Save profile</button>
                </form>
              </section>
            )}
          </div>
          <button className="logout" type="button" onClick={signOut}>Log out</button>
        </div>
      </header>

      <nav className="tabs" aria-label="Primary">
        {pages.map(([page, label]) => (
          <button key={page} className={activePage === page ? 'active' : ''} onClick={() => setActivePage(page)}>{label}</button>
        ))}
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
          onCreateAssignment={createAssignment}
          onSelectAssignment={setSelectedAssignment}
          onDeleteAssignment={deleteAssignment}
        />
      )}

      {activePage === 'facultyGrading' && (
        <FacultyGradingPage
          facultyAssignments={facultyAssignments}
          selectedAssignment={selectedAssignment}
          submissions={submissions}
          onSelectAssignment={setSelectedAssignment}
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
          canUpload={false}
        />
      )}

      {activePage === 'notesManagement' && (
        <NotesLibraryPage
          subjects={subjects}
          notes={notes}
          subjectFilter={subjectFilter}
          noteSort={noteSort}
          onSubjectFilterChange={setSubjectFilter}
          onNoteSortChange={setNoteSort}
          onUploadNote={uploadNote}
          onDeleteNote={deleteNote}
          onHideNote={hideNote}
          onRepublishNote={republishNote}
          canUpload
          isFaculty
        />
      )}

      {activePage === 'studentGrades' && <FacultyStudentGradesPage grades={grades} />}
    </main>
  );
}

function LoginPage({ onLogin }) {
  return (
    <main className="login-page" style={{ backgroundImage: `linear-gradient(135deg, rgba(12, 43, 31, .58), rgba(23, 71, 46, .28)), url(${niisCampus})` }}>
      <section className="login-card">
        <div className="login-brand"><img src={niisLogo} alt="NIIS Group of Institutions logo" /><strong>NIIS Institute of Business Administration</strong></div>
        <h1>Welcome</h1>
        <p className="login-copy">Choose your portal to continue to your academic workspace.</p>
        <div className="login-options">
          <button className="login-option student-login" type="button" onClick={() => onLogin('student')}>
            <span className="login-icon">▤</span><span><strong>Student Login</strong><small>Assignments and notes library</small></span><b>→</b>
          </button>
          <button className="login-option faculty-login" type="button" onClick={() => onLogin('faculty')}>
            <span className="login-icon">♟</span><span><strong>Faculty Login</strong><small>Console and moderation queue</small></span><b>→</b>
          </button>
        </div>
      </section>
    </main>
  );
}
