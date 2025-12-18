# 📋 Implementation Plan: Information Bank Refactor to Native Sections

## 1. Executive Summary

**Goal:** Refactor the Information Bank page to use the proper `sections` schema (experience, education, profiles, certifications, etc.) from `InformationData` instead of relying on the hacky `custom: []` array.

**Why:**
- Aligns with the Resume Builder's architecture and data model
- Improves AI resume/cover letter generation quality (structured data is better for LLMs)
- Enables proper autofill expansion for job application forms
- Maximizes code reuse between Resume Builder and Information Bank

**Key Decisions:**
1. Keep `custom: []` but deprecate its primary use; provide a migration guide
2. Create shared store-agnostic components to maximize code reuse
3. Expand autofill library in a follow-up PR

---

## 2. Current State Analysis

### 2.1 Problem

The Information Bank currently only properly uses:
- `basics` - User's basic info (name, email, phone, etc.)
- `sections.summary` - Professional summary

All other data (work experience, education, certifications, profiles, etc.) is stored in a flat `custom: []` array with just `{ id, name, content }` structure, losing all the rich schema benefits.

### 2.2 Affected Files

| File | Current Role | Impact |
|------|--------------|--------|
| `libs/schema/src/information/index.ts` | Defines `InformationData` | Schema already correct, no changes needed |
| `apps/client/src/stores/information.ts` | State management | Needs new CRUD actions |
| `apps/client/src/pages/dashboard/information/page.tsx` | Main page | Needs section components |
| `apps/client/src/pages/dashboard/information/sections/` | Section UI | Needs new section components |
| `apps/client/src/providers/dialog.tsx` | Dialog registry | Needs Information Bank dialogs |
| `apps/client/src/stores/dialog.ts` | Dialog state | May need prefixed dialog names |
| `libs/autofill/src/lib/autofill.ts` | Form autofill | Future expansion (separate PR) |

---

## 3. Implementation Tasks

### Phase 1: Shared Infrastructure (Foundation)

#### 3.1 Create Store-Agnostic Section Dialog Base
> Extract and generalize the `SectionDialog` component to work with any store.

- [x] Create `/apps/client/src/components/sections/section-dialog-base.tsx`
  - Accept `setValue`, `getSection`, and `dialogPrefix` as props
  - Extract common dialog logic (create/update/delete/duplicate modes)
  - Support both Resume Builder and Information Bank stores

- [x] Create `/apps/client/src/components/sections/section-list-item.tsx`
  - Copy and adapt from `apps/client/src/pages/builder/sidebars/left/sections/shared/section-list-item.tsx`
  - Make it reusable (already mostly store-agnostic)

- [x] Create `/apps/client/src/components/sections/section-base.tsx`
  - Accept `setValue`, `section`, `sectionId`, `dialogPrefix`, and `title/description` functions
  - Include drag-and-drop reordering
  - Include create/update/delete triggers

- [x] Create `/apps/client/src/components/sections/index.ts`
  - Export all shared section components

#### 3.2 Update Dialog Store for Prefixed Dialogs
> Support Information Bank dialogs without conflicting with Resume Builder dialogs.

- [x] Update `/apps/client/src/stores/dialog.ts`
  - Add `info-` prefixed dialog names to `DialogName` type
  - Example: `"info-experience" | "info-education" | "info-profiles"` etc.

---

### Phase 2: Information Store Enhancements

#### 3.3 Add Section Item CRUD Actions
> Add generic actions for managing section items in the Information Bank.

- [x] Update `/apps/client/src/stores/information.ts`
  - Add `addItem(sectionId: string, item: SectionItem)` action
  - Add `updateItem(sectionId: string, itemId: string, item: SectionItem)` action
  - Add `removeItem(sectionId: string, itemId: string)` action
  - Add `reorderItems(sectionId: string, items: SectionItem[])` action
  - Keep `addCustomSection`/`removeCustomSection` for backward compatibility (mark as deprecated)

---

### Phase 3: Information Bank Dialogs

#### 3.4 Create Dialog Forms for Each Section
> Create thin wrapper dialogs that compose the shared base with section-specific forms.

- [x] Create `/apps/client/src/pages/dashboard/information/dialogs/` directory

- [x] Create `experience.tsx` dialog
  - Use `experienceSchema` and `defaultExperience` from `@reactive-resume/schema`
  - Wire to `useInformationStore` via shared `SectionDialogBase`

