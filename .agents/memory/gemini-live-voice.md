---
name: Gemini API model availability and correct usage pattern
description: Which Gemini models work with this project's API key, the correct contents format, and thinkingConfig usage.
---

## Available models (verified via direct test July 2026)
- `gemini-2.5-flash` ✅ — primary model for all text + vision
- `gemini-2.0-flash` ✅ — fallback on quota/overload
- `gemini-2.5-flash-preview-tts` — TTS only
- `gemini-2.5-flash-native-audio-latest` — Live voice bidi only

## ❌ gemini-1.5-flash and gemini-1.5-pro do NOT exist
Return 404 "not found for API version v1beta". This is not a quota error — they are absent from the v1beta endpoint used by @google/genai library regardless of free-tier documentation claims.

## Correct API usage pattern (from confirmed-working reference code)

### getAI() — must include User-Agent header
```ts
new GoogleGenAI({
  apiKey: key,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } }
})
```

### Vision calls — flat parts array (NOT role-wrapped)
```ts
// ✅ CORRECT (matches old working code)
contents: [imagePart, { text: promptText }],
config: { thinkingConfig: { thinkingBudget: 0 } }

// ❌ WRONG — causes silent failures
contents: [{ role: "user", parts: [imagePart, { text: promptText }] }]
```

### Text calls — plain string contents
```ts
contents: "system prompt\n\nuser prompt",
config: { thinkingConfig: { thinkingBudget: 0 } }
```

### thinkingConfig: { thinkingBudget: 0 }
- Setting budget to 0 = disable thinking = works on BOTH gemini-2.5-flash AND gemini-2.0-flash
- Do NOT strip thinkingConfig on fallback — budget:0 is universally compatible
- Only non-zero budgets require gemini-2.5 or higher

## Fallback strategy (current)
Simple two-level: `gemini-2.5-flash` → `gemini-2.0-flash` on 503/429/UNAVAILABLE/RESOURCE_EXHAUSTED.
Keep thinkingConfig unchanged (budget:0 is compatible).

## OCR endpoint design
- Always return HTTP 200 from catch block — never 4xx/5xx
- Put error code in body: `{ error: "quota"|"rate_limit"|"auth"|"ocr_failed", text: null }`
- Frontend reads `data.error` from body, not `res.ok`

## Voice AudioContext
- Create `new AudioContext()` with no sampleRate arg — let browser choose native rate
- Gemini Live input expects 16kHz PCM — downsample in ScriptProcessor.onaudioprocess
- Gemini Live output is 24kHz — plays correctly in native-rate AudioContext
