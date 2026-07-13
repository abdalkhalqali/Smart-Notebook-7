---
name: Gemini Live voice model quirks
description: Correct model/modality combo for @google/genai live.connect (Gemini Live bidiGenerateContent), and how to diagnose silent WS failures.
---

# Gemini Live voice quirks

- A wrong live model name (e.g. `gemini-2.0-flash-live-001`) or an unsupported
  `responseModalities` combo (e.g. `[AUDIO, TEXT]` together) makes the Gemini Live
  session close immediately after `onopen`. The client WebSocket just sees a bare
  close (code 1005/1008) with **no error frame**, because the failure happens on the
  `geminiSession.onclose`/`onerror` callback path, not inside the outer try/catch
  around `live.connect()`. If a live voice feature "just stops responding" with no
  error shown, add a console.error in the session's `onclose`/`onerror` callbacks
  first — don't assume it's an API-key problem.
- Find the actual usable live model + its supported response modality by querying
  `GET https://generativelanguage.googleapis.com/v1beta/models?key=$KEY` and filtering
  for `supportedGenerationMethods` including `bidiGenerateContent`. As of writing, that
  was `gemini-2.5-flash-native-audio-latest`, and it only supports `responseModalities: [AUDIO]`
  (not TEXT alongside it) — get the model's spoken transcript via
  `outputAudioTranscription`/`inputAudioTranscription` config instead of a text response part.
- Also watch for `part.thought === true` in `serverContent.modelTurn.parts` — that's the
  model's internal reasoning trace, not the actual reply; filter it out before treating
  `part.text` as a transcript.

**Why:** cost real debugging time tracing a "no voice reply" bug back through a completely
silent failure path in a Node/Express WS proxy wrapping `@google/genai`'s live API.

**How to apply:** when building/debugging any Gemini Live (real-time voice) integration.
