import { useState } from 'react';
import { apiOrigin, formatDate } from '../lib.js';

export default function FacultyGradingPage({
  facultyAssignments,
  selectedAssignment,
  submissions,
  onSelectAssignment,
  onGradeSubmission,
}) {
  const [previewing, setPreviewing] = useState(null);
  const canPreview = (filename = '') => /\.(pdf|png|jpe?g)$/i.test(filename);

  return (
    <section className="grading-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Assessment workspace</p>
          <h2>View and grade submissions</h2>
          <p className="meta">Select an assignment, open each uploaded file, then save the grade and feedback for the student.</p>
        </div>
        <label className="assignment-picker">
          Assignment
          <select
            value={selectedAssignment?.assignment_id || ''}
            onChange={(event) => onSelectAssignment(facultyAssignments.find((item) => item.assignment_id === event.target.value) || null)}
          >
            <option value="" disabled>Select an assignment</option>
            {facultyAssignments.map((assignment) => (
              <option key={assignment.assignment_id} value={assignment.assignment_id}>{assignment.title}</option>
            ))}
          </select>
        </label>
      </div>

      {!selectedAssignment ? <div className="empty">Create or select an assignment to review student submissions.</div> : (
        <>
          <div className="grading-summary">
            <strong>{selectedAssignment.title}</strong>
            <span>{selectedAssignment.subject_name}</span>
            <span>Deadline: {formatDate(selectedAssignment.deadline)}</span>
            <span>{submissions.filter((item) => item.submission_id).length} of {submissions.length} uploaded</span>
          </div>
          <div className="stack">
            {submissions.map((submission) => (
              <article className="card compact submission-card" key={submission.user_id}>
                <div className="card-head">
                  <div>
                    <h3>{submission.name}</h3>
                    <span className="student-registration">Registration No.: {submission.registration_no || 'Not available'}</span>
                  </div>
                  <span className={`pill ${submission.submission_id ? 'ok' : ''}`}>
                    {submission.submission_id ? (submission.is_late ? 'Late' : 'On time') : 'Missing'}
                  </span>
                </div>
                {submission.submission_id ? (
                  <>
                    <div className="submission-file">
                      <strong>{submission.original_name}</strong>
                      <a className="download" href={`${apiOrigin}${submission.file_url}`} target="_blank" rel="noreferrer">Open file</a>
                      {canPreview(submission.original_name) && (
                        <button type="button" className="secondary" onClick={() => setPreviewing(previewing === submission.submission_id ? null : submission.submission_id)}>
                          {previewing === submission.submission_id ? 'Hide preview' : 'Preview'}
                        </button>
                      )}
                    </div>
                    {previewing === submission.submission_id && (
                      <iframe className="submission-preview" title={`Preview of ${submission.original_name}`} src={`${apiOrigin}${submission.file_url}`} />
                    )}
                    <form className="grade-form" onSubmit={(event) => onGradeSubmission(event, submission.submission_id)}>
                      <label>Grade<input name="grade_value" placeholder="8/10, A, Pass..." defaultValue={submission.grade_value || ''} required /></label>
                      <label>Feedback<input name="feedback" placeholder="Add feedback" defaultValue={submission.feedback || ''} /></label>
                      <button type="submit">Save grade</button>
                    </form>
                  </>
                ) : <p className="meta">No submission uploaded yet.</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
