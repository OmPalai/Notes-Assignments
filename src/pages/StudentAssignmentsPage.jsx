import { formatDate } from '../lib.js';

export default function StudentAssignmentsPage({ assignments, pendingAssignments, onSubmitAssignment }) {
  return (
    <section className="grid two">
      <div>
        <h2>Assignments by deadline</h2>
        <div className="stack">
          {assignments.map((assignment) => (
            <article className="card" key={assignment.assignment_id}>
              <div className="card-head">
                <div>
                  <p className="eyebrow">{assignment.subject_name}</p>
                  <h3>{assignment.title}</h3>
                </div>
                <span className={assignment.submission_id ? 'pill ok' : 'pill'}>
                  {assignment.submission_id ? 'Submitted' : 'Pending'}
                </span>
              </div>
              <p>{assignment.description}</p>
              <p className="meta">Deadline: {formatDate(assignment.deadline)}</p>
              {assignment.assignment_file_url && (
                <a className="download" href={`http://127.0.0.1:4000${assignment.assignment_file_url}`} target="_blank" rel="noreferrer">
                  View assignment: {assignment.assignment_original_name || 'Open file'}
                </a>
              )}
              {assignment.grade_value && (
                <div className="feedback">
                  <strong>Grade: {assignment.grade_value}</strong>
                  <span>{assignment.feedback || 'No feedback added.'}</span>
                </div>
              )}
              {!assignment.submission_id || assignment.allow_resubmit ? (
                <form className="inline-form" onSubmit={(event) => onSubmitAssignment(event, assignment.assignment_id)}>
                  <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required />
                  <small className="file-limit">Maximum file size: 2 MB</small>
                  <button type="submit">{assignment.submission_id ? 'Resubmit' : 'Submit'}</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </div>
      <aside className="panel">
        <h2>Student dashboard</h2>
        <p>Grades and feedback appear here as soon as faculty posts them. Late submissions are still accepted and visibly flagged for faculty review.</p>
        <div className="metric-row">
          <span>Submitted</span>
          <strong>{assignments.filter((item) => item.submission_id).length}</strong>
        </div>
        <div className="metric-row">
          <span>Awaiting upload</span>
          <strong>{pendingAssignments.length}</strong>
        </div>
      </aside>
    </section>
  );
}
