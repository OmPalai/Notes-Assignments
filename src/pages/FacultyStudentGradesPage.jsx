import { formatDate } from '../lib.js';

export default function FacultyStudentGradesPage({ grades }) {
  return (
    <section className="grades-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Grade records</p>
          <h2>Student Grades</h2>
          <p className="meta">Every grade saved by faculty is listed here with the student's name and registration number.</p>
        </div>
        <strong className="grade-count">{grades.length} graded submission{grades.length === 1 ? '' : 's'}</strong>
      </div>

      {grades.length === 0 ? <div className="empty">No grades have been submitted yet.</div> : (
        <div className="grades-table-wrap">
          <table className="grades-table">
            <thead><tr><th>Student name</th><th>Registration number</th><th>Assignment</th><th>Subject</th><th>Grade</th><th>Feedback</th><th>Submitted on</th></tr></thead>
            <tbody>
              {grades.map((grade) => (
                <tr key={grade.submission_id}>
                  <td><strong>{grade.student_name}</strong></td>
                  <td>{grade.registration_no || 'Not available'}</td>
                  <td>{grade.assignment_title}</td>
                  <td>{grade.subject_name}</td>
                  <td><span className="pill ok">{grade.grade_value}</span></td>
                  <td>{grade.feedback || '—'}</td>
                  <td>{formatDate(grade.graded_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
