import { useMutation } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import { axios } from "@/client/libs/axios";

export const uploadChatAttachment = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.put<string, AxiosResponse<string>, FormData>(
    "/storage/chat",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return response.data;
};

export const useUploadChatAttachment = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: uploadChatAttachmentFn,
  } = useMutation({
    mutationFn: uploadChatAttachment,
  });

  return { uploadChatAttachment: uploadChatAttachmentFn, loading, error };
};
