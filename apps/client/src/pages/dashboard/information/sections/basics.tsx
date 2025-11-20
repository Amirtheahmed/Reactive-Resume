import { t } from "@lingui/macro";
import { basicsSchema } from "@reactive-resume/schema";
import { Input, Label } from "@reactive-resume/ui";

import { useInformationStore } from "@/client/stores/information";

export const BasicsSection = () => {
  const setValue = useInformationStore((state) => state.setValue);
  const basics = useInformationStore((state) => state.information.basics);

  return (
    <section id="basics" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Basics`}</h2>
        <p className="text-muted-foreground">
          {t`Primary information such as your name, email, phone, etc.`}
        </p>
      </header>

      <main className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-4 sm:col-span-2">
          <Label htmlFor="basics.name">{t`Full Name`}</Label>
          <Input
            id="basics.name"
            value={basics.name}
            hasError={!basicsSchema.pick({ name: true }).safeParse({ name: basics.name }).success}
            onChange={(event) => {
              setValue("basics.name", event.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="basics.headline">{t`Headline`}</Label>
          <Input
            id="basics.headline"
            value={basics.headline}
            onChange={(event) => {
              setValue("basics.headline", event.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="basics.email">{t`Email`}</Label>
          <Input
            id="basics.email"
            placeholder="john.doe@example.com"
            value={basics.email}
            hasError={
              !basicsSchema.pick({ email: true }).safeParse({ email: basics.email }).success
            }
            onChange={(event) => {
              setValue("basics.email", event.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="basics.url">{t`Website`}</Label>
          <Input
            id="basics.url"
            value={basics.url.href}
            placeholder="https://example.com"
            onChange={(event) => {
              setValue("basics.url.href", event.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="basics.phone">{t`Phone`}</Label>
          <Input
            id="basics.phone"
            placeholder="+1 (123) 4567 7890"
            value={basics.phone}
            onChange={(event) => {
              setValue("basics.phone", event.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="basics.location">{t`Location`}</Label>
          <Input
            id="basics.location"
            value={basics.location}
            onChange={(event) => {
              setValue("basics.location", event.target.value);
            }}
          />
        </div>
      </main>
    </section>
  );
};
