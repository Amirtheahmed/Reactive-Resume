// apps/client/src/pages/dashboard/cover-letters/_layouts/list/index.tsx
import { sortByDate } from "@reactive-resume/utils";
import { AnimatePresence, motion } from "framer-motion";

import { useCoverLetters } from "@/client/services/cover-letter";

import { BaseListItem } from "./_components/base-item";
import { CoverLetterListItem } from "./_components/cover-letter-item";
import { CreateCoverLetterListItem } from "./_components/create-item";
import { GenerateCoverLetterListItem } from "./_components/generate-item";

export const ListView = () => {
  const { coverLetters, loading } = useCoverLetters();

  return (
    <div className="grid gap-y-2">
      <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }}>
        <CreateCoverLetterListItem />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
      >
        <GenerateCoverLetterListItem />
      </motion.div>

      {loading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="duration-300 animate-in fade-in"
            style={{ animationFillMode: "backwards", animationDelay: `${i * 300}ms` }}
          >
            <BaseListItem className="bg-secondary/40" />
          </div>
        ))}

      {coverLetters && (
        <AnimatePresence>
          {coverLetters
            .sort((a, b) => sortByDate(a, b, "updatedAt"))
            .map((coverLetter, index) => (
              <motion.div
                key={coverLetter.id}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0, transition: { delay: (index + 2) * 0.1 } }}
                exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.5 } }}
              >
                <CoverLetterListItem coverLetter={coverLetter} />
              </motion.div>
            ))}
        </AnimatePresence>
      )}
    </div>
  );
};
