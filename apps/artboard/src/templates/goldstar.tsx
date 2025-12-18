/**
 * Goldstar Template - Built on golden resume tips and best practices
 *
 * Design principles based on synthesized advice:
 * 1. Single-column layout for maximum ATS compatibility and easy skimming
 * 2. Clean, modern typography without excessive formatting
 * 3. Clear section separation with adequate white space
 * 4. No icons/images in main content (except profile picture if needed)
 * 5. Dates right-aligned for easy scanning
 * 6. Bullet points, not paragraphs, for descriptions
 * 7. Comma-separated skills for easy reading
 * 8. Minimal use of bolding and formatting - only for emphasis
 * 9. Professional font choices (system defaults)
 * 10. Proper hierarchy: Name > Headline > Contact Info
 */

import type {
  Award,
  Certification,
  CustomSection,
  CustomSectionGroup,
  Education,
  Experience,
  Project,
  Publication,
  Reference,
  SectionKey,
  SectionWithItem,
  URL,
  Volunteer,
} from "@reactive-resume/schema";
import { cn, isEmptyString, isUrl, sanitize } from "@reactive-resume/utils";
import get from "lodash.get";
import React, { Fragment } from "react";

import { Picture } from "../components/picture";
import { useArtboardStore } from "../store/artboard";
import type { TemplateProps } from "../types/template";

/**
 * Header Component
 * Follows advice: Name prominent at top, professional email, no phone unless local,
 * no physical address, GitHub/portfolio only if valuable
 */
