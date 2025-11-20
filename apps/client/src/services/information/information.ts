import type { InformationDto } from "@reactive-resume/dto";
import type { InformationData } from "@reactive-resume/schema";
import { axios } from "@/client/libs/axios";
import debounce from "lodash.debounce";

export const findInformation = async () => {
  const response = await axios.get<InformationDto>("/information");
  return response.data;
};

export const updateInformation = async (data: InformationData) => {
  const response = await axios.patch<InformationDto>("/information", { data });
  return response.data;
};

export const debouncedUpdateInformation = debounce(updateInformation, 1000);
