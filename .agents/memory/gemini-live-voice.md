---
name: Gemini API model availability and voice quirks
description: Which Gemini models exist in this project's API key, what fails silently, and key lessons about voice/vision.
---

## Available models (verified via ListModels July 2026)
- `gemini-2.5-flash` — text+vision, free tier, supports thinkingConfig
- `gemini-2.0-flash` — text+vision, better free-tier limits, NO thinkingConfig
- `gemini-2.0-flash-lite` — text+vision, most generous free-tier limits, NO thinkingConfig
- `gemini-2.5-flash-preview-tts` — TTS only
- `gemini-2.5-flash-native-audio-latest` — Live voice bidi only

## ❌ gemini-1.5-flash does NOT exist
Returns 404 "not found for API version v1beta". Do not use it.

## Model strategy (current)
- All text + vision endpoints → `gemini-2.0-flash`
- Fallback on quota/overload → `gemini-2.0-flash-lite`
- TTS → `gemini-2.5-flash-preview-tts` (keep as-is)
- Live voice → `gemini-2.5-flash-native-audio-latest` (keep as-is)
- OpenRouter provider → `google/gemini-2.5-flash` (user's own key, keep as-is)

**Why:** gemini-2.5-flash hits free-tier quota for vision tasks quickly. gemini-2.0-flash has better multimodal free limits. thinkingConfig only works on 2.5-flash and above — must be stripped before passing to 2.0-flash or lite.

## OCR endpoint design
- Always return HTTP 200 from catch block — never 4xx/5xx
- Put error code in body: `{ error: "quota"|"rate_limit"|"auth"|"ocr_failed", text: null }`
- Frontend checks `data.error` from body, not `res.ok`
- `handleOcrImageAttachment` in App.tsx had a `if (!res.ok) throw` that was intercepting quota errors as "فشل الخادم"

## Voice AudioContext
- Create `new AudioContext()` with no sampleRate arg — let browser choose native rate
- Gemini Live input expects 16kHz PCM — downsample in ScriptProcessor.onaudioprocess
- Gemini Live output is 24kHz — plays correctly in native-rate AudioContext
