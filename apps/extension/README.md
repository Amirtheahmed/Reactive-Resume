# Reactive Resume Copilot (browser extension)

A Chrome side panel for this fork. On a job posting it can:

- read the posting (title, company, description),
- generate a tailored resume or cover letter from the resume tagged `master`,
- fill the application form: obvious fields from your profile, open questions answered by your AI provider. You review every value before anything is written to the page.

## Build and load

```bash
cp .env.example .env.production   # set VITE_APP_URL to your Reactive Resume address
pnpm --filter extension build
```

Then open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and pick `apps/extension/dist`.
Create an API key with full access in Reactive Resume (Settings → AI & developer) and paste it into the panel.

The extension is only granted access to the host in `VITE_APP_URL`; rebuild after changing it.

## How it is put together

- `src/content.ts` runs in the page. It reads the posting and the form and fills approved values. It has no network access and never sees the API key.
- `src/App.tsx` and `src/views.tsx` are the side panel. It holds the API key (in `chrome.storage.local`) and calls `/api/openapi` on your instance.
- `src/autofill.ts` is the form logic, covered by `src/autofill.test.ts`.

Only fields the browser reports as visible are offered, and password, file and hidden inputs are never filled.
