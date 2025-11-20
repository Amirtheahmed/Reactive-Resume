import { InformationData } from "@reactive-resume/schema";
import { axios } from "@/client/libs/axios";

export const findInformation = async () => {
  const response = await axios.get<InformationData>("/information");
  return response.data;
};

export const updateInformation = async (data: { data: InformationData }) => {
  const response = await axios.patch<InformationData>("/information", data);
  return response.data;
};
