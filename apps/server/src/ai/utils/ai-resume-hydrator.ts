import { createId } from "@paralleldrive/cuid2";
import { defaultResumeData, defaultSection, type ResumeData } from "@reactive-resume/schema";

type AnyObject = Record<string, unknown>;

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function getBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function getObject(value: unknown): AnyObject {
  return typeof value === "object" && value !== null ? (value as AnyObject) : {};
}

function hydrateUrl(aiUrl: unknown): { label: string; href: string } {
  const url = getObject(aiUrl);
  return {
    label: getString(url.label),
    href: getString(url.href),
  };
}

function hydrateExperience(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    company: getString(item.company),
    position: getString(item.position),
    location: getString(item.location),
    date: getString(item.date),
    summary: getString(item.summary),
    url: hydrateUrl(item.url),
  }));
}

function hydrateEducation(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    institution: getString(item.institution),
    studyType: getString(item.studyType),
    area: getString(item.area),
    score: getString(item.score),
    date: getString(item.date),
    summary: getString(item.summary),
    url: hydrateUrl(item.url),
  }));
}

function hydrateSkills(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    name: getString(item.name),
    description: getString(item.description),
    level: Math.max(3, getNumber(item.level, 3)),
    keywords: getArray<string>(item.keywords).filter((k) => typeof k === "string"),
  }));
}

function hydrateProjects(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    name: getString(item.name),
    description: getString(item.description),
    date: getString(item.date),
    summary: getString(item.summary),
    keywords: getArray<string>(item.keywords).filter((k) => typeof k === "string"),
    url: hydrateUrl(item.url),
  }));
}

function hydrateCertifications(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    name: getString(item.name),
    issuer: getString(item.issuer),
    date: getString(item.date),
    summary: getString(item.summary),
    url: hydrateUrl(item.url),
  }));
}

function hydrateLanguages(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    name: getString(item.name),
    description: getString(item.description),
    level: getNumber(item.level, 3),
  }));
}

function hydrateAwards(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    title: getString(item.title),
    awarder: getString(item.awarder),
    date: getString(item.date),
    summary: getString(item.summary),
    url: hydrateUrl(item.url),
  }));
}

function hydrateVolunteer(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    organization: getString(item.organization),
    position: getString(item.position),
    location: getString(item.location),
    date: getString(item.date),
    summary: getString(item.summary),
    url: hydrateUrl(item.url),
  }));
}

function hydratePublications(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    name: getString(item.name),
    publisher: getString(item.publisher),
    date: getString(item.date),
    summary: getString(item.summary),
    url: hydrateUrl(item.url),
  }));
}

function hydrateReferences(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    name: getString(item.name),
    description: getString(item.description),
    summary: getString(item.summary),
    url: hydrateUrl(item.url),
  }));
}

function hydrateInterests(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    name: getString(item.name),
    keywords: getArray<string>(item.keywords).filter((k) => typeof k === "string"),
  }));
}

function hydrateProfiles(items: unknown) {
  return getArray<AnyObject>(items).map((item) => ({
    id: createId(),
    visible: getBoolean(item.visible),
    network: getString(item.network),
    username: getString(item.username),
    icon: getString(item.icon),
    url: hydrateUrl(item.url),
  }));
}

export function hydrateAIResumeToFull(aiData: unknown): ResumeData {
  const data = getObject(aiData);
  const basics = getObject(data.basics);
  const sections = getObject(data.sections);
  const metadata = getObject(data.metadata);

  const base = structuredClone(defaultResumeData);

  base.basics = {
    ...base.basics,
    name: getString(basics.name),
    headline: getString(basics.headline),
    email: getString(basics.email),
    phone: getString(basics.phone),
    location: getString(basics.location),
    url: hydrateUrl(basics.url),
  };

  const summary = getObject(sections.summary);
  base.sections.summary = {
    ...defaultSection,
    id: "summary",
    name: "Summary",
    content: getString(summary.content),
  };

  const experience = getObject(sections.experience);
  base.sections.experience = {
    ...defaultSection,
    id: "experience",
    name: "Experience",
    items: hydrateExperience(experience.items),
  };

  const education = getObject(sections.education);
  base.sections.education = {
    ...defaultSection,
    id: "education",
    name: "Education",
    items: hydrateEducation(education.items),
  };

  const skills = getObject(sections.skills);
  base.sections.skills = {
    ...defaultSection,
    id: "skills",
    name: "Skills",
    items: hydrateSkills(skills.items),
  };

  const projects = getObject(sections.projects);
  base.sections.projects = {
    ...defaultSection,
    id: "projects",
    name: "Projects",
    items: hydrateProjects(projects.items),
  };

  const certifications = getObject(sections.certifications);
  base.sections.certifications = {
    ...defaultSection,
    id: "certifications",
    name: "Certifications",
    items: hydrateCertifications(certifications.items),
  };

  const languages = getObject(sections.languages);
  base.sections.languages = {
    ...defaultSection,
    id: "languages",
    name: "Languages",
    items: hydrateLanguages(languages.items),
  };

  const awards = getObject(sections.awards);
  base.sections.awards = {
    ...defaultSection,
    id: "awards",
    name: "Awards",
    items: hydrateAwards(awards.items),
  };

  const volunteer = getObject(sections.volunteer);
  base.sections.volunteer = {
    ...defaultSection,
    id: "volunteer",
    name: "Volunteering",
    items: hydrateVolunteer(volunteer.items),
  };

  const publications = getObject(sections.publications);
  base.sections.publications = {
    ...defaultSection,
    id: "publications",
    name: "Publications",
    items: hydratePublications(publications.items),
  };

  const references = getObject(sections.references);
  base.sections.references = {
    ...defaultSection,
    id: "references",
    name: "References",
    items: hydrateReferences(references.items),
  };

  const interests = getObject(sections.interests);
  base.sections.interests = {
    ...defaultSection,
    id: "interests",
    name: "Interests",
    items: hydrateInterests(interests.items),
  };

  const profiles = getObject(sections.profiles);
  base.sections.profiles = {
    ...defaultSection,
    id: "profiles",
    name: "Profiles",
    items: hydrateProfiles(profiles.items),
  };

  base.metadata.template = getString(metadata.template, "goldstar");

  return base;
}
