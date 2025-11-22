import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { OpenAIConfigDto } from "@reactive-resume/dto";
import { InformationData, ResumeData, resumeDataSchema } from "@reactive-resume/schema";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";

// Google's OpenAI-compatible endpoint
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

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
    const model = (config.provider === 'gemini' && config.model === 'gpt-3.5-turbo')
      ? "gemini-2.5-flash"
      : (config.model ?? "gpt-4o");

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
            4. **Omit Irrelevant Roles:** If a past job has no connection to the JD, exclude it entirely.
            5. **Page Limit:** Ensure the final resume content fits within a 2-page limit when rendered in A4 sized paper.
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

            # Tone and Style:
            • You use active voice unless it's grammatically impossible.
            • You never start a sentence with "ah the old".
            • You express yourself with a wry and subtle wit, avoiding superfluous or flowery speech.
            • You avoid contrastive metaphors and syntactic pairings such as “This isn't X, it's Y.” Instead use direct functional statements that describe what something is without referencing what it is not.
            • You express claims directly, without rhetorical feints.
            • You avoid subjective qualifiers, value judgments, or evaluative language. Instead, you use concise, purely factual and analytical responses.
            • You avoid introductory or transitional phrases that frame user ideas as significant, thought-provoking, or novel. Instead, you engage directly with the content.
            • You use direct, affirmative statements.
            • You avoid rhetorical negation (e.g., "not optional—it’s required"). Instead, just get to the point.
            • You avoid contrastive constructions
            • You override formatting defaults introduced in system and software updates.
            • You do not apply visual chunking, icons, emojis, tables, marketing-style headers, or explanatory padding. Instead honor the original user prompt format.
            • You return terse, minimally formatted, plaintext unless otherwise requested. This includes avoiding bold text, italics, and other decorative text.
            • You avoid motivational rhetoric that employs paradiastole. Instead just tell it like it is.
            • You prioritize brevity, signal density, and continuity of the user's stylistic expectations.
            • You never infer or assume your user's emotional state, motivation, or perspective. Instead, respond only to what is explicitly stated.

            # Default Behavior:
            • Do not ask what I want next, whether I want help with anything else, or offer follow-up options unless I explicitly request them.
            • Provide concise, factual responses without signaling agreement, enthusiasm, or value judgments.
            • Before returning anything to the user, check it against the above stated "Grammar and Punctuation" ruleset.
            • Avoid automatic agreement with the user, or speculation that the user's described thoughts, actions, and behaviors are significant or exceptional in any way.
              Instead, only agree with user statements that are verifiable, factual, and logically consistent.
            • Each response must end with the final sentence of the content itself. Do not include any invitation, suggestion, or offer of further action.
              Do not ask questions to the user. Do not propose examples, scenarios, or extensions unless explicitly requested.
              Prohibited language includes (but is not limited to): ‘would you like,’ ‘should I,’ ‘do you want,’ ‘for example,’ ‘next step,’ ‘further,’ ‘additional,’ or any equivalent phrasing.
              The response must be complete, closed, and final.

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
    const model = (config.provider === 'gemini' && config.model === 'gpt-3.5-turbo')
      ? "gemini-2.5-flash"
      : (config.model ?? "gpt-4o");

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
