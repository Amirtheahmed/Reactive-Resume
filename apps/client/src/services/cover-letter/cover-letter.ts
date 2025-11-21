// apps/client/src/services/cover-letter/cover-letter.ts
import type { CoverLetterDto } from "@reactive-resume/dto";
import { useQuery } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";

export const fetchCoverLetter = async (id: string) => {
  const response = await axios.get<CoverLetterDto>(`/cover-letter/${id}`);
  return response.data;
};

export const useCoverLetter = (id: string) => {
  const {
    error,
    isPending: loading,
    data: coverLetter,
  } = useQuery({
    queryKey: ["cover-letter", id],
    queryFn: () => fetchCoverLetter(id),
  });

  return { coverLetter, loading, error };
};
