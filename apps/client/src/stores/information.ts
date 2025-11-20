import type { InformationData } from "@reactive-resume/schema";
import { defaultInformation } from "@reactive-resume/schema";
import _set from "lodash.set";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { updateInformation } from "../services/information";

type InformationStore = {
  information: InformationData;

  // Actions
  setInformation: (information: InformationData) => void;
  setValue: (path: string, value: unknown) => void;
};

export const useInformationStore = create<InformationStore>()(
  immer((set) => ({
    information: defaultInformation,
    setInformation: (information) => {
      set((state) => {
        state.information = information;
      });
    },
    setValue: (path, value) => {
      set((state) => {
        state.information = _set(state.information, path, value);
        void updateInformation({ data: state.information });
      });
    },
  })),
);
