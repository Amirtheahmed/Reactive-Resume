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
*   **Role:** The main dashboard, builder interface, and landing page.
*   **Key Characteristics:** It **never** renders the resume directly. It acts as the controller.
*   **State Management:** `Zustand` (with `immer` for mutability and `zundo` for temporal undo/redo).
*   **Data Fetching:** `TanStack Query` (React Query) with `Axios`.
*   **Styling:** `Tailwind CSS` + `Radix UI` (via `libs/ui`).
*   **Routing:** `React Router v6`.

#### **2. `artboard`** (React + Vite)
*   **Role:** A lightweight, isolated renderer for the resume.
*   **Why?** To sandbox CSS. User-defined CSS or Template CSS cannot bleed into the UI, and UI CSS cannot break the resume layout.
*   **Usage:** Embedded as an `<iframe>` within the `client` builder and loaded by the `server` printer service for PDF generation.
*   **Communication:** Receives data from `client` via `window.postMessage`.

#### **3. `server`** (NestJS)
*   **Role:** API gateway, authentication, database access, and PDF generation.
*   **Database:** PostgreSQL via `Prisma ORM`.
*   **Storage:** S3-compatible storage (MinIO/AWS S3) for images and PDF artifacts.
*   **Auth:** `Passport.js` (Local, GitHub, Google, OpenID) using Cookie-based JWTs.
*   **Printing:** Uses `Puppeteer` (headless Chrome) via `browserless` to generate PDFs.

### 2.3. Libraries (`libs/`)

*   **`dto`**: NestJS DTOs powered by `nestjs-zod`. Shared between client and server for API contract type safety.
*   **`schema`**: Zod definitions for the core `ResumeData` structure. This is the "source of truth".
*   **`ui`**: Reusable UI components (Shadcn-like) built on Radix UI and Tailwind.
*   **`hooks`**: Shared React hooks (e.g., `useDebounce`, `useBreakpoint`).
*   **`utils`**: Shared utility functions (Date formatting, String manipulation).
*   **`parser`**: Logic for importing data from external sources (LinkedIn, JSON Resume).

---

## 3. Core Workflows

### 3.1. Client-Artboard Communication (Split-Brain)
1.  User edits form in `client`.
2.  `client` updates `useResumeStore` (debounced).
3.  `BuilderPage` (`apps/client/src/pages/builder/page.tsx`) listens to store changes.
4.  `postMessage` sends `{ type: 'SET_RESUME', payload: ResumeData }` to the `artboard` iframe.
5.  `artboard` receives the message, updates its local store, and re-renders the selected Template.

### 3.2. PDF Printing
1.  Client requests print URL (`/resume/print/:id`).
2.  Server (`PrinterService`) launches Headless Chrome (often via a separate `browserless` container).
3.  Chrome navigates to the internal **Artboard** URL (`http://artboard-url/preview`).
4.  Server injects the `ResumeData` directly into the browser's `localStorage`.
5.  Chrome waits for fonts and assets to load, then executes `page.pdf()`.
6.  Server uploads the resulting PDF buffer to S3/MinIO and returns the URL to the client.

### 3.3. Authentication
*   **Strategies:** Local (Email/Password), GitHub, Google, OpenID.
*   **Tokens:** Uses **Cookie-based JWTs**.
  *   `Authentication`: Access Token (short-lived).
  *   `Refresh`: Refresh Token (long-lived).
*   **2FA:** Handled via `otplib` and guards (`TwoFactorGuard`).

---

## 4. Data Structures & State Management

### 4.1. Core Resume Object (`ResumeData`)
Defined in `libs/schema/src/index.ts`.
```typescript
// Simplified View
{
  basics: { name, email, phone, picture, customFields, ... },
  sections: {
    summary: { visible, content, ... },
    experience: { id: "experience", items: [ ... ], columns: 1, visible: true },
    // ... other standard sections
    custom: {
       "my-custom-id": { name: "Pet Projects", items: [ ... ] }
    }
  },
  metadata: {
    template: "onyx",
    layout: [ [ ["summary", "experience"], ["skills"] ] ], // Pages -> Columns -> Sections
    css: { value: ".section { color: red; }", visible: true },
    theme: { primary: "#hex", background: "#hex", text: "#hex" },
    typography: { font: { family: "Roboto", subset: "latin", size: 14 }, lineHeight: 1.5 }
  }
}
```

### 4.2. Database Schema (Prisma)
Located at `tools/prisma/schema.prisma`.
*   **`User`**: Identity.
*   **`Resume`**: Stores the JSON blob of `data` (ResumeData), `visibility`, `slug`, and `locked` status.
*   **`Secrets`**: Sensitive auth data (password hash, 2FA secret, refresh token) linked 1:1 to User.

### 4.3. Client State (Zustand)
Located at `apps/client/src/stores/resume.ts`.
*   **Temporal Middleware (`zundo`)**: Handles Undo/Redo functionality. `temporal.getState().clear()` must be called on resume load.
*   **Immer Middleware**: Allows mutable syntax for immutable state updates.
*   **Debounce**: Updates to the backend are debounced (`debouncedUpdateResume`) to prevent API flooding.

