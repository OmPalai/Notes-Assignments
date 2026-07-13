import { formatDate } from '../lib.js';

export default function NotesLibraryPage({
  subjects,
  notes,
  subjectFilter,
  noteSort,
  onSubjectFilterChange,
  onNoteSortChange,
  onUploadNote,
  onDownloadNote,
  onUpvoteNote,
  onReportNote,
}) {
  return (
    <section className="grid notes-grid">
      <form className="panel form" onSubmit={onUploadNote}>
        <h2>Upload note</h2>
        <label>Title<input name="title" placeholder="OS Unit 3 - Process Scheduling" required /></label>
        <label>
          Subject
          <select name="subject_id" required>
            {subjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>{subject.name}</option>
            ))}
          </select>
        </label>
        <label>Topic<input name="topic" placeholder="Process Scheduling" required /></label>
        <label>Description<textarea name="description" rows="3" /></label>
        <label>File<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required /></label>
        <button type="submit">Upload Note</button>
      </form>

      <div>
        <div className="filters">
          <select value={subjectFilter} onChange={(event) => onSubjectFilterChange(event.target.value)}>
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>{subject.name}</option>
            ))}
          </select>
          <select value={noteSort} onChange={(event) => onNoteSortChange(event.target.value)}>
            <option value="recent">Most recent</option>
            <option value="downloaded">Most downloaded</option>
            <option value="upvoted">Most upvoted</option>
          </select>
        </div>
        <div className="stack">
          {notes.map((note) => (
            <article className="card" key={note.note_id}>
              <div className="card-head">
                <div>
                  <p className="eyebrow">{note.subject_name} / {note.topic}</p>
                  <h3>{note.title}</h3>
                </div>
                <span className="pill">{note.status}</span>
              </div>
              <p>{note.description || 'No description added.'}</p>
              <p className="meta">By {note.uploader} / {formatDate(note.uploaded_at)}</p>
              <div className="actions">
                <button onClick={() => onDownloadNote(note)}>Download ({note.download_count})</button>
                <button onClick={() => onUpvoteNote(note.note_id)}>Upvote ({note.upvote_count})</button>
              </div>
              <form className="report-form" onSubmit={(event) => onReportNote(event, note.note_id)}>
                <input name="reason" placeholder="Report reason" required />
                <button type="submit">Report</button>
              </form>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
