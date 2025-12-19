/**
 * Goldstar Template - Heavily inspired by "Jake's Resume" (LaTeX)
 *
 * Design principles:
 * 1. Single-column, clean, high-density layout.
 * 2. Centered header with pipe-separated contact info.
 * 3. Consistent "Company/School (Left) - Location (Right)" & "Role/Degree (Left) - Date (Right)" pattern.
 * 4. Minimal whitespace, maximum content.
 * 5. No summary, no photos, no icons.
 */

import type {
  Award,
  Certification,
  CustomSection,
  CustomSectionGroup,
  Education,
  Experience,
  Interest,
  Language,
  Project,
  SectionKey,
  SectionWithItem,
  Skill,
  URL,
  Volunteer,
} from "@reactive-resume/schema";
import { cn, isEmptyString, isUrl, sanitize } from "@reactive-resume/utils";
import get from "lodash.get";
import React, { Fragment } from "react";

import { useArtboardStore } from "../store/artboard";
import type { TemplateProps } from "../types/template";

/**
 * Header Component
 * Centered name, contact info separated by '|'
 */
const Header = () => {
  const basics = useArtboardStore((state) => state.resume.basics);
  const profiles = useArtboardStore((state) => state.resume.sections.profiles);

  // Helper to filter and join valid contact items
  const contactItems = [
    basics.phone && <a href={`tel:${basics.phone}`} target="_blank" rel="noreferrer" className="hover:text-primary">{basics.phone}</a>,
    basics.email && <a href={`mailto:${basics.email}`} target="_blank" rel="noreferrer" className="hover:text-primary">{basics.email}</a>,
    basics.location,
    isUrl(basics.url.href) && (
      <a href={basics.url.href} target="_blank" rel="noreferrer noopener nofollow" className="hover:text-primary">
        {/*{basics.url.label || basics.url.href.replace(/^https?:\/\/(www\.)?/, '')}*/}
        {basics.url.label || 'Portfolio'}
      </a>
    ),
    ...basics.customFields.map((item) => (
       isUrl(item.value) ? (
        <a href={item.value} target="_blank" rel="noreferrer noopener nofollow" className="hover:text-primary">
          {item.name || item.value.replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      ) : (
        <span>{[item.name, item.value].filter(Boolean).join(": ")}</span>
      )
    )),
    ...(profiles.visible
      ? profiles.items.filter((item) => item.visible).map((item) => (
          <a
            key={item.id}
            href={item.url.href}
            target="_blank"
            rel="noreferrer noopener nofollow"
            className="hover:text-primary"
          >
            {item.url.label || item.network || item.url.href.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        ))
      : []),
  ].filter(Boolean);

  return (
    <div className="flex flex-col items-center justify-center pb-2 mb-2">
      <h1 className="text-3xl font-bold tracking-tight uppercase text-center mb-1">{basics.name}</h1>

      {/* Optional: Headline if user really wants it, though Jake's usually skips it */}
      {basics.headline && (
        <div className="text-md text-gray-700 mb-1 text-center">{basics.headline}</div>
      )}

      <div className="flex flex-wrap justify-center gap-x-2 text-sm text-gray-800">
        {contactItems.map((item, index) => (
          <React.Fragment key={index}>
            <span>{item}</span>
            {index < contactItems.length - 1 && <span className="text-gray-400">|</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/**
 * Link Component
 */
type LinkProps = {
  url: URL;
  label?: string;
  className?: string;
};

const Link = ({ url, label, className }: LinkProps) => {
  if (!isUrl(url.href)) return null;

  return (
    <a
      href={url.href}
      target="_blank"
      rel="noreferrer noopener nofollow"
      className={cn("hover:text-primary underline decoration-dotted", className)}
    >
      {label ?? (url.label || url.href)}
    </a>
  );
};

/**
 * LinkedEntity
 */
type LinkedEntityProps = {
  name: string;
  url: URL;
  separateLinks: boolean;
  className?: string;
};

const LinkedEntity = ({ name, url, separateLinks, className }: LinkedEntityProps) => {
  return !separateLinks && isUrl(url.href) ? (
    <a
      href={url.href}
      target="_blank"
      rel="noreferrer noopener nofollow"
      className={cn("hover:text-primary hover:underline", className)}
    >
      {name}
    </a>
  ) : (
    <span className={className}>{name}</span>
  );
};

/**
 * Section Container
 */
type SectionProps<T> = {
  section: SectionWithItem<T> | CustomSectionGroup;
  children?: (item: T) => React.ReactNode;
  className?: string;
  urlKey?: keyof T;
  summaryKey?: keyof T;
  keywordsKey?: keyof T;
};

const Section = <T,>({
  section,
  children,
  className,
  urlKey,
  summaryKey,
  keywordsKey,
}: SectionProps<T>) => {
  if (!section.visible || section.items.filter((item) => item.visible).length === 0) return null;

  return (
    <section id={section.id} className="mb-4">
      <h2 className="text-lg uppercase tracking-wider text-black border-b-2 border-black pb-0.5 mb-2">
        {section.name}
      </h2>

      <div className="space-y-1.5">
        {section.items
          .filter((item) => item.visible)
          .map((item) => {
            const url = (urlKey && get(item, urlKey)) as URL | undefined;
            const summary = (summaryKey && get(item, summaryKey, "")) as string | undefined;
            const keywords = (keywordsKey && get(item, keywordsKey, [])) as string[] | undefined;

            return (
              <div key={item.id} className={cn("", className)}>
                {children?.(item as T)}

                {url !== undefined && section.separateLinks && (
                  <div className="text-xs mt-0.5">
                    <Link url={url} />
                  </div>
                )}

                {summary !== undefined && !isEmptyString(summary) && (
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitize(summary) }}
                    className="text-sm mt-1 wysiwyg pl-1"
                  />
                )}

                {/* Keywords handled differently in some sections, but default here */}
                {keywords !== undefined && keywords.length > 0 && (
                  <p className="text-sm text-gray-700 mt-0.5">
                    <span className="font-semibold">Keywords:</span> {keywords.join(", ")}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
};

/**
 * Experience Section
 * Row 1: Company (Left, Bold) | Location (Right, Regular)
 * Row 2: Title (Left, Italic) | Date (Right, Italic)
 */
const ExperienceSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.experience);

  return (
    <Section<Experience> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="mb-1">
          <div className="flex justify-between items-baseline">
            <div className="font-bold text-base text-gray-900">{item.position}</div>
            <div className="text-sm text-gray-800 font-medium whitespace-nowrap ml-2">{item.location}</div>
          </div>

          <div className="flex justify-between items-baseline -mt-0.5 mb-1">
            <div className="italic text-sm font-medium text-gray-800">
              <LinkedEntity
                name={item.company}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            <div className="italic text-sm text-gray-700 whitespace-nowrap ml-2">{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

/**
 * Education Section
 * Row 1: Institution (Left, Bold) | Location (Right, Regular)
 * Row 2: Degree/Area (Left, Italic) | Date (Right, Italic)
 * GPA/Score included if present
 */
const EducationSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.education);

  return (
    <Section<Education> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="mb-1">
          <div className="flex justify-between items-baseline">
            <div className="font-bold text-base text-gray-900">
              <LinkedEntity
                name={item.institution}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            <div className="text-sm text-gray-800 font-medium whitespace-nowrap ml-2">{item.score && `GPA: ${item.score}`}</div>
          </div>

          <div className="flex justify-between items-baseline -mt-0.5 mb-1">
            <div className="italic text-sm font-medium text-gray-800">
               {[item.studyType, item.area].filter(Boolean).join(" in ")}
            </div>
            <div className="italic text-sm text-gray-700 whitespace-nowrap ml-2">{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

/**
 * Projects Section
 * Format: Name | Tech Stack (Italic) ----- Date (Right)
 */
const ProjectsSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.projects);

  return (
    <Section<Project> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="mb-0.5">
          <div className="flex justify-between items-baseline">
            <div className="text-base">
              <span className="font-bold">
                <LinkedEntity
                  name={item.name}
                  url={item.url}
                  separateLinks={section.separateLinks}
                />
              </span>
              {item.keywords.length > 0 && (
                 <>
                  <span className="mx-1">|</span>
                  <span className="italic text-sm text-gray-700">{item.keywords.join(", ")}</span>
                 </>
              )}
            </div>
            <div className="italic text-sm text-gray-700 shrink-0">{item.date}</div>
          </div>
           {/* Description/Summary handled by Section component */}
           {item.description && <div className="text-sm mt-0.5">{item.description}</div>}
        </div>
      )}
    </Section>
  );
};

/**
 * Skills Section
 * Compact rows: "Category: Skill, Skill, Skill"
 */
const SkillsSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.skills);

  return (
    <Section<Skill> section={section}>
      {(item) => (
        <div className="flex text-sm">
          {item.name && <span className="font-bold mr-2 whitespace-nowrap">{item.name}:</span>}
          <span className="text-gray-900">
            {item.keywords.length > 0 ? item.keywords.join(", ") : item.description}
          </span>
        </div>
      )}
    </Section>
  );
};

// Other sections follow standard patterns but simplified

const Awards = () => {
  const section = useArtboardStore((state) => state.resume.sections.awards);
  return (
    <Section<Award> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="flex justify-between items-baseline">
          <div className="font-bold text-sm">{item.title}</div>
          <div className="italic text-sm">{item.date}</div>
        </div>
      )}
    </Section>
  );
};

const Certifications = () => {
  const section = useArtboardStore((state) => state.resume.sections.certifications);
  return (
    <Section<Certification> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="flex justify-between items-baseline">
          <div className="font-bold text-sm">{item.name}</div>
          <div className="italic text-sm">{item.date}</div>
        </div>
      )}
    </Section>
  );
};

const Interests = () => {
  const section = useArtboardStore((state) => state.resume.sections.interests);

  return (
    <Section<Interest> section={section}>
      {(item) => (
        <div className="text-sm">
          <span className="font-bold">{item.name}</span>
          {item.keywords.length > 0 && <span> ({item.keywords.join(", ")})</span>}
        </div>
      )}
    </Section>
  );
};

const VolunteerSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.volunteer);
  return (
    <Section<Volunteer> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="mb-1">
          <div className="flex justify-between items-baseline">
            <div className="font-bold text-base">{item.organization}</div>
            <div className="text-sm font-medium">{item.location}</div>
          </div>
          <div className="flex justify-between items-baseline -mt-0.5">
            <div className="italic text-sm">{item.position}</div>
            <div className="italic text-sm">{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const Languages = () => {
  const section = useArtboardStore((state) => state.resume.sections.languages);

  return (
    <Section<Language> section={section}>
      {(item) => (
        <div className="text-sm">
          <span className="font-bold">{item.name}</span>
          {!isEmptyString(item.description) && <span className="italic"> ({item.description})</span>}
        </div>
      )}
    </Section>
  );
};

// Generic fallback for custom sections
const Custom = ({ id }: { id: string }) => {
  const section = useArtboardStore((state) => state.resume.sections.custom[id]);
  return (
    <Section<CustomSection> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="flex justify-between items-baseline">
          <div className="font-bold text-sm">{item.name}</div>
          <div className="italic text-sm">{item.date}</div>
        </div>
      )}
    </Section>
  );
};

const mapSectionToComponent = (section: SectionKey) => {
  switch (section) {
    // Summary hidden as per specific instruction
    case "summary": {
      return null;
    }
    case "experience": {
      return <ExperienceSection />;
    }
    case "education": {
      return <EducationSection />;
    }
    case "awards": {
      return <Awards />;
    }
    case "certifications": {
      return <Certifications />;
    }
    case "skills": {
      return <SkillsSection />;
    }
    case "interests": {
      return <Interests />;
    }
    case "publications": {
      return null; // Typically not in standard Jake's, but can be added if needed
    }
    case "volunteer": {
      return <VolunteerSection />;
    }
    case "languages": {
      return <Languages />;
    }
    case "projects": {
      return <ProjectsSection />;
    }
    case "references": {
      return null; // No references on resumes
    }
    default: {
      if (section.startsWith("custom.")) return <Custom id={section.split(".")[1]} />;
      return null;
    }
  }
};

export const Goldstar = ({ columns, isFirstPage = false }: TemplateProps) => {
  const [main, sidebar] = columns;

  return (
    <div className="p-custom text-gray-900 selection:bg-gray-100">
      <style dangerouslySetInnerHTML={{ __html: `
        .goldstar-template {
          font-family: "Latin Modern Roman", "Times New Roman", Times, serif;
          font-size: 11pt;
          line-height: 1.15;
        }
        .goldstar-template h1 {
          font-size: 18pt;
          line-height: 1.2;
        }
        .goldstar-template h2 {
          font-size: 14pt;
          line-height: 1;
        }
        .goldstar-template li {
          font-size: 11pt;
          line-height: 1;
        }
        .goldstar-template a {
          text-decoration: none !important;
        }
        .goldstar-template .text-sm {
          font-size: 10pt;
        }
        .goldstar-template .text-base {
          font-size: 11pt;
        }
        .goldstar-template .italic {
          font-style: italic;
        }
        .goldstar-template .font-bold {
          font-weight: 700;
        }
      `}} />

      <div className="goldstar-template">
        {isFirstPage && <Header />}

        <div className="flex flex-col gap-y-0">
          {main.map((section) => (
            <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
          ))}
          {sidebar.map((section) => (
            <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
