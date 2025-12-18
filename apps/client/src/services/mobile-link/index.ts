// apps/client/src/services/mobile-link/index.ts
import { useMutation, useQuery } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";
import { queryClient } from "@/client/libs/query-client";

type MobileLinkDevice = {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  provider: string;
  lastUsed: string | null;
  createdAt: string;
};

type MobileLinkStatus = {
  isLinked: boolean;
  devices: MobileLinkDevice[];
};

export const fetchMobileLinkStatus = async (): Promise<MobileLinkStatus> => {
  const response = await axios.get<MobileLinkStatus>("/auth/mobile/status");
  return response.data;
};

export const fetchMobileDevices = async (): Promise<MobileLinkStatus> => {
  const response = await axios.get<MobileLinkStatus>("/auth/mobile/devices");
  return response.data;
};

export const deleteMobileDevice = async (id: string): Promise<void> => {
  await axios.delete(`/auth/mobile/devices/${id}`);
};

export const revokeAllMobileLinks = async (): Promise<{ message: string }> => {
  const response = await axios.post<{ message: string }>("/auth/mobile/revoke");
  return response.data;
};

export const useMobileLinkStatus = () => {
  const {
    error,
    isPending: loading,
    data,
  } = useQuery({
    queryKey: ["mobile-link-status"],
    queryFn: fetchMobileLinkStatus,
  });

  return { status: data, loading, error };
};

export const useMobileDevices = () => {
  const {
    error,
    isPending: loading,
    data,
  } = useQuery({
    queryKey: ["mobile-devices"],
    queryFn: fetchMobileDevices,
  });

  return { devices: data?.devices ?? [], isLinked: data?.isLinked ?? false, loading, error };
};

export const useDeleteMobileDevice = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: deleteDevice,
  } = useMutation({
    mutationFn: deleteMobileDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobile-devices"] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-link-status"] });
    },
  });

  return { deleteDevice, loading, error };
};

export const useRevokeAllMobileLinks = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: revokeAll,
  } = useMutation({
    mutationFn: revokeAllMobileLinks,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobile-devices"] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-link-status"] });
    },
  });

  return { revokeAll, loading, error };
};

