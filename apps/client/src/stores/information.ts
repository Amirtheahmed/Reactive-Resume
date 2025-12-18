import { t } from "@lingui/macro";
import { createId } from "@paralleldrive/cuid2";
import type { InformationDto } from "@reactive-resume/dto";
import type { SectionItem, SectionWithItem } from "@reactive-resume/schema";
import { defaultInformation } from "@reactive-resume/schema";
import _debounce from "lodash.debounce";
import _get from "lodash.get";
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

  // Section Item CRUD Actions
  addItem: (sectionId: string, item: SectionItem) => void;
  updateItem: (sectionId: string, itemId: string, item: SectionItem) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  reorderItems: (sectionId: string, items: SectionItem[]) => void;

  /**
   * @deprecated Use structured sections instead. This method is kept for backward compatibility.
   */
  addCustomSection: () => void;
  /**
   * @deprecated Use structured sections instead. This method is kept for backward compatibility.
   */
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

      /**
       * Add a new item to a section
       * @param sectionId - The section ID (e.g., "experience", "education")
       * @param item - The item to add
       */
      addItem: (sectionId: string, item: SectionItem) => {
        set((state) => {
          const section = _get(state.information.data.sections, sectionId) as
            | SectionWithItem
            | undefined;
          if (!section || !("items" in section)) return;

          const newItem = { ...item, id: createId() };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (section.items as any[]).push(newItem);
          state.isSaving = true;
        });
        void debouncedSave();
      },

      /**
       * Update an existing item in a section
       * @param sectionId - The section ID (e.g., "experience", "education")
       * @param itemId - The ID of the item to update
       * @param item - The updated item data
       */
      updateItem: (sectionId: string, itemId: string, item: SectionItem) => {
        set((state) => {
          const section = _get(state.information.data.sections, sectionId) as
            | SectionWithItem
            | undefined;
          if (!section || !("items" in section)) return;

          const index = section.items.findIndex((i) => i.id === itemId);
          if (index === -1) return;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (section.items as any[])[index] = item;
          state.isSaving = true;
        });
        void debouncedSave();
      },

      /**
       * Remove an item from a section
       * @param sectionId - The section ID (e.g., "experience", "education")
       * @param itemId - The ID of the item to remove
       */
      removeItem: (sectionId: string, itemId: string) => {
        set((state) => {
          const section = _get(state.information.data.sections, sectionId) as
            | SectionWithItem
            | undefined;
          if (!section || !("items" in section)) return;

          const index = section.items.findIndex((i) => i.id === itemId);
          if (index === -1) return;

          section.items.splice(index, 1);
          state.isSaving = true;
        });
        void debouncedSave();
      },

      /**
       * Reorder items in a section (typically after drag-and-drop)
       * @param sectionId - The section ID (e.g., "experience", "education")
       * @param items - The reordered items array
       */
      reorderItems: (sectionId: string, items: SectionItem[]) => {
        set((state) => {
          const section = _get(state.information.data.sections, sectionId) as
            | SectionWithItem
            | undefined;
          if (!section || !("items" in section)) return;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (section.items as any[]) = items;
          state.isSaving = true;
        });
        void debouncedSave();
      },

      /**
       * @deprecated Use structured sections (experience, education, etc.) instead.
       * This method is kept for backward compatibility with legacy custom sections.
       */
      addCustomSection: () => {
        set((state) => {
          const id = createId();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!state.information.data.custom) {
            state.information.data.custom = [];
          }
          state.information.data.custom.push({
            id,
            name: t`Untitled Section`,
            content: "",
          });
          state.isSaving = true;
        });
        void debouncedSave();
      },

      /**
       * @deprecated Use structured sections (experience, education, etc.) instead.
       * This method is kept for backward compatibility with legacy custom sections.
       */
      removeCustomSection: (id) => {
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!state.information.data.custom) return;
          state.information.data.custom = state.information.data.custom.filter((s) => s.id !== id);
          state.isSaving = true;
        });
        void debouncedSave();
      },
    };
  }),
);
