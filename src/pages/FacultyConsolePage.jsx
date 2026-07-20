export default function FacultyConsolePage({
  subjects,
  facultyAssignments,
  selectedAssignment,
  onCreateAssignment,
  onSelectAssignment,
  onDeleteAssignment,
}) {
  return (
    <section className="faculty-console">
      <form className="panel form" onSubmit={onCreateAssignment}>
        <h2>Create Assignment</h2>
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

      <div className="posted-assignments">
        <h2>Posted Assignment</h2>
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
      </div>
    </section>
  );
}
