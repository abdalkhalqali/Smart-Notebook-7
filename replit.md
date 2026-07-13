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

## Secrets
- `GEMINI_API_KEY` — required for all real AI features (summarization, quizzes, flashcards, live voice chat via `/ws/voice-chat`). Configured in Replit Secrets.

## Media Studio note
- The "Media Studio" (استديو الوسائط المتعددة) avatar/voice-clone video feature (`src/components/AvatarVideoGenerator.tsx`, `/api/ai/generate-avatar-video`, `/api/ai/generate-video-with-voice`, `/api/ai/text-to-speech` in `server.ts`) is currently a UI mock: it returns the uploaded photo as a still "video" and a silent placeholder audio track — it does not actually clone voices or animate a talking avatar yet. Live voice chat (`VoiceConversation.tsx`, Gemini Live) is fully functional.

## User Preferences
- Keep the Arabic-language UI strings as-is (app is designed for Arabic-speaking students)
