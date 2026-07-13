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
  return (
    <section className="grid faculty">
      <form className="panel form" onSubmit={onCreateAssignment}>
        <h2>Create assignment</h2>
        <label>Title<input name="title" placeholder="DBMS Lab 3" required /></label>
        <label>Description<textarea name="description" rows="4" required /></label>
        <label>
          Subject
          <select name="subject_id" required>
            {subjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>{subject.name}</option>
            ))}
          </select>
        </label>
        <label>Deadline<input name="deadline" type="datetime-local" required /></label>
        <label>Assignment File<input type="file" name="assignment_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required /></label>
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
            <article className="card compact" key={submission.user_id}>
              <div className="card-head">
                <h3>{submission.name}</h3>
                <span className={`pill ${submission.submission_id ? 'ok' : ''}`}>
                  {submission.submission_id ? (submission.is_late ? 'Late' : 'On time') : 'Missing'}
                </span>
              </div>
              {submission.submission_id ? (
                <>
                  <a className="download" href={`http://127.0.0.1:4000${submission.file_url}`} target="_blank" rel="noreferrer">
                    Download {submission.original_name}
                  </a>
                  <form className="grade-form" onSubmit={(event) => onGradeSubmission(event, submission.submission_id)}>
                    <input name="grade_value" placeholder="8/10, A, Pass..." defaultValue={submission.grade_value || ''} required />
                    <input name="feedback" placeholder="Feedback" defaultValue={submission.feedback || ''} />
                    <button type="submit">Save Grade</button>
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
