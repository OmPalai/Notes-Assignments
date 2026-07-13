# Student OS - Notes Sharing + Assignment Submission

This is a React + Express + SQLite implementation based on the `05_Notes_and_Assignments_PRD.docx` requirements.

## Files

- `src/App.jsx` - main app shell and page navigation
- `src/pages/StudentAssignmentsPage.jsx` - student assignment page
- `src/pages/FacultyConsolePage.jsx` - faculty assignment and grading page
- `src/pages/NotesLibraryPage.jsx` - notes upload, browse, vote, and report page
- `src/pages/ModerationPage.jsx` - admin moderation page
- `src/lib.js` - shared frontend constants and date formatting
- `src/styles.css` - website styling
- `server/server.js` - Express API routes
- `server/db.js` - SQLite connection and seed data
- `server/schema.sql` - database schema
- `uploads/` - uploaded assignment and notes files
- `data/studentos.db` - SQLite database, created when the server starts

## Run

```bash
npm install
npm run dev
```

The website runs on `http://127.0.0.1:5173` and the API runs on `http://127.0.0.1:4000`.

## Included Features

- Student assignment list sorted by deadline
- Faculty assignment file upload during assignment creation
- Student assignment file view/download link
- Assignment upload and resubmission handling
- Faculty assignment creation
- Faculty submission list with late/missing status
- Flexible grading field and feedback
- Notes upload, browsing, filtering, sorting, download count, and upvote count
- Report flow and admin moderation queue
"# Notes-Assignments" 
