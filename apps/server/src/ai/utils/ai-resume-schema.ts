import { z } from "zod";

// Gemini-compatible schema for AI resume generation.
// Avoids: anyOf, const, pattern, $ref, default (all unsupported by Gemini).
// IDs are regenerated server-side after hydration.
// @see https://ai.google.dev/gemini-api/docs/structured-output

const aiUrlSchema = z.object({
  label: z.string().describe("Display text for the link (can be empty)"),
  href: z.string().describe("Full URL including https:// (can be empty string if not applicable)"),
});

const aiExperienceSchema = z.object({
  visible: z.boolean().describe("Whether this item should be visible on the resume"),
  company: z.string().describe("Company or organization name"),
  position: z.string().describe("Job title or role held"),
  location: z.string().describe("City, State/Country or 'Remote'"),
  date: z.string().describe("Date range, e.g., 'Jan 2020 - Present' or 'Mar 2018 - Dec 2019'"),
  summary: z
    .string()
    .describe(
      "HTML string with achievements as bullet points using <ul><li> tags. Maximum 4 bullet points. Use STAR method and strong action verbs.",
    ),
  url: aiUrlSchema.describe("Company website or relevant link"),
});

const aiEducationSchema = z.object({
  visible: z.boolean().describe("Whether this item should be visible on the resume"),
  institution: z.string().describe("School, university, or institution name"),
  studyType: z
    .string()
    .describe("Degree type, e.g., 'Bachelor of Science', 'Master of Arts', 'Ph.D.'"),
  area: z
    .string()
    .describe("Field of study or major, e.g., 'Computer Science', 'Business Administration'"),
  score: z
    .string()
    .describe(
      "GPA, honors, or achievements, e.g., '3.8/4.0 GPA', 'Magna Cum Laude', 'First Class Honours'",
    ),
  date: z.string().describe("Date range, e.g., '2016 - 2020' or 'Expected May 2025'"),
  summary: z
    .string()
    .describe("Notable achievements, relevant coursework, or activities (optional)"),
  url: aiUrlSchema.describe("Institution website or relevant link"),
});

const aiSkillSchema = z.object({
  visible: z.boolean().describe("Whether this skill category should be visible"),
  name: z
    .string()
    .describe("Skill category name, e.g., 'Backend Development', 'Cloud & DevOps', 'Languages'"),
  description: z.string().describe("Brief description of expertise level (optional)"),
  level: z
    .number()
    .describe("Proficiency level from 0-5. Always use 3 or higher for AI-generated skills."),
  keywords: z
    .array(z.string())
    .describe("List of specific skills/technologies, e.g., ['Node.js', 'PostgreSQL', 'Redis']"),
});

const aiProjectSchema = z.object({
  visible: z.boolean().describe("Whether this project should be visible"),
  name: z.string().describe("Project name or title"),
  description: z.string().describe("One-line description of the project"),
  date: z.string().describe("Date or date range, e.g., '2023' or 'Jan 2023 - Mar 2023'"),
  summary: z
    .string()
    .describe(
      "HTML string with project details using <ul><li> tags. 2-4 bullet points describing impact and technologies.",
    ),
  keywords: z.array(z.string()).describe("Technologies, frameworks, or tools used"),
  url: aiUrlSchema.describe("Project URL, demo link, or repository"),
});

const aiCertificationSchema = z.object({
  visible: z.boolean().describe("Whether this certification should be visible"),
  name: z.string().describe("Certification name, e.g., 'AWS Solutions Architect Professional'"),
  issuer: z.string().describe("Issuing organization, e.g., 'Amazon Web Services', 'Google Cloud'"),
  date: z.string().describe("Date obtained or expiry, e.g., 'Dec 2023' or 'Valid until Dec 2026'"),
  summary: z.string().describe("Brief description or credential ID (optional)"),
  url: aiUrlSchema.describe("Verification link or credential URL"),
});

const aiLanguageSchema = z.object({
  visible: z.boolean().describe("Whether this language should be visible"),
  name: z.string().describe("Language name, e.g., 'English', 'Spanish', 'Mandarin Chinese'"),
  description: z
    .string()
    .describe(
      "Proficiency level, e.g., 'Native', 'Fluent', 'Professional Working', 'Conversational'",
    ),
  level: z
    .number()
    .describe(
      "Proficiency level 0-5: 5=Native, 4=Fluent, 3=Professional, 2=Conversational, 1=Basic",
    ),
});

const aiAwardSchema = z.object({
  visible: z.boolean().describe("Whether this award should be visible"),
  title: z.string().describe("Award or achievement title"),
  awarder: z.string().describe("Organization or entity that gave the award"),
  date: z.string().describe("Date received, e.g., 'Nov 2022'"),
  summary: z.string().describe("Brief description of the achievement"),
  url: aiUrlSchema.describe("Link to award details or announcement"),
});

const aiVolunteerSchema = z.object({
  visible: z.boolean().describe("Whether this volunteer experience should be visible"),
  organization: z.string().describe("Organization or cause name"),
  position: z.string().describe("Role or title held"),
  location: z.string().describe("Location of the volunteer work"),
  date: z.string().describe("Date range of involvement"),
  summary: z.string().describe("Description of contributions and impact"),
  url: aiUrlSchema.describe("Organization website"),
});