- [x] Create `education.tsx` dialog
  - Use `educationSchema` and `defaultEducation`

- [x] Create `profiles.tsx` dialog
  - Use `profileSchema` and `defaultProfile`

- [x] Create `skills.tsx` dialog
  - Use `skillSchema` and `defaultSkill`

- [x] Create `languages.tsx` dialog
  - Use `languageSchema` and `defaultLanguage`

- [x] Create `certifications.tsx` dialog
  - Use `certificationSchema` and `defaultCertification`

- [x] Create `awards.tsx` dialog
  - Use `awardSchema` and `defaultAward`

- [x] Create `projects.tsx` dialog
  - Use `projectSchema` and `defaultProject`

- [x] Create `publications.tsx` dialog
  - Use `publicationSchema` and `defaultPublication`

- [x] Create `volunteer.tsx` dialog
  - Use `volunteerSchema` and `defaultVolunteer`

- [x] Create `interests.tsx` dialog
  - Use `interestSchema` and `defaultInterest`

- [x] Create `references.tsx` dialog
  - Use `referenceSchema` and `defaultReference`

- [x] Create `index.ts` to export all dialogs

---

### Phase 4: Information Bank Page UI

#### 3.5 Create Section Components for Information Page
> Add section list components for each section type.

- [x] Create `/apps/client/src/pages/dashboard/information/sections/profiles.tsx`
  - Use shared `SectionBase` with `info-profiles` dialog prefix
  - Display network name as title, username as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/experience.tsx`
  - Display company as title, position as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/education.tsx`
  - Display institution as title, area as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/skills.tsx`
  - Display skill name as title, keyword count as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/languages.tsx`
  - Display language name as title, fluency as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/certifications.tsx`
  - Display certification name as title, issuer as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/awards.tsx`
  - Display award title as title, awarder as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/projects.tsx`
  - Display project name as title, description preview

- [x] Create `/apps/client/src/pages/dashboard/information/sections/publications.tsx`
  - Display publication name as title, publisher as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/volunteer.tsx`
  - Display organization as title, position as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/interests.tsx`
  - Display interest name as title, keyword count as description

- [x] Create `/apps/client/src/pages/dashboard/information/sections/references.tsx`
  - Display reference name as title, relationship as description

#### 3.6 Update Information Page Layout
> Wire up all new sections in the main page.

- [x] Update `/apps/client/src/pages/dashboard/information/page.tsx`
  - Import all new section components
  - Add sections in logical order: Basics → Summary → Profiles → Experience → Education → Skills → Languages → Certifications → Awards → Projects → Publications → Volunteer → Interests → References
  - Add separators between sections
  - Move `CustomSection` to a collapsible "Legacy Custom Sections" accordion at the bottom
  - Add deprecation notice for custom sections

---

### Phase 5: Dialog Provider Integration

#### 3.7 Register Information Bank Dialogs
> Add Information Bank dialogs to the global dialog provider.

- [x] Update `/apps/client/src/providers/dialog.tsx`
  - Import all Information Bank dialogs from `pages/dashboard/information/dialogs/`
  - Add `isInformationLoaded` condition (similar to `isResumeLoaded`)
  - Render Information Bank dialogs when on the Information Bank page
  - Use route-based or store-based detection for `isInformationLoaded`

---

### Phase 6: Refactor Resume Builder to Use Shared Components

#### 3.8 Migrate Resume Builder to Shared Components
> Update Resume Builder to use the new shared components for consistency.

- [ ] Update Resume Builder's `SectionDialog` to use `SectionDialogBase`
  - Pass `useResumeStore.setValue` and resume-specific getters
  - Ensure backward compatibility

- [ ] Update Resume Builder's `SectionBase` to use shared component
  - Or keep as-is if migration is too risky; can be done in follow-up

---

### Phase 7: Documentation & Cleanup

#### 3.9 Create Migration Guide
> Help existing users understand the changes.

- [ ] Create `/docs/information-bank-migration.md`
  - Explain what changed and why
  - Document that `custom: []` is now deprecated for structured data
  - Provide guidance on how to manually migrate old custom entries to proper sections
  - Include screenshots if helpful

#### 3.10 Update Code Comments
> Mark deprecated code paths clearly.

- [ ] Add `@deprecated` JSDoc comments to `addCustomSection` and `removeCustomSection` in information store
- [ ] Update comment in `libs/schema/src/information/index.ts` line 27 to reflect deprecation status

---

## 4. File Structure (After Implementation)

```
apps/client/src/
├── components/
│   └── sections/                          # NEW: Shared section components
│       ├── index.ts
│       ├── section-dialog-base.tsx
│       ├── section-base.tsx
│       └── section-list-item.tsx
├── pages/
│   ├── builder/
│   │   └── sidebars/left/
│   │       ├── dialogs/                   # Existing (may use shared base)
│   │       └── sections/shared/           # Existing (may use shared base)
│   └── dashboard/
│       └── information/
│           ├── page.tsx                   # Updated
│           ├── dialogs/                   # NEW: Information Bank dialogs
│           │   ├── index.ts
│           │   ├── experience.tsx
│           │   ├── education.tsx
│           │   ├── profiles.tsx
│           │   ├── skills.tsx
│           │   ├── languages.tsx
│           │   ├── certifications.tsx
│           │   ├── awards.tsx
│           │   ├── projects.tsx
│           │   ├── publications.tsx
│           │   ├── volunteer.tsx
│           │   ├── interests.tsx
│           │   └── references.tsx
│           └── sections/                  # Updated + NEW
│               ├── basics.tsx             # Existing
│               ├── summary.tsx            # Existing
│               ├── custom-section.tsx     # Existing (deprecated)
│               ├── profiles.tsx           # NEW
│               ├── experience.tsx         # NEW
│               ├── education.tsx          # NEW
│               ├── skills.tsx             # NEW
│               ├── languages.tsx          # NEW
│               ├── certifications.tsx     # NEW
│               ├── awards.tsx             # NEW
│               ├── projects.tsx           # NEW
│               ├── publications.tsx       # NEW
│               ├── volunteer.tsx          # NEW
│               ├── interests.tsx          # NEW
│               └── references.tsx         # NEW
├── providers/
│   └── dialog.tsx                         # Updated
└── stores/
    ├── dialog.ts                          # Updated
    └── information.ts                     # Updated
