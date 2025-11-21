// apps/client/src/stores/cover-letter.ts
import type { CoverLetterDto } from "@reactive-resume/dto";
import _debounce from "lodash.debounce";
import _set from "lodash.set";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { debouncedUpdateCoverLetter } from "../services/cover-letter";

type CoverLetterStore = {
  coverLetter: CoverLetterDto | null;
  isSaving: boolean;

  // Actions
  setCoverLetter: (coverLetter: CoverLetterDto) => void;
  setValue: (path: string, value: unknown) => void;
};

export const useCoverLetterStore = create<CoverLetterStore>()(
  immer((set, get) => {
    const debouncedSave = _debounce(async () => {
      const { coverLetter } = get();
      if (!coverLetter) return;

      try {
        await debouncedUpdateCoverLetter({
          id: coverLetter.id,
          title: coverLetter.title,
          slug: coverLetter.slug,
          content: coverLetter.content,
        });
        set((state) => {
          state.isSaving = false;
        });
      } catch {
        set((state) => {
          state.isSaving = false;
        });
      }
    }, 1000);

    return {
      coverLetter: null,
      isSaving: false,

      setCoverLetter: (coverLetter) => {
        set((state) => {
          state.coverLetter = coverLetter;
        });
      },

      setValue: (path, value) => {
        set((state) => {
          if (state.coverLetter) {
            state.coverLetter = _set(state.coverLetter, path, value);
            state.isSaving = true;
          }
        });
        void debouncedSave();
      },
    };
  }),
);
