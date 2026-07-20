---
name: Gemini API model availability and voice quirks
description: Which Gemini models exist in this project's API key, what fails silently, and key lessons about voice/vision.
---

## Available models (verified via direct generateContent test July 2026)
- `gemini-2.5-flash` ✅ — text+vision, free tier, supports thinkingConfig
- `gemini-2.0-flash` ✅ — text+vision, free tier, NO thinkingConfig
- `gemini-2.0-flash-lite` ✅ — text+vision, most generous free-tier limits, NO thinkingConfig
- `gemini-2.5-flash-preview-tts` — TTS only
- `gemini-2.5-flash-native-audio-latest` — Live voice bidi only

## ❌ gemini-1.5-flash and gemini-1.5-pro do NOT exist
Return 404 "not found for API version v1beta". Not a quota issue — literally absent from the endpoint.

**Why:** The `@google/genai` library uses `v1beta` endpoint. Gemini 1.5 models are not available there regardless of free-tier claims in documentation.

## Model strategy (current — verified working)
- All text + vision endpoints → **`gemini-2.5-flash`** (primary, no thinkingConfig)
- Fallback chain on quota/overload: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite`
- thinkingConfig stripped automatically when falling back to 2.0-flash or 2.0-flash-lite
- TTS → `gemini-2.5-flash-preview-tts` (keep as-is)
- Live voice → `gemini-2.5-flash-native-audio-latest` (keep as-is)
- OpenRouter provider → `google/gemini-2.5-flash` (user's own key, keep as-is)

## OCR endpoint design
- Always return HTTP 200 from catch block — never 4xx/5xx
- Put error code in body: `{ error: "quota"|"rate_limit"|"auth"|"ocr_failed", text: null }`
- Frontend checks `data.error` from body, not `res.ok`
- `handleOcrImageAttachment` in App.tsx: no `if (!res.ok) throw` — reads body and maps error codes to Arabic messages

## Voice AudioContext
- Create `new AudioContext()` with no sampleRate arg — let browser choose native rate
- Gemini Live input expects 16kHz PCM — downsample in ScriptProcessor.onaudioprocess
- Gemini Live output is 24kHz — plays correctly in native-rate AudioContext