---

## 5. Developer How-To Guides

### 5.1. How to Add a New Resume Section
1.  **Schema:** Update `libs/schema/src/sections/index.ts` to include the new section schema and default values.
2.  **DTO:** Run `nx build dto` to propagate changes (usually automatic in dev).
3.  **Client (Store):** Update `apps/client/src/stores/resume.ts` if specific logic is needed for adding/removing this section.
4.  **Client (UI):**
  *   Add a dialog form in `apps/client/src/pages/builder/sidebars/left/dialogs/`.
  *   Register the dialog in `apps/client/src/providers/dialog.tsx`.
  *   Add the section icon/trigger in `apps/client/src/pages/builder/sidebars/left/index.tsx`.
5.  **Artboard (Template):** Update specific templates in `apps/artboard/src/templates/` to render the new section.

### 5.2. How to Create a New Template
1.  **Create File:** Add `<TemplateName>.tsx` in `apps/artboard/src/templates/`.
2.  **Implement:** Component should accept `columns` (layout) and `isFirstPage` props.
  *   Use the `useArtboardStore` to access data.
  *   Iterate over `columns` to render Main vs Sidebar layouts.
3.  **Register:**
  *   Add to `getTemplate` switch case in `apps/artboard/src/templates/index.tsx`.
  *   Add name to `templatesList` in `libs/utils/src/namespaces/template.ts`.
4.  **Assets:**
  *   Add a sample JPG preview to `apps/client/public/templates/jpg/<name>.jpg`.
  *   Add a sample PDF to `apps/client/public/templates/pdf/<name>.pdf`.

### 5.3. How to Add a New Feature Flag
1.  **Backend Config:** Update `apps/server/src/config/schema.ts` to validate the environment variable (e.g., `DISABLE_FEATURE_X`).
2.  **Service:** Update `apps/server/src/feature/feature.service.ts` to expose the flag logic.
3.  **DTO:** Update the Feature DTO in `libs/dto/src/feature/index.ts` to ensure type safety across the boundary.
4.  **Frontend:** Use the `useFeatureFlags()` hook in `apps/client` to conditionally render UI elements.

### 5.4. How to Debug PDF Printing
PDF generation happens server-side via Puppeteer and can be tricky to debug.
1.  **Check Logs:** Run `docker compose logs server` and look for "Chrome took Xms to print".
2.  **Network Connectivity:** Ensure the Docker container for `server` can reach the `artboard`. In development, logic in `apps/server/src/printer/printer.service.ts` rewrites URLs to use `host.docker.internal`.
3.  **Timeouts:** If printing times out, check if the artboard is trying to load external fonts or images that might be blocked or slow.

### 5.5. How to Modify the API
1.  **Controller:** Create or update `apps/server/src/<module>/<module>.controller.ts`.
2.  **Service:** Implement business logic in `apps/server/src/<module>/<module>.service.ts`.
3.  **DTO:** Define input/output validation schemas in `libs/dto`. **Always** start here to ensure the contract is strictly typed.
4.  **Client Service:** Add a service function in `apps/client/src/services/<module>/` using Axios.

---

## 6. Directory Structure Reference

```text
.
├── apps/
│   ├── artboard/       # The renderer (Vite + React). Isolated environment.
│   ├── client/         # The main app/controller (Vite + React).
│   │   ├── src/pages/builder/  # Core builder logic (Sidebars, Drag-Drop).
│   │   └── src/stores/         # Global state (Resume, Auth, Dialogs).
│   └── server/         # The API (NestJS).
│       ├── src/auth/   # Authentication strategies.
│       ├── src/printer/# Puppeteer/Chrome logic.
│       └── src/resume/ # CRUD operations.
├── libs/
│   ├── dto/            # Shared Data Transfer Objects (NestJS/Zod).
│   ├── schema/         # Zod definitions for Resume Data.
│   ├── ui/             # Reusable UI Kit (Shadcn-like).
│   ├── hooks/          # Shared React hooks.
│   └── utils/          # Shared utilities (Date, String, Layout).
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
  *   **Fix:** Check `apps/artboard/src/providers/index.tsx` message listener. Ensure strict origin checks match the current environment (localhost vs production URL).

3.  **"Images not loading in PDF"**:
  *   **Cause:** CORS issues in Headless Chrome or the container cannot resolve the image URL.
  *   **Fix:** Ensure MinIO/S3 bucket has correct public read policies. The Printer Service accesses images via their public URL.

---

## 8. Useful Commands

*   **`pnpm dev`**: Start all applications simultaneously (Client: 5173, Server: 3000, Artboard: 6173).
*   **`pnpm build`**: Build all apps and libs.
*   **`pnpm lint`**: Lint all projects.
*   **`pnpm prisma:generate`**: Regenerate the Prisma client after schema changes.
*   **`nx build dto`**: Manually rebuild DTOs if changes aren't reflecting in the client immediately.
