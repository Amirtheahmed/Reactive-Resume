# 🧩 Reactive Resume Copilot: Usage Guide

This guide explains how to build, load, and use the Reactive Resume Copilot browser extension locally.

## Prerequisites

*   The Reactive Resume server must be running (`http://localhost:3000`).
*   The client must be running (`http://localhost:5173`).
*   You must have Google Chrome or a Chromium-based browser.

## 1. Build the Extension

Run the following command in the root of the monorepo:

```bash
pnpm nx build extension
```

This will generate the extension artifacts in `dist/apps/extension`.

> **Note:** For development with hot-reload, you can use `pnpm nx serve extension`.

## 2. Load into Chrome

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `dist/apps/extension` folder.

You should now see the "Reactive Resume Copilot" in your extensions list.

## 3. Configuration

1.  Go to the [Reactive Resume Dashboard](http://localhost:5173/dashboard/settings).
2.  Navigate to **Settings -> Developer**.
3.  Click **Create New Key**. Name it "Extension".
4.  **Copy the Secret Key**.
5.  Open the Extension in Chrome (click the icon in the toolbar).
6.  Paste the API Key into the "Connect" screen.

## 4. Features

### A. Context-Aware Resume Generation
1.  Navigate to a job posting (e.g., a LinkedIn job page or a company careers page).
2.  Open the Extension Side Panel.
3.  Click **Analyze Job Page**.
4.  Review the extracted Job Title, Company, and Description.
5.  Click **Generate Resume**.
6.  Once complete, you can download the PDF or view the Preview.

### B. Smart Autofill
1.  Navigate to a job application form (e.g., "Apply Now" page).
2.  Open the Extension Side Panel.
3.  Click **Autofill This Page**.
4.  The extension will attempt to match your profile data to the form fields.
5.  Matched fields will be highlighted in light green.

