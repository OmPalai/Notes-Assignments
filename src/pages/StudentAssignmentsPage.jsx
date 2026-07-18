import { useEffect, useState } from 'react';
import { apiOrigin, formatDate } from '../lib.js';

function DeadlineCountdown({ deadline }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const remaining = new Date(deadline).getTime() - currentTime;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (remaining <= 0) return <p className="countdown expired">Deadline passed</p>;

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const timeLeft = [
    days && `${days}d`,
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(seconds).padStart(2, '0')}s`,
  ].filter(Boolean).join(' ');

  return <p className="countdown">Time left to upload: <strong>{timeLeft}</strong></p>;
}

export default function StudentAssignmentsPage({ assignments, pendingAssignments, onSubmitAssignment }) {
  const [hiddenAssignmentIds, setHiddenAssignmentIds] = useState([]);

  function hideAssignment(assignmentId) {
    setHiddenAssignmentIds((current) => [...current, assignmentId]);
  }

  function expandAssignment(assignmentId) {
    setHiddenAssignmentIds((current) => current.filter((id) => id !== assignmentId));
  }

  return (
    <section className="grid two">
      <div>
        <h2>Assignments by deadline</h2>
        <div className="stack">
          {assignments.map((assignment) => (
            hiddenAssignmentIds.includes(assignment.assignment_id) ? (
              <button
                className="assignment-collapsed"
                key={assignment.assignment_id}
                type="button"
                title={`Expand ${assignment.title}`}
                aria-label={`Expand ${assignment.title}`}
                onClick={() => expandAssignment(assignment.assignment_id)}
              >
                <strong>{assignment.title}</strong>
                <span>Show assignment</span>
              </button>
            ) : (
              <article className="card" key={assignment.assignment_id}>
              <div className="card-head">
                <div>
                  <p className="eyebrow">{assignment.subject_name}</p>
                  <h3>{assignment.title}</h3>
                </div>
                <div className="assignment-card-actions">
                  <span className={assignment.submission_id ? 'pill ok' : 'pill'}>
                    {assignment.submission_id ? 'Submitted' : 'Pending'}
                  </span>
                  {assignment.grade_value && assignment.feedback?.trim() && (
                    <button type="button" className="secondary" onClick={() => hideAssignment(assignment.assignment_id)}>Hide</button>
                  )}
                </div>
              </div>
              <p>{assignment.description}</p>
              <p className="meta">Deadline: {formatDate(assignment.deadline)}</p>
              <DeadlineCountdown deadline={assignment.deadline} />
              {assignment.assignment_file_url && (
                <a className="download" href={`${apiOrigin}${assignment.assignment_file_url}`} target="_blank" rel="noreferrer">
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
            )
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
