import { useState } from 'react';

export default function FacultyConsolePage({
  subjects,
  facultyAssignments,
  selectedAssignment,
  submissions,
  onCreateAssignment,
  onSelectAssignment,
  onDeleteAssignment,
  onGradeSubmission,
}) {
  const [previewing, setPreviewing] = useState(null);
  const canPreview = (filename = '') => /\.(pdf|png|jpe?g)$/i.test(filename);

  return (
    <section className="grid faculty">
      <form className="panel form" onSubmit={onCreateAssignment}>
        <h2>Create assignment</h2>
        <div className="form-row assignment-details">
          <label>
            Subject
            <select name="subject_id" required>
              {subjects.map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>{subject.name}</option>
              ))}
            </select>
          </label>
          <label>
            Course
            <select name="course" defaultValue="MCA" required>
              <option value="MCA">MCA</option>
              <option value="MBA">MBA</option>
              <option value="MSC">MSC</option>
            </select>
          </label>
          <label>
            Semester
            <select name="semester" defaultValue="1" required>
              {[1, 2, 3, 4].map((semester) => (
                <option key={semester} value={semester}>Semester {semester}</option>
              ))}
            </select>
          </label>
        </div>
        <label>Title<input name="title" placeholder="DBMS Lab 3" required /></label>
        <label>Description<textarea name="description" rows="4" required /></label>
        <label>Deadline<input name="deadline" type="datetime-local" required /></label>
        <label>Assignment File<input type="file" name="assignment_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required /><small className="file-limit">Maximum file size: 6 MB</small></label>
        <label className="check"><input name="allow_resubmit" type="checkbox" /> Allow resubmission before deadline</label>
        <button type="submit">Create Assignment</button>
      </form>

      <div>
        <h2>Posted assignments</h2>
        <div className="stack">
          {facultyAssignments.map((assignment) => (
            <div
              className={`assignment-row ${selectedAssignment?.assignment_id === assignment.assignment_id ? 'selected' : ''}`}
              key={assignment.assignment_id}
              role="button"
              tabIndex="0"
              onClick={() => onSelectAssignment(assignment)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSelectAssignment(assignment);
              }}
            >
              <span>
                {assignment.title}
                {assignment.assignment_original_name && <small>{assignment.assignment_original_name}</small>}
              </span>
              <div className="assignment-actions">
                <strong>{assignment.submission_count} submissions</strong>
                <button
                  className="danger"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteAssignment(assignment.assignment_id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2>Submissions</h2>
        <div className="stack">
          {submissions.map((submission) => (
            <article className="card compact submission-card" key={submission.user_id}>
              <div className="card-head">
                <h3>{submission.name} <span className="student-registration">{submission.registration_no}</span></h3>
                <span className={`pill ${submission.submission_id ? 'ok' : ''}`}>
                  {submission.submission_id ? (submission.is_late ? 'Late' : 'On time') : 'Missing'}
                </span>
              </div>
              {submission.submission_id ? (
                <>
                  <div className="submission-file">
                    <strong>{submission.original_name}</strong>
                    {canPreview(submission.original_name) ? (
                      <button type="button" className="secondary" onClick={() => setPreviewing(previewing === submission.submission_id ? null : submission.submission_id)}>
                        {previewing === submission.submission_id ? 'Hide view' : 'View'}
                      </button>
                    ) : <span className="meta">View is available for PDF and image files.</span>}
                  </div>
                  {previewing === submission.submission_id && (
                    <iframe className="submission-preview" title={`View of ${submission.original_name}`} src={`http://127.0.0.1:4000${submission.file_url}`} />
                  )}
                  <form className="grade-form" onSubmit={(event) => onGradeSubmission(event, submission.submission_id)}>
                    <label>
                      Mark secured
                      <input name="grade_value" placeholder="8/10, A, Pass..." defaultValue={submission.grade_value || ''} required />
                    </label>
                    <label>
                      Feedback
                      <input name="feedback" placeholder="Add feedback" defaultValue={submission.feedback || ''} />
                    </label>
                    <button type="submit">Submit</button>
                  </form>
                </>
              ) : (
                <p className="meta">No submission yet. Faculty can chase this student.</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