```

---

## 5. Testing Checklist

### 5.1 Manual Testing
- [ ] Create new items in each section (Experience, Education, etc.)
- [ ] Edit existing items in each section
- [ ] Delete items from each section
- [ ] Drag-and-drop reorder items within sections
- [ ] Verify auto-save indicator works correctly
- [ ] Test page refresh preserves all data
- [ ] Verify legacy custom sections still display and work
- [ ] Test AI resume generation uses new structured data

### 5.2 Edge Cases
- [ ] Empty sections display "Add new item" button
- [ ] Very long lists scroll correctly
- [ ] Mobile responsive layout works
- [ ] Dialog keyboard navigation works (Tab, Enter, Escape)

---

## 6. Future Enhancements (Out of Scope)

These items are intentionally deferred:

1. **Autofill Library Expansion** - Expand `libs/autofill/` to extract more fields from `sections` (e.g., current job from `experience.items[0]`)

2. **Import from Resume** - Button to import sections from an existing resume into the Information Bank

3. **Bulk Operations** - Multi-select and bulk delete/visibility toggle

4. **Section Visibility** - Toggle visibility of entire sections (like Resume Builder)

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing user data | Low | High | `custom: []` preserved, no schema migration needed |
| Dialog name conflicts | Low | Medium | Use `info-` prefix for Information Bank dialogs |
| Performance with large datasets | Low | Medium | Virtualization can be added later if needed |
| Resume Builder regression | Medium | High | Careful refactoring, test thoroughly |

---

## 8. Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Shared Infrastructure | 4-6 hours | None |
| Phase 2: Information Store | 1-2 hours | Phase 1 |
| Phase 3: Dialogs | 3-4 hours | Phase 1, 2 |
| Phase 4: Page UI | 3-4 hours | Phase 1, 2, 3 |
| Phase 5: Dialog Provider | 1 hour | Phase 3, 4 |
| Phase 6: Resume Builder Migration | 2-3 hours | Phase 1 |
| Phase 7: Documentation | 1-2 hours | All |

**Total Estimated Effort: 15-22 hours**

---

## 9. Implementation Order

Recommended order to minimize conflicts and enable incremental testing:

1. **Phase 1** → Foundation must be solid first
2. **Phase 2** → Store actions needed before UI
3. **Phase 3** → Dialogs needed before sections can create items
4. **Phase 5** → Register dialogs before they can be opened
5. **Phase 4** → Finally wire up the page UI
6. **Phase 6** → Optional, can be done after initial release
7. **Phase 7** → Documentation after implementation is stable

