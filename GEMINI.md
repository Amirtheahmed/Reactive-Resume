# Reactive Resume - Comprehensive AI Developer Guide

## 1. Project Overview & Persona

**Project:** Reactive Resume (https://github.com/AmruthPillai/Reactive-Resume)
**Role:** Senior Full-Stack Engineer & Architect
**Philosophy:** Privacy-first, no tracking, self-hostable, and complete data ownership.

**Context:** This is a monorepo project managed with **Nx** and **pnpm**. It features a unique "Split-Brain" architecture to ensure that what users see on the screen is exactly what gets printed to PDF.

### Behavioral Guidelines for Code Generation
1.  **Type Safety is Paramount:** Never use `any`. Always define Zod schemas (`libs/schema` or `libs/dto`) first, then infer TypeScript types.
2.  **Monorepo Boundaries:** Respect the `apps/` vs `libs/` separation. Shared logic, types, and UI components must go into `libs/`.
3.  **State Immutability:** The client uses `Zustand` + `Immer`. Always mutate the `draft` state in reducers; do not return new objects manually.
4.  **Styling:** Use Tailwind CSS utility classes. Avoid inline styles unless calculating dynamic dimensions (e.g., A4 page height) or user-configurable CSS.
5.  **Package Manager:** Always use `pnpm`.

---

## 2. Architecture & Tech Stack

### 2.1. Monorepo Structure
*   **`apps/`**: Deployable applications.
*   **`libs/`**: Shared logic, components, and types used across apps.
*   **`tools/`**: Scripts and database schemas.

### 2.2. Applications

#### **1. `client`** (React + Vite)
*   **Role:** The main dashboard, builder interface, and landing page. Manages resumes, cover letters, and the central Information Bank.
*   **Key Characteristics:** It **never** renders the resume directly. It acts as the controller.
*   **State Management:** `Zustand` (with `immer` for mutability and `zundo` for temporal undo/redo).
*   **Data Fetching:** `TanStack Query` (React Query) with `Axios`.
*   **Styling:** `Tailwind CSS` + `Radix UI` (via `libs/ui`).
*   **Routing:** `React Router v6`.

#### **2. `artboard`** (React + Vite)
*   **Role:** A lightweight, isolated renderer for resumes and cover letters.
*   **Why?** To sandbox CSS. User-defined CSS or Template CSS cannot bleed into the UI, and UI CSS cannot break the document layout.
*   **Usage:** Embedded as an `<iframe>` within the `client` builder and loaded by the `server` printer service for PDF generation.
*   **Communication:** Receives data from `client` via `window.postMessage`.

#### **3. `server`** (NestJS)
*   **Role:** API gateway, authentication, database access, PDF generation, and AI-powered content generation.
*   **Database:** PostgreSQL via `Prisma ORM`.
*   **Storage:** S3-compatible storage (MinIO/AWS S3) for images and PDF artifacts.
*   **Auth:** `Passport.js` (Local, GitHub, Google, OpenID) using Cookie-based JWTs. Also supports API Key authentication for the browser extension.
*   **Printing:** Uses `Puppeteer` (headless Chrome) via `browserless` to generate PDFs.

#### **4. `extension`** (React + Vite + CRXJS)
*   **Role:** "Reactive Resume Copilot" browser extension for Chrome (Manifest V3).
*   **Key Features:**
  *   **Context-Aware Generation:** Scrapes job descriptions from any webpage to generate tailored resumes.
  *   **Universal Autofill:** Fills job application forms using data from the user's Information Bank.
*   **UI:** A Side Panel UI that communicates with the `server` via API Key.

### 2.3. Libraries (`libs/`)

*   **`dto`**: NestJS DTOs powered by `nestjs-zod`. Shared between client and server for API contract type safety.
*   **`schema`**: Zod definitions for the core `ResumeData` and `InformationData` structures. This is the "source of truth".
*   **`ui`**: Reusable UI components (Shadcn-like) built on Radix UI and Tailwind.
*   **`hooks`**: Shared React hooks (e.g., `useDebounce`, `useBreakpoint`).
*   **`utils`**: Shared utility functions (Date formatting, String manipulation).
*   **`parser`**: Logic for importing data from external sources (LinkedIn, JSON Resume).
*   **`autofill`**: Heuristic engine for the browser extension to intelligently fill web forms.

---

## 3. Core Workflows

### 3.1. Client-Artboard Communication (Split-Brain)
1.  User edits a resume or cover letter in `client`.
2.  `client` updates `useResumeStore` or `useCoverLetterStore` (debounced).
3.  The relevant page (`BuilderPage` or `CoverLetterEditorPage`) listens to store changes.
4.  `postMessage` sends `{ type: 'SET_RESUME', payload: ResumeData }` or `{ type: 'SET_COVER_LETTER', payload: CoverLetterDto }` to the `artboard` iframe.
5.  `artboard` receives the message, updates its local store, and re-renders the selected Template or cover letter content.

### 3.2. PDF Printing
1.  Client requests a print URL (`/resume/print/:id` or `/cover-letter/print/:id`).
2.  Server (`PrinterService`) launches Headless Chrome.
3.  Chrome navigates to the internal **Artboard** URL (`/artboard/preview` or `/artboard/cover-letter`).
4.  Server injects the `ResumeData` or `CoverLetterDto` directly into the browser's `localStorage`.
5.  Chrome waits for fonts and assets to load, then executes `page.pdf()`.
6.  Server uploads the resulting PDF buffer to S3/MinIO and returns the URL to the client.

### 3.3. Browser Extension Workflow
1.  **Auth:** User generates an API Key in the `client` dashboard and saves it in the `extension`'s Side Panel.
2.  **Context-Aware Generation:**
  *   User navigates to a job posting and clicks "Analyze Job Page" in the Side Panel.
  *   The `content` script uses `@mozilla/readability` to extract the job description and sends it to the Side Panel UI.
  *   User clicks "Generate Resume". The Side Panel calls the `server` endpoint (`/api/extension/generate`).
  *   The `server` (`ExtensionService`) fetches the user's **Information Bank**, combines it with the job description, and calls the `OpenAIService` to generate a new `ResumeData` object.
  *   The new resume is saved, printed to PDF, and the PDF/preview URLs are returned to the extension.
3.  **Autofill:**
  *   User navigates to a job application form and clicks "Autofill This Page".
  *   The `content` script fetches the user's **Information Bank** from the server.
  *   The `autofill` library runs locally in the content script, scoring form fields against the user's data and filling the best matches.

### 3.4. AI Integration (Multi-Provider)
*   **Configuration:** Users configure their AI provider (OpenAI, Azure, Gemini, Ollama) and API key in the `client` settings. This is stored securely in the `Secrets` table on the server.
*   **Execution:** When an AI feature is triggered (e.g., "Generate Resume"), the request is sent to the `server`.
*   **Service Logic:** The `OpenAIService` on the server reads the user's stored configuration, initializes the correct SDK (e.g., `OpenAI`), and makes the request to the third-party AI provider. The client never directly communicates with the AI provider.

---

## 4. Data Structures & State Management

### 4.1. Core Data Objects
*   **`InformationData` (`libs/schema/src/information/index.ts`):** The central source of truth for a user's professional life. Contains `basics`, `sections` (like experience, education), and `custom` sections. This is edited in the "Information Bank" section of the dashboard.
*   **`ResumeData` (`libs/schema/src/index.ts`):** A self-contained snapshot of a resume. It has the same structure as `InformationData` but also includes `metadata` for styling, layout, and template selection. It is the object used for rendering and printing.

### 4.2. Database Schema (Prisma)
Located at `tools/prisma/schema.prisma`.
*   **`User`**: Identity.
*   **`Resume`**: Stores the JSON blob of `data` (`ResumeData`), `visibility`, `slug`, and `locked` status.
*   **`CoverLetter`**: Stores `title`, `slug`, and HTML `content`.
*   **`Information`**: Stores the JSON blob of `data` (`InformationData`), linked 1:1 to a User.
*   **`ApiKey`**: Stores hashed API keys for programmatic access (e.g., browser extension).
*   **`Secrets`**: Sensitive auth data (password hash, 2FA secret) and AI provider configurations (`aiProvider`, `aiApiKey`, `aiBaseUrl`, etc.) linked 1:1 to User.

### 4.3. Client State (Zustand)
*   **`useResumeStore` (`apps/client/src/stores/resume.ts`):** Manages the state of a single resume being edited. Includes temporal (undo/redo) middleware.
*   **`useCoverLetterStore` (`apps/client/src/stores/cover-letter.ts`):** Manages the state of a single cover letter being edited.
*   **`useInformationStore` (`apps/client/src/stores/information.ts`):** Manages the Information Bank data.
*   **`useOpenAiStore` (`apps/client/src/stores/openai.ts`):** Caches the user's AI settings on the client for use in UI and for sending generation requests. The API key itself is stored securely on the server.

---

## 5. Developer How-To Guides

### 5.1. How to Add a New Resume Section
1.  **Schema:** Update `libs/schema/src/sections/index.ts` to include the new section schema and default values.
2.  **DTO:** Changes should propagate automatically. If not, run `nx build dto`.
3.  **Client (UI):**
*   Add a dialog form in `apps/client/src/pages/builder/sidebars/left/dialogs/`.
*   Register the dialog in `apps/client/src/providers/dialog.tsx`.
*   Add the section icon/trigger in `apps/client/src/pages/builder/sidebars/left/index.tsx`.
4.  **Artboard (Template):** Update specific templates in `apps/artboard/src/templates/` to render the new section.

### 5.2. How to Create a New Template
1.  **Create File:** Add `<TemplateName>.tsx` in `apps/artboard/src/templates/`.
2.  **Implement:** The component should accept `columns` (layout) and `isFirstPage` props. Use `useArtboardStore` to access resume data.
3.  **Register:**
*   Add to `getTemplate` switch case in `apps/artboard/src/templates/index.tsx`.
*   Add name to `templatesList` in `libs/utils/src/namespaces/template.ts`.
4.  **Assets:**
*   Add a sample JPG preview to `apps/client/public/templates/jpg/<name>.jpg`.
*   Add a sample PDF to `apps/client/public/templates/pdf/<name>.pdf`.

### 5.3. How to Work with the Browser Extension
1.  **Location:** All extension code resides in `apps/extension`.
2.  **Key Files:**
  *   `manifest.json`: Defines permissions, scripts, and the side panel.
  *   `src/background/index.ts`: Service worker for background tasks (minimal in V3).
  *   `src/content/index.ts`: Injected into web pages to read DOM (for analysis) and write to it (for autofill).
  *   `src/App.tsx`: The main React component for the Side Panel UI.
3.  **Local Development:**
  *   Run `pnpm dev`.
  *   In Chrome, go to `chrome://extensions`, enable "Developer mode".
  *   Click "Load unpacked" and select the `dist/apps/extension` directory.
  *   The extension will hot-reload on changes.

### 5.4. How to Debug PDF Printing
1.  **Check Logs:** Run `docker compose logs server` and look for `[Browser Console]` messages or errors.
2.  **Network Connectivity:** Ensure the `server` container can reach the `artboard` container. In development, the `PrinterService` rewrites `localhost` URLs to `host.docker.internal` to bridge this gap.
3.  **Timeouts:** If printing times out, check if the artboard is trying to load external fonts or images that might be blocked or slow inside the Docker network.

---

## 6. Directory Structure Reference

```text
.
├── apps/
│   ├── artboard/       # Isolated renderer for resumes & cover letters.
│   ├── client/         # Main app: Dashboard, Builder, Settings.
│   │   ├── src/pages/builder/
│   │   ├── src/pages/dashboard/
│   │   └── src/stores/
│   ├── extension/      # Browser Extension (Copilot).
│   │   ├── src/content/ # DOM interaction script.
│   │   └── src/App.tsx   # Side Panel UI.
│   └── server/         # API (NestJS).
│       ├── src/auth/
│       ├── src/printer/
│       ├── src/resume/
│       ├── src/cover-letter/
│       ├── src/information/
│       └── src/extension/
├── libs/
│   ├── autofill/       # Heuristic engine for form filling.
│   ├── dto/            # Shared Data Transfer Objects (API contracts).
│   ├── schema/         # Zod definitions for ResumeData & InformationData.
│   ├── ui/             # Reusable UI Kit.
│   ├── hooks/          # Shared React hooks.
│   └── utils/          # Shared utilities.
└── tools/
    └── prisma/         # Database schema and migrations.
```

---

## 7. Common Pitfalls & Solutions

1.  **"Hydration Mismatch"**:
*   **Cause:** Rendering a Date object, Random ID, or time-sensitive data on the server differently than on the client.
*   **Fix:** Use `useEffect` to render these on the client-side only, or use specific formatting utilities in `libs/utils` that ensure consistency.

2.  **"Iframe not updating"**:
*   **Cause:** `postMessage` origin mismatch or serialization error.
*   **Fix:** Check `apps/artboard/src/providers/index.tsx` message listener. Ensure strict origin checks match the current environment.

3.  **"Images not loading in PDF"**:
*   **Cause:** CORS issues in Headless Chrome or the container cannot resolve the image URL.
*   **Fix:** Ensure MinIO/S3 bucket has correct public read policies. The `PrinterService` accesses images via their public URL.

---

## 8. Useful Commands

*   **`pnpm dev`**: Start all applications simultaneously (Client: 5173, Server: 3000, Artboard: 6173).
*   **`pnpm build`**: Build all apps and libs.
*   **`pnpm lint`**: Lint all projects.
*   **`pnpm prisma:generate`**: Regenerate the Prisma client after schema changes.
*   **`nx build dto`**: Manually rebuild DTOs if changes aren't reflecting in the client immediately.
