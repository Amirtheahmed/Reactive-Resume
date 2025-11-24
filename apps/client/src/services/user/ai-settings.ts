import type { OpenAIConfigDto } from "@reactive-resume/dto";
import { useMutation, useQuery } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";
import { queryClient } from "@/client/libs/query-client";

// DTO for fetching settings (without the key)
export type AiSettingsDto = Omit<OpenAIConfigDto, "apiKey"> & {
  isApiKeySet: boolean;
};

// GET endpoint to fetch non-sensitive settings
export const fetchAiSettings = async () => {
  const response = await axios.get<AiSettingsDto>("/user/me/ai-settings");
  return response.data;
};

export const useAiSettings = () => {
  return useQuery({
    queryKey: ["ai-settings"],
    queryFn: fetchAiSettings,
    refetchOnMount: "always",
  });
};

// PATCH endpoint to update settings
export const updateAiSettings = async (data: OpenAIConfigDto) => {
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  const response = await axios.patch<void>("/user/me/ai-settings", data);
  return response.data;
};

export const useUpdateAiSettings = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: updateAiSettingsFn,
  } = useMutation({
    mutationFn: updateAiSettings,
    onSuccess: async () => {
      // Invalidate to refetch the settings and confirm the key is set
      await queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
  });

  return { updateAiSettings: updateAiSettingsFn, loading, error };
};