const aiPublicationSchema = z.object({
  visible: z.boolean().describe("Whether this publication should be visible"),
  name: z.string().describe("Publication title"),
  publisher: z.string().describe("Publisher, journal, or conference name"),
  date: z.string().describe("Publication date"),
  summary: z.string().describe("Brief abstract or description"),
  url: aiUrlSchema.describe("Link to the publication"),
});

const aiReferenceSchema = z.object({
  visible: z.boolean().describe("Whether this reference should be visible"),
  name: z.string().describe("Reference person's name"),
  description: z
    .string()
    .describe("Their title and relationship, e.g., 'Former Manager at Company X'"),
  summary: z.string().describe("Testimonial quote or description"),
  url: aiUrlSchema.describe("LinkedIn profile or contact link"),
});

const aiInterestSchema = z.object({
  visible: z.boolean().describe("Whether this interest should be visible"),
  name: z.string().describe("Interest or hobby category, e.g., 'Open Source', 'Photography'"),
  keywords: z
    .array(z.string())
    .describe("Specific interests, e.g., ['Contributing to React', 'Landscape photography']"),
});

const aiProfileSchema = z.object({
  visible: z.boolean().describe("Whether this profile should be visible"),
  network: z.string().describe("Platform name, e.g., 'LinkedIn', 'GitHub', 'Twitter'"),
  username: z.string().describe("Username or handle on the platform"),
  icon: z.string().describe("Icon slug from simpleicons.org, e.g., 'linkedin', 'github', 'x'"),
  url: aiUrlSchema.describe("Full URL to the profile"),
});

const aiSectionsSchema = z.object({
  summary: z.object({
    content: z
      .string()
      .describe(
        "Professional summary. Maximum 2-3 sentences for senior candidates (10+ years). Leave as empty string for junior/mid-level candidates unless making a career pivot.",
      ),
  }),
  experience: z.object({
    items: z
      .array(aiExperienceSchema)
      .describe("Work experience. Include maximum 4 most recent and relevant positions."),
  }),
  education: z.object({
    items: z.array(aiEducationSchema).describe("Educational background."),
  }),
  skills: z.object({
    items: z
      .array(aiSkillSchema)
      .describe("Skills grouped by category. Maximum 6 skill categories."),
  }),
  projects: z.object({
    items: z
      .array(aiProjectSchema)
      .describe("Notable projects. Maximum 2 most impressive and relevant projects."),
  }),
  certifications: z.object({
    items: z.array(aiCertificationSchema).describe("Professional certifications."),
  }),
  languages: z.object({
    items: z.array(aiLanguageSchema).describe("Language proficiencies."),
  }),
  awards: z.object({
    items: z.array(aiAwardSchema).describe("Awards and achievements."),
  }),
  volunteer: z.object({
    items: z.array(aiVolunteerSchema).describe("Volunteer experience."),
  }),
  publications: z.object({
    items: z.array(aiPublicationSchema).describe("Publications, papers, or articles."),
  }),
  references: z.object({
    items: z.array(aiReferenceSchema).describe("Professional references."),
  }),
  interests: z.object({
    items: z.array(aiInterestSchema).describe("Personal interests and hobbies."),
  }),
  profiles: z.object({
    items: z.array(aiProfileSchema).describe("Social and professional profiles."),
  }),
});

const aiBasicsSchema = z.object({
  name: z.string().describe("Full name as it should appear on the resume"),
  headline: z
    .string()
    .describe(
      "Professional title or headline, e.g., 'Senior Software Engineer', 'Product Manager'",
    ),
  email: z.string().describe("Professional email address"),
  phone: z.string().describe("Phone number with country code if applicable"),
  location: z.string().describe("City, State/Province, Country or just City, Country"),
  url: aiUrlSchema.describe("Personal website, portfolio, or primary professional link"),
});

export const aiResumeSchema = z.object({
  basics: aiBasicsSchema,
  sections: aiSectionsSchema,
  metadata: z.object({
    template: z
      .string()
      .describe("Template name. Always set to 'goldstar' unless specified otherwise."),
  }),
});

export type AIResumeData = z.infer<typeof aiResumeSchema>;
export type AIExperience = z.infer<typeof aiExperienceSchema>;
export type AIEducation = z.infer<typeof aiEducationSchema>;
export type AISkill = z.infer<typeof aiSkillSchema>;
export type AIProject = z.infer<typeof aiProjectSchema>;
export type AICertification = z.infer<typeof aiCertificationSchema>;
export type AILanguage = z.infer<typeof aiLanguageSchema>;
export type AIAward = z.infer<typeof aiAwardSchema>;
export type AIVolunteer = z.infer<typeof aiVolunteerSchema>;
export type AIPublication = z.infer<typeof aiPublicationSchema>;
export type AIReference = z.infer<typeof aiReferenceSchema>;
export type AIInterest = z.infer<typeof aiInterestSchema>;
export type AIProfile = z.infer<typeof aiProfileSchema>;
export type AIURL = z.infer<typeof aiUrlSchema>;
