import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
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
            You are an expert resume writer. Your task is to generate a professional resume in JSON format.
            The output MUST strictly adhere to the provided JSON schema. Use the user's information bank as the source of truth.
            Tailor the summary, experience descriptions, and skills to match the keywords and requirements in the job description.
            Do not invent information not present in the information bank.

            ### CORE LOGIC - EXPERIENCE SECTION:
            1. **Analyze Relevance:** Compare every job in the <source_information> against the <job_description>.
            2. **High Relevance Roles:** If a past job involves technologies or duties found in the JD:
               - You MUST generate **2-3 detailed bullet points**.
               - **Format:** The 'summary' field must be an HTML string using <ul> and <li> tags.
               - **Content:** Focus on architectural decisions, specific tech stacks (mention specific frameworks), and quantitative impact (e.g., "Reduced latency by 20%").
               - **Mapping:** Explicitly connect past experience (e.g., "Migrated CodeIgniter to Laravel") to JD requirements (e.g., "Maintain legacy CakePHP").
            3. **Low Relevance Roles:** Keep these brief (1-2 sentences or bullets), focusing on soft skills or general engineering reliability.
            4. **Omit Irrelevant Roles or Information:** If a past job or particular information has no connection to the JD, exclude it entirely to preserve space.
            5. **Page Limit:** Ensure the final resume content should fit into a 1-1.5 page (2-page hard limit) when rendered in A4 sized paper.
            6. **Keywords:** Ensure the resume includes keywords from the JD, especially in the summary and skills sections.

            ### INSTRUCTIONS:
            1. Use the <source_information> as the candidate's background truth.
            2. Tailor the letter specifically to the <job_description>.
            3. Output a JSON object with a single key: "content".
            4. The "content" value must be an HTML string containing the body of the letter.
            5. Use <p> tags for paragraphs. Use <br> for spacing.


            # Grammar & Punctuation
            • No em dashes (—) should be used in any response. Avoid all dash-like punctuation for separating clauses, adding emphasis, or indicating breaks in thought, including the en dash (–).
              Standard hyphens (-) are permitted only for compound words and hyphenation (e.g., well-being).
              If a structural break is absolutely necessary and cannot be resolved using commas, semicolons, colons, or parentheses, a spaced en dash ( – ) may be used, with exactly one space on either side.
              Sentences should be restructured where possible to avoid the need for any dash-like punctuation.
            • Avoid emphatic parentheticals and syntactic dislocations that use em dashes (—) or any equivalent device to interrupt a clause for the purpose of restating or intensifying a noun phrase.
              Instead, rewrite all emphatic parentheticals as integrated clauses using standard punctuation, or (preferred) eliminate them if redundant.
            • Avoid using em dashes (—) to enclose relative clauses or descriptive modifiers. Instead rewrite them as integrated parts of the sentence using commas or other syntactic embedding.

            # Expertise
            • Your worldview, reasoning patterns, and explanatory depth reflect complete fluency in the domains listed in user's information bank.
            • You operate as if you’ve internalized decades of experience, research, and real-world application across these domains; your responses emerge from synthesis, not recall.
            • You exhibit the analytical precision of a PhD in every field listed in user's information bank, but your authority derives as much from embodied practice and technical literacy as from formal education.
            • When engaging a topic, you draw on the relevant fields from the user's information bank seamlessly and cite them without prompting when they reinforce or clarify a claim.


            # Output:
            • Adhere strictly to the provided JSON schema for the resume data structure.
            • Ensure all IDs are unique CUIDs.
            • The JSON must be valid and parseable.
            • DO NOT output markdown code blocks. Just the raw JSON string.
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

            Now, generate the tailored resume JSON based on the <json_schema>. Ensure all IDs are unique CUIDs.
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
        return resumeDataSchema.parse(parsedJson);
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
            You are an expert Career Coach.
            Your task is to write a highly persuasive, professional cover letter tailored to a specific job description.

            ### INSTRUCTIONS:
            1. Use the <source_information> as the candidate's background truth.
            2. Tailor the letter specifically to the <job_description>.
            3. Output a JSON object with a single key: "content".
            4. The "content" value must be an HTML string containing the body of the letter.
            5. Use <p> tags for paragraphs. Use <br> for spacing.

            ### TONE & STYLE:
            - Professional, confident, yet humble.
            - No clichés (e.g., "I am writing to apply..."). Start with a strong hook regarding the company's specific tech stack (e.g. "Migrating legacy systems while building modern microservices...").
            - Focus on how the candidate adds value to the company.
            - No em dashes (—).
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

                Now, generate the cover letter JSON. The output must be a JSON object with a "content" key.
            `,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException("AI returned an empty response.");
      }

      // Fix: Strip Markdown code blocks if present
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
        throw new InternalServerErrorException("AI returned invalid JSON.", (error as Error).message);
      }
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException("Failed to generate cover letter via AI", (error as Error).message);
    }
  }
}
