import type { InformationDto } from "@reactive-resume/dto";
import type { InformationData } from "@reactive-resume/schema";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { axios } from "@/client/libs/axios";
import { useInformationStore } from "@/client/stores/information";

export const findInformation = async () => {
  const response = await axios.get<InformationDto>("/information");
  return response.data;
};

export const updateInformation = async (data: InformationData) => {
  const response = await axios.patch<InformationDto>("/information", { data });
  return response.data;
};

export const useInformation = () => {
  const setInformation = useInformationStore((state) => state.setInformation);

  const {
    data: information,
    isPending: loading,
    error,
  } = useQuery({
    queryKey: ["information"],
    queryFn: findInformation,
  });

  useEffect(() => {
    if (information) {
      setInformation(information);
    }
  }, [information, setInformation]);

  return { information, loading, error };
};