const Header = () => {
  const basics = useArtboardStore((state) => state.resume.basics);
  const profiles = useArtboardStore((state) => state.resume.sections.profiles);

  return (
    <div className="border-b-2 border-primary pb-4 mb-4">
      <div className="flex items-start gap-4">
        <Picture />

        <div className="flex-1">
          {/* Name - Large and prominent as per all guides */}
          <h1 className="text-2xl font-bold tracking-tight">{basics.name}</h1>

          {/* Headline - Clear positioning statement */}
          {basics.headline && (
            <div className="text-base text-gray-600 mt-0.5">{basics.headline}</div>
          )}

          {/* Contact info - Single line, comma separated, no icons for ATS */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mt-2">
            {basics.email && (
              <a href={`mailto:${basics.email}`} target="_blank" rel="noreferrer" className="hover:text-primary">
                {basics.email}
              </a>
            )}
            {basics.phone && (
              <a href={`tel:${basics.phone}`} target="_blank" rel="noreferrer" className="hover:text-primary">
                {basics.phone}
              </a>
            )}
            {/* Location only if relevant - can cause bias as per guides */}
            {basics.location && <span>{basics.location}</span>}
            {isUrl(basics.url.href) && (
              <a href={basics.url.href} target="_blank" rel="noreferrer noopener nofollow" className="hover:text-primary">
                {basics.url.label || basics.url.href.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
            {basics.customFields.map((item) => (
              <span key={item.id}>
                {isUrl(item.value) ? (
                  <a href={item.value} target="_blank" rel="noreferrer noopener nofollow" className="hover:text-primary">
                    {item.name || item.value.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                ) : (
                  <span>{[item.name, item.value].filter(Boolean).join(": ")}</span>
                )}
              </span>
            ))}
          </div>

          {/* Profiles - GitHub, LinkedIn, Portfolio - Plain text for ATS */}
          {profiles.visible && profiles.items.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mt-1">
              {profiles.items
                .filter((item) => item.visible)
                .map((item) => (
                  <a
                    key={item.id}
                    href={item.url.href}
                    target="_blank"
                    rel="noreferrer noopener nofollow"
                    className="hover:text-primary"
                  >
                    {item.url.label || item.url.href.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Summary Component
 * Only include if senior/staff engineer or career changer as per guides
 * Should be brief (<2 sentences) and explain motivation/fit
 */
const Summary = () => {
  const section = useArtboardStore((state) => state.resume.sections.summary);

  if (!section.visible || isEmptyString(section.content)) return null;

  return (
    <section id={section.id} className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary border-b border-primary pb-1 mb-2">
        {section.name}
      </h2>
      <div
        dangerouslySetInnerHTML={{ __html: sanitize(section.content) }}
        className="text-sm leading-relaxed"
      />
    </section>
  );
};

/**
 * Link Component - Clean, no icons for ATS compatibility
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
      className={cn("hover:text-primary", className)}
    >
      {label ?? (url.label || url.href.replace(/^https?:\/\/(www\.)?/, ''))}
    </a>
  );
};

/**
 * LinkedEntity - For company/institution names with optional links
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
      className={cn("hover:text-primary", className)}
    >
      {name}
    </a>
  ) : (
    <span className={className}>{name}</span>
  );
};

/**
 * Generic Section Component
 * Single column layout, clear hierarchy, dates right-aligned
 */
type SectionProps<T> = {
  section: SectionWithItem<T> | CustomSectionGroup;
  children?: (item: T) => React.ReactNode;
  className?: string;
  urlKey?: keyof T;
  levelKey?: keyof T;
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
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary border-b border-primary pb-1 mb-3">
        {section.name}
      </h2>

      <div className="space-y-3">
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
                  <div className="text-sm mt-1">
                    <Link url={url} />
                  </div>
                )}

                {/* Summary/Description as bullet-style content */}
                {summary !== undefined && !isEmptyString(summary) && (
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitize(summary) }}
                    className="text-sm mt-1 wysiwyg"
                  />
                )}

                {/* Keywords comma-separated as per guides */}
                {keywords !== undefined && keywords.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">{keywords.join(", ")}</p>
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
 * Most important for experienced candidates - follows STAR/XYZ/CAR bullet format
 * Company | Position on left, Date | Location on right
 */
const ExperienceSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.experience);

  return (
    <Section<Experience> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">
              <LinkedEntity
                name={item.company}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            <div className="text-sm">{item.position}</div>
          </div>
          <div className="text-right text-sm shrink-0">
            <div className="font-medium">{item.date}</div>
            {item.location && <div className="text-gray-600">{item.location}</div>}
          </div>
        </div>
      )}
    </Section>
  );
};

/**
 * Education Section
 * Keep concise - degree, university, location, graduation date
 * No coursework unless extremely specialized
 * GPA only if >3.75 or very impressive
 */
const EducationSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.education);

  return (
    <Section<Education> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">
              <LinkedEntity
                name={item.institution}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            <div className="text-sm">
              {[item.studyType, item.area].filter(Boolean).join(" in ")}
            </div>
            {item.score && <div className="text-sm text-gray-600">{item.score}</div>}
          </div>
          <div className="text-right text-sm shrink-0">
            <div className="font-medium">{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

/**
 * Skills Section
 * Comma-separated, not a long list of buzzwords
 * Only include skills you can interview in
 * Order by importance/relevance
 */
const SkillsSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.skills);

  if (!section.visible || section.items.filter((item) => item.visible).length === 0) return null;

  return (
    <section id={section.id} className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary border-b border-primary pb-1 mb-2">
        {section.name}
      </h2>

      <div className="space-y-1">
        {section.items
          .filter((item) => item.visible)
          .map((item) => (
            <div key={item.id} className="text-sm">
              {item.name && <span className="font-medium">{item.name}: </span>}
              {item.keywords.length > 0 && (
                <span>{item.keywords.join(", ")}</span>
              )}
              {item.description && item.keywords.length === 0 && (
                <span>{item.description}</span>
              )}
            </div>
          ))}
      </div>
    </section>
  );
};

/**
 * Projects Section
 * Real projects, not tutorials or clones
 * Should have users/impact, not just technical specs
 */
const ProjectsSection = () => {
  const section = useArtboardStore((state) => state.resume.sections.projects);

  return (
    <Section<Project> section={section} urlKey="url" summaryKey="summary" keywordsKey="keywords">
      {(item) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">
              <LinkedEntity
                name={item.name}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            {item.description && <div className="text-sm">{item.description}</div>}
          </div>
          {item.date && (
            <div className="text-right text-sm shrink-0">
              <div className="font-medium">{item.date}</div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
};

const Awards = () => {
  const section = useArtboardStore((state) => state.resume.sections.awards);

  return (
    <Section<Award> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">{item.title}</div>
            <LinkedEntity name={item.awarder} url={item.url} separateLinks={section.separateLinks} className="text-sm" />
          </div>
          <div className="text-right text-sm shrink-0">
            <div className="font-medium">{item.date}</div>
          </div>
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">{item.name}</div>
            <LinkedEntity name={item.issuer} url={item.url} separateLinks={section.separateLinks} className="text-sm" />
          </div>
          <div className="text-right text-sm shrink-0">
            <div className="font-medium">{item.date}</div>
          </div>
        </div>
      )}
    </Section>
  );
};

const Interests = () => {
  const section = useArtboardStore((state) => state.resume.sections.interests);

  if (!section.visible || section.items.filter((item) => item.visible).length === 0) return null;

  return (
    <section id={section.id} className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary border-b border-primary pb-1 mb-2">
        {section.name}
      </h2>
      <div className="text-sm">
        {section.items
          .filter((item) => item.visible)
          .map((item, index, arr) => (
            <span key={item.id}>
              {item.name}
              {item.keywords.length > 0 && ` (${item.keywords.join(", ")})`}
              {index < arr.length - 1 && ", "}
            </span>
          ))}
      </div>
    </section>
  );
};

const Publications = () => {
  const section = useArtboardStore((state) => state.resume.sections.publications);

  return (
    <Section<Publication> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">
              <LinkedEntity
                name={item.name}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            {item.publisher && <div className="text-sm">{item.publisher}</div>}
          </div>
          <div className="text-right text-sm shrink-0">
            <div className="font-medium">{item.date}</div>
          </div>
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">
              <LinkedEntity
                name={item.organization}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            <div className="text-sm">{item.position}</div>
          </div>
          <div className="text-right text-sm shrink-0">
            <div className="font-medium">{item.date}</div>
            {item.location && <div className="text-gray-600">{item.location}</div>}
          </div>
        </div>
      )}
    </Section>
  );
};

const Languages = () => {
  const section = useArtboardStore((state) => state.resume.sections.languages);

  if (!section.visible || section.items.filter((item) => item.visible).length === 0) return null;

  return (
    <section id={section.id} className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary border-b border-primary pb-1 mb-2">
        {section.name}
      </h2>
      <div className="text-sm">
        {section.items
          .filter((item) => item.visible)
          .map((item, index, arr) => (
            <span key={item.id}>
              {item.name}
              {item.description && ` (${item.description})`}
              {index < arr.length - 1 && ", "}
            </span>
          ))}
      </div>
    </section>
  );
};

const References = () => {
  const section = useArtboardStore((state) => state.resume.sections.references);

  return (
    <Section<Reference> section={section} urlKey="url" summaryKey="summary">
      {(item) => (
        <div>
          <div className="font-bold">
            <LinkedEntity
              name={item.name}
              url={item.url}
              separateLinks={section.separateLinks}
            />
          </div>
          {item.description && <div className="text-sm">{item.description}</div>}
        </div>
      )}
    </Section>
  );
};

const Custom = ({ id }: { id: string }) => {
  const section = useArtboardStore((state) => state.resume.sections.custom[id]);

  return (
    <Section<CustomSection>
      section={section}
      urlKey="url"
      summaryKey="summary"
      keywordsKey="keywords"
    >
      {(item) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold">
              <LinkedEntity
                name={item.name}
                url={item.url}
                separateLinks={section.separateLinks}
              />
            </div>
            {item.description && <div className="text-sm">{item.description}</div>}
          </div>
          <div className="text-right text-sm shrink-0">
            {item.date && <div className="font-medium">{item.date}</div>}
            {item.location && <div className="text-gray-600">{item.location}</div>}
          </div>
        </div>
      )}
    </Section>
  );
};

const mapSectionToComponent = (section: SectionKey) => {
  switch (section) {
    case "summary": {
      return <Summary />;
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
      return <Publications />;
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
      return <References />;
    }
    default: {
      if (section.startsWith("custom.")) return <Custom id={section.split(".")[1]} />;
      return null;
    }
  }
};

/**
 * Goldstar Template Main Component
 *
 * Key features based on synthesized resume best practices:
 * - Single column layout for ATS compatibility and easy reading
 * - Clean typography with proper hierarchy
 * - Adequate white space and clear section separation
 * - Right-aligned dates for easy scanning
 * - No excessive formatting or icons
 * - Professional, modern appearance
 * - Minimum 0.5" margins equivalent
 */
export const Goldstar = ({ columns, isFirstPage = false }: TemplateProps) => {
  const [main, sidebar] = columns;

  return (
    <div className="p-custom text-gray-800">
      {isFirstPage && <Header />}

      {/* Main content - single column flow for maximum readability */}
      <div className="space-y-0">
        {main.map((section) => (
          <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
        ))}

        {sidebar.map((section) => (
          <Fragment key={section}>{mapSectionToComponent(section)}</Fragment>
        ))}
      </div>
    </div>
  );
};

