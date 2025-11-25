import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { OpenAIConfigDto } from "@reactive-resume/dto";
import { InformationData, ResumeData, resumeDataSchema } from "@reactive-resume/schema";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";

// Google's OpenAI-compatible endpoint
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_DEFAULT_MODEL_SERVER = "gemini-1.5-flash";
const OPENAI_DEFAULT_MODEL_SERVER = "gpt-4o";

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);

  private getOpenAIClient(config: OpenAIConfigDto) {
    const { apiKey, baseURL, isAzure, azureApiVersion, model, provider } = config;

    if (!apiKey) {
      throw new InternalServerErrorException(
        "AI API Key is missing. Please check your settings.",
      );
    }

    // Handle Gemini via OpenAI Compatibility
    if (provider === 'gemini') {
      return new OpenAI({
        apiKey,
        baseURL: GEMINI_BASE_URL,
      });
    }

    // Handle Azure (legacy check for isAzure or explicit provider)
    if (isAzure || provider === 'azure') {
      if (!baseURL || !model || !azureApiVersion) {
        throw new InternalServerErrorException(
          "Azure OpenAI configuration is missing (Base URL, Model, or API Version).",
        );
      }

      const azureBaseURL = baseURL.replace(/\/$/, "");

      return new OpenAI({
        apiKey,
        baseURL: `${azureBaseURL}/openai/deployments/${model}`,
        defaultQuery: { "api-version": azureApiVersion },
      });
    }

    // Default OpenAI or custom (Ollama)
    return new OpenAI({
      apiKey,
      baseURL: baseURL ?? undefined,
    });
  }

  private sanitizeResumeIds(data: any): ResumeData {
    if (data?.sections) {
      for (const key in data.sections) {
        const section = data.sections[key];
        if (section && Array.isArray(section.items)) {
          for (const item of section.items) {
            if (item && typeof item === "object") {
              // Overwrite any AI-generated ID with a valid Cuid2
              item.id = createId();
            }
          }
        }
      }
    }
    return data as ResumeData;
  }

  async generateResume(
    information: InformationData,
    jobDescription: string,
    config: OpenAIConfigDto,
  ): Promise<ResumeData> {
    const openai = this.getOpenAIClient(config);
    const model = config.provider === 'gemini'
      ? (config.model ?? GEMINI_DEFAULT_MODEL_SERVER)
      : (config.model ?? OPENAI_DEFAULT_MODEL_SERVER);

    const schema = zodToJsonSchema(resumeDataSchema, "resumeDataSchema");

    try {
      const response = await openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
            You are an elite AI career coach and resume strategist, specializing in optimizing resumes for both human recruiters and Applicant Tracking Systems (ATS).
            Your sole task is to generate a highly targeted, professional resume in JSON format, strictly adhering to the provided schema.

            <CORE_PRINCIPLES>
            1.  **Relevance is King:** Your primary goal is not to list everything the candidate has done, but to create a compelling argument for why they are the perfect fit for THIS specific job.
            2.  **The Information Bank is a Source, Not a Script:** The provided <information_bank> contains all possible information about the candidate. You MUST NOT include everything. Your job is to intelligently and ruthlessly select ONLY the most relevant pieces of information that align with the <job_description>. You MUST OMIT any information, be it a job, a project, or a skill, that does not directly support the candidate's application for this specific role.
            3.  **Brevity and Impact (The 1.5 Page Rule):** The final content must be concise enough to fit comfortably on 1 to 1.5 pages (A4). Every word must earn its place. Eliminate fluff and focus on impactful, quantifiable achievements.
            4.  **Quantify Everything Possible:** Convert duties into achievements. Instead of "managed a team," write "led a team of 5 engineers to deliver the project 3 weeks ahead of schedule."
            </CORE_PRINCIPLES>

            <LOGICAL_STEPS>
            1.  **Deep Analysis:** First, meticulously analyze the <job_description> to identify key skills, technologies, responsibilities, and company values.
            2.  **Selective Information Extraction:** Scour the <information_bank> and extract ONLY the experiences, projects, and skills that directly map to the requirements from your analysis in Step 1.
            3.  **Content Generation & Tailoring:** Generate the content for each section with the following rules:
                *   **Summary:** Write a powerful 3-4 sentence "Executive Summary" that immediately highlights the candidate's most relevant qualifications and experience from the job description.
                *   **Experience:** This is the most critical section. For each role you choose to include, you will rewrite the summary into 2-4 impactful, quantifiable bullet points. Each bullet point should showcase an achievement, not just a duty. Use an active voice. The 'summary' field MUST be a valid HTML string using <ul> and <li> tags.
                *   **Skills:** Extract only the most relevant skills. Crucially, for the \`level\` property (a number from 0-5), if the source data has a level less than 3, you MUST represent it as 3 in the final output. Never show a skill level below 3.
                *   **Education & Projects:** Keep these sections concise, highlighting only relevant coursework or technologies.
            4.  **Schema Adherence:** Construct the final JSON object, ensuring it strictly conforms to the provided <json_schema>. The 'id' fields for items in arrays will be ignored and regenerated by the server; you can use a placeholder like "temp-id".
            </LOGICAL_STEPS>

            # Style & Grammar
            - No em dashes (—). Use commas, semicolors, or restructure sentences.
            - Write in a professional, confident, and direct tone.

            # Output Format
            - The final output must be a single, raw JSON object. Do not wrap it in markdown code blocks.
            `,
          },
          {
            role: "user",
            content: `
            <json_schema>
            ${JSON.stringify(schema)}
            </json_schema>

            <information_bank>
            ${JSON.stringify(information)}
            </information_bank>

            <job_description>
            ${jobDescription}
            </job_description>

            Now, generate the tailored resume JSON based on the principles and steps provided.
            `,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException("AI returned an empty response.");
      }

      try {
        const parsedJson = JSON.parse(content);

        // --- FIX: Sanitize the data by generating valid IDs before validation ---
        const sanitizedData = this.sanitizeResumeIds(parsedJson);

        return resumeDataSchema.parse(sanitizedData);
      } catch (error) {
        this.logger.error(`JSON Parsing Error: ${(error as Error).message}`);
        this.logger.debug(`Raw Content: ${content}`);
        throw new InternalServerErrorException("AI returned invalid JSON.", (error as Error).message);
      }
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException("Failed to generate resume via AI", (error as Error).message);
    }
  }

  async generateCoverLetter(
    information: InformationData,
    jobDescription: string,
    config: OpenAIConfigDto,
  ): Promise<{ content: string }> {
    const openai = this.getOpenAIClient(config);

    const model = config.provider === 'gemini'
      ? (config.model ?? GEMINI_DEFAULT_MODEL_SERVER)
      : (config.model ?? OPENAI_DEFAULT_MODEL_SERVER);

    try {
      const response = await openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
            You are an expert Career Coach, specializing in persuasive, narrative-driven communication.
            Your task is to craft a compelling cover letter that tells a story, connecting the candidate's experience to the company's needs.

            ### CORE TASK:
            - Create a cover letter that is tailored specifically to the <job_description> using the <information_bank> as a source of truth.
            - The output must be a JSON object with a single key: "content".
            - The "content" value must be a valid HTML string.

            ### STRUCTURE & TONE:
            1.  **Opening Hook:** Do not use clichés like "I am writing to apply...". Start with a strong, engaging sentence that shows you understand the company's challenges or projects mentioned in the job description.
            2.  **Body Paragraphs (2-3):** Create a narrative. For each paragraph, select one or two key achievements from the <information_bank> and explain how those experiences directly address the needs outlined in the <job_description>. Quantify results where possible.
            3.  **Closing:** End with a confident call to action, expressing enthusiasm for the specific role and company.
            4.  **Style:** Maintain a professional, confident, and authentic tone. Avoid using em dashes (—).

            ### OUTPUT FORMAT:
            - Use <p> tags for paragraphs and <br> for any necessary line breaks between them.
            - Ensure the final output is a raw JSON object, not a markdown code block.
            `,
          },
          {
            role: "user",
            content: `
                <information_bank>
                ${JSON.stringify(information)}
                </information_bank>

                <job_description>
                ${jobDescription}
                </job_description>

                Now, generate the cover letter JSON.
            `,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException("AI returned an empty response.");
      }

      // Strip Markdown code blocks if present
      const sanitizedContent = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");

      try {
        const parsed = JSON.parse(sanitizedContent) as { content: string };
        if (typeof parsed.content !== "string") {
          throw new TypeError("AI did not return content in the expected format.");
        }

        parsed.content = parsed.content.replace(/(<p><br><\/p>\s*){2,}/g, "<p><br></p>");

        return parsed;
      } catch (error) {
        this.logger.error(`JSON Parsing Error: ${(error as Error).message}`);
        this.logger.debug(`Raw Content: ${content}`);
        throw new InternalServerErrorException("AI returned invalid JSON.", (error as Error).message);
      }
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException("Failed to generate cover letter via AI", (error as Error).message);
    }
  }
}
