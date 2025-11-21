// apps/client/src/pages/dashboard/cover-letters/_layouts/grid/index.tsx
import { sortByDate } from "@reactive-resume/utils";
import { AnimatePresence, motion } from "framer-motion";

import { useCoverLetters } from "@/client/services/cover-letter";

import { BaseCard } from "./_components/base-card";
import { CoverLetterCard } from "./_components/cover-letter-card";
import { CreateCoverLetterCard } from "./_components/create-card";
import { GenerateCoverLetterCard } from "./_components/generate-card";

export const GridView = () => {
  const { coverLetters, loading } = useCoverLetters();

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}>
        <CreateCoverLetterCard />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0, transition: { delay: 0.1 } }}
      >
        <GenerateCoverLetterCard />
      </motion.div>

      {loading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="duration-300 animate-in fade-in"
            style={{ animationFillMode: "backwards", animationDelay: `${i * 300}ms` }}
          >
            <BaseCard />
          </div>
        ))}

      {coverLetters && (
        <AnimatePresence>
          {coverLetters
            .sort((a, b) => sortByDate(a, b, "updatedAt"))
            .map((coverLetter, index) => (
              <motion.div
                key={coverLetter.id}
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0, transition: { delay: (index + 2) * 0.1 } }}
                exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.5 } }}
              >
                <CoverLetterCard coverLetter={coverLetter} />
              </motion.div>
            ))}
        </AnimatePresence>
      )}
    </div>
  );
};
