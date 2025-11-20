import type { InformationDto } from "@reactive-resume/dto";
import { defaultInformation } from "@reactive-resume/schema";
import _set from "lodash.set";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { debouncedUpdateInformation } from "../services/information";

type InformationStore = {
  information: InformationDto;

  // Actions
  setInformation: (information: InformationDto) => void;
  setValue: (path: string, value: unknown) => void;
};

export const useInformationStore = create<InformationStore>()(
  immer((set) => ({
    information: {
      data: defaultInformation,
    } as InformationDto,
    setInformation: (information) => {
      set((state) => {
        state.information = information;
      });
    },
    setValue: (path, value) => {
      set((state) => {
        // Update the state
        state.information.data = _set(state.information.data, path, value);

        // Debounce the update to the server
        void debouncedUpdateInformation(JSON.parse(JSON.stringify(state.information.data)));
      });
    },
  })),
);
