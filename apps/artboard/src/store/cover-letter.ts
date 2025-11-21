// Create apps/artboard/src/store/cover-letter.ts
import type { CoverLetterDto } from "@reactive-resume/dto";
import { create } from "zustand";

export type CoverLetterStore = {
  coverLetter: CoverLetterDto;
  setCoverLetter: (coverLetter: CoverLetterDto) => void;
};

export const useCoverLetterStore = create<CoverLetterStore>()((set) => ({
  coverLetter: {} as CoverLetterDto,
  setCoverLetter: (coverLetter) => {
    set({ coverLetter });
  },
}));
