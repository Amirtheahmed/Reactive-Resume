// apps/client/src/pages/dashboard/information/sections/profiles.tsx
import { t } from "@lingui/macro";
import type { Profile } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const ProfilesSection = () => {
  const { open } = useDialog<Profile>("info-profiles");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.profiles);

  return (
    <section id="profiles" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Profiles`}</h2>
        <p className="text-muted-foreground">
          {t`Your social media profiles and professional networks.`}
        </p>
      </header>

      <SectionBase<Profile>
        id="info-profiles"
        sectionKey="profiles"
        title={(item) => item.network}
        description={(item) => item.username}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

