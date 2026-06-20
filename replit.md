# UnNoted Smart Notebook

An AI-powered digital notebook for students. Organizes studies into Universities → Years → Subjects → Lectures with an interactive canvas, audio/video recording, and AI features (summarization, quiz generation, flashcards) powered by Google Gemini.

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite 6, Tailwind CSS 4
- **Backend**: Express.js (Node.js) — serves the frontend and proxies all AI API calls
- **AI**: Google Gemini (`@google/genai`) via `GEMINI_API_KEY` secret

## Running the App
```
npm run dev
```
Starts the Express server on port 5000 with Vite middleware for hot-reload.

## Architecture
- `server.ts` — Express server with all `/api/ai/*` endpoints and Vite dev middleware
- `src/` — React frontend (main entry: `src/main.tsx`)
- `src/App.tsx` — Root component with all global state management

## User Preferences
- Keep the Arabic-language UI strings as-is (app is designed for Arabic-speaking students)
