import type { ApiKeyDto, ApiKeyWithSecretDto, CreateApiKeyDto } from "@reactive-resume/dto";
import { useMutation, useQuery } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";
import { queryClient } from "@/client/libs/query-client";

export const fetchApiKeys = async () => {
  const response = await axios.get<ApiKeyDto[]>("/api-key");
  return response.data;
};

export const createApiKey = async (data: CreateApiKeyDto) => {
  const response = await axios.post<ApiKeyWithSecretDto>("/api-key", data);
  return response.data;
};

export const deleteApiKey = async (id: string) => {
  const response = await axios.delete<void>(`/api-key/${id}`);
  return response.data;
};

export const useApiKeys = () => {
  const {
    error,
    isPending: loading,
    data: apiKeys,
  } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  return { apiKeys, loading, error };
};

export const useCreateApiKey = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: createApiKeyFn,
  } = useMutation({
    mutationFn: createApiKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  return { createApiKey: createApiKeyFn, loading, error };
};

export const useDeleteApiKey = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: deleteApiKeyFn,
  } = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  return { deleteApiKey: deleteApiKeyFn, loading, error };
};
