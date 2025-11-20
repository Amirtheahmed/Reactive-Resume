import { createId } from "@paralleldrive/cuid2";
import type { InformationDto } from "@reactive-resume/dto";
import { defaultInformation } from "@reactive-resume/schema";
import _debounce from "lodash.debounce";
import _set from "lodash.set";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { updateInformation } from "../services/information";

type InformationStore = {
  information: InformationDto;
  isSaving: boolean;

  // Actions
  setInformation: (information: InformationDto) => void;
  setValue: (path: string, value: unknown) => void;
  addCustomSection: () => void;
  removeCustomSection: (id: string) => void;
};

export const useInformationStore = create<InformationStore>()(
  immer((set, get) => {
    // internal debounced save function
    const debouncedSave = _debounce(async () => {
      const { information } = get();
      try {
        await updateInformation(information.data);
        set((state) => {
          state.isSaving = false;
        });
      } catch {
        set((state) => {
          state.isSaving = false;
        });
      }
    }, 1000);

    return {
      information: {
        data: defaultInformation,
      } as InformationDto,
      isSaving: false,

      setInformation: (information) => {
        set((state) => {
          state.information = information;
        });
      },

      setValue: (path, value) => {
        set((state) => {
          state.information.data = _set(state.information.data, path, value);
          state.isSaving = true;
        });
        void debouncedSave();
      },

      addCustomSection: () => {
        set((state) => {
          const id = createId();
          if (!state.information.data.custom) {
            state.information.data.custom = [];
          }
          state.information.data.custom.push({
            id,
            name: "Untitled Section",
            content: "",
          });
          state.isSaving = true;
        });
        void debouncedSave();
      },

      removeCustomSection: (id) => {
        set((state) => {
          if (!state.information.data.custom) return;
          state.information.data.custom = state.information.data.custom.filter((s) => s.id !== id);
          state.isSaving = true;
        });
        void debouncedSave();
      },
    };
  }),
);
