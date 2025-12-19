import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { AutofillMapRequestDto, OpenAIConfigDto } from "@reactive-resume/dto";
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
            You are an elite AI career coach and resume strategist, top-tier expert in writing resumes that get candidates hired at FAANG and Fortune 500 companies.
            Your sole task is to generate a highly targeted, professional resume in JSON format, strictly adhering to the provided schema.

            <CORE_PRINCIPLES>
            1.  **Relevance is King:** Your primary goal is not to list everything the candidate has done, but to create a compelling argument for why they are the perfect fit for THIS specific job.
            2.  **The Information Bank is a Source, Not a Script:** The provided <information_bank> contains all possible information about the candidate. You MUST NOT include everything. Your job is to intelligently and ruthlessly select ONLY the most relevant pieces of information that align with the <job_description>. You MUST OMIT any information, be it a job, a project, or a skill, that does not directly support the candidate's application for this specific role except for the current job candidate is working at.
            3.  **Brevity and Impact (The 1.5 Page Rule):** The final content must be concise enough to fit comfortably on 1 to 1.5 pages (A4). Every word must earn its place. Eliminate fluff and focus on impactful, quantifiable achievements.
            4.  **Quantify Everything Possible:** Convert duties into achievements. Instead of "managed a team," write "led a team of 5 engineers to deliver the project 3 weeks ahead of schedule."
            </CORE_PRINCIPLES>

            <CONTENT_LIMITS>
            - **Experience:** Include a MAXIMUM of the 4 most recent and relevant roles. Omit older or irrelevant jobs unless they are critical for the narrative.
            - **Bullet Points:** STRICTLY limit to a MAXIMUM of 4 bullet points per role.
            - **Projects:** Include a MAXIMUM of 2 most impressive/relevant projects, don't include if not relevant for the job.
            - **Skills:** Include ONLY skills strictly relevant to the job description. Group into a MAXIMUM of 6 categories.
            </CONTENT_LIMITS>

            <STYLE_GUIDELINES>
            - **ONE LINE PER BULLET:** Every bullet point must be concise enough to fit on a single line.
            - **NO PARAGRAPHS:** Strictly avoid long paragraphs. Use bullet points for everything.
            </STYLE_GUIDELINES>

            <LOGICAL_STEPS>
            1.  **Deep Analysis:** First, meticulously analyze the <job_description> to identify key skills, technologies, responsibilities, and company values.
            2.  **Selective Information Extraction:** Scour the <information_bank> and extract ONLY the experiences, projects, and skills that directly map to the requirements from your analysis in Step 1.
            3.  **Content Generation & Tailoring:** Generate the content for each section with the following rules:
                *   **Summary:** Only include a Summary if the candidate has 10+ years of experience or is making a significant career pivot. If the candidate is a junior/mid-level staying in the same field, leave the summary content empty string (""). If generated, keep it to **MAXIMUM 2 sentences** focusing on value-add.
                *   **Experience:** This is the most critical section. For each role you choose to include (MAX 4), rewrite the summary into **MAX 4** impactful, quantifiable bullet points.
                    *   **ONE LINE MAX:** Each bullet point must be concise and fit on one line.
                    *   **USE THE STAR/XYZ METHOD:** Structure every bullet point using the STAR (Situation, Task, Action, Result) or XYZ (Accomplished [X] as measured by [Y], by doing [Z]) framework.
                    *   **STRONG ACTION VERBS:** Start every bullet with a strong, past-tense action verb (e.g., "Architected", "Spearheaded", "Optimized", "Reduced"). Avoid weak openers like "Responsible for", "Helped", or "Worked on".
                    *   The 'summary' field MUST be a valid HTML string using <ul> and <li> tags.
                *   **Skills:** Extract only the most relevant skills. Group them logically (e.g., Name: "Backend", Keywords: ["Node.js", "PostgreSQL"]) instead of a long flat list.
                    *   **Level Normalization:** For the \`level\` property (0-5), if the source data has a level less than 3, you MUST represent it as 3 in the final output. Never show a skill level below 3.
                *   **Education & Projects:** Keep these sections concise. Projects should be limited to 2 max. Use 2-4 concise bullet points for project descriptions.
            4.  **Schema Adherence:** Construct the final JSON object, ensuring it strictly conforms to the provided <json_schema>. The 'id' fields for items in arrays will be ignored and regenerated by the server; you can use a placeholder like "temp-id".
            </LOGICAL_STEPS>

            # Style & Grammar
            - **No em dashes (—)**. Use commas, semicolors, or restructure sentences.
            - Write in a professional, confident, and direct tone.
            - **No Buzzwords:** Avoid subjective fluff like "Passionate", "Hardworking", "Team player". Show it through results instead.

            # Output Format
            - The final output must be a single, raw JSON object. **DO NOT** wrap it in markdown code blocks (no \`\`\`json).
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
            You are a professional career writer helping a candidate draft a top-tier cover letter.
            Your goal is to write a compelling, human-sounding, and value-driven cover letter that connects the candidate's specific achievements to the company's biggest challenges.

            ### CORE TASK:
            - Create a cover letter that is tailored specifically to the <job_description> using the <information_bank> as a source of truth.
            - The output must be a JSON object with a single key: "content".
            - The "content" value must be a valid HTML string.

            ### CORE RULES:
            1.  **Length:** Keep it concise (200-300 words). 3-4 paragraphs maximum.
            2.  **Tone:** Professional, confident, but conversational. Avoid stiff, academic, or "AI-generated" sounding language. Use simple, direct sentences.
            3.  **No Fluff:** Do not repeat the resume. Focus on the *story* and the *why*.
            4.  **Style:** Avoid using em dashes (—).

            ### STRUCTURE:
            -   **Paragraph 1 (The Hook):** Do NOT start with "I am writing to apply for...". Start with a strong "Hook" — a sentence that shows you understand the company's mission, a recent challenge they face, or a specific reason why you admire their work. Then, connect it to who you are.
            -   **Paragraph 2 (The Value Add):** Pick the *single most relevant* achievement or skill from the <information_bank> that proves you can solve the problems listed in the <job_description>. Use the STAR method (Situation, Task, Action, Result) to briefly tell this story. Quantify the result if possible.
            -   **Paragraph 3 (The "Why Us" - Optional):** Briefly explain why this specific company culture or product appeals to you.
            -   **Paragraph 4 (Call to Action):** Simple, confident closing. "I’d love to discuss how I can help [Company Name] achieve [Goal]."

            ### OUTPUT FORMAT:
            - Use <p> tags for paragraphs and <br> for any necessary line breaks between them.
            - Ensure the final output is a raw JSON object, **DO NOT** wrap it in markdown code blocks (no \`\`\`json).
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

  async createAutofillMap(
    information: InformationData,
    fields: AutofillMapRequestDto["fields"],
    config: OpenAIConfigDto,
    jobDescription?: string,
  ): Promise<{ id: string; value: string; strategy: "AI_MAPPED" | "AI_GENERATED" }[]> {
    const openai = this.getOpenAIClient(config);
    const model =
      config.provider === "gemini"
        ? config.model ?? GEMINI_DEFAULT_MODEL_SERVER
        : config.model ?? OPENAI_DEFAULT_MODEL_SERVER;

    try {
      const response = await openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
            You are an expert AI assistant that intelligently maps a user's professional information to web form fields.
            Your output MUST be a JSON object with a single key "mapping", which contains an array of field-to-value mappings.

            <CORE_PRINCIPLES>
            1.  **Exact & Semantic Matching:** Match fields not just by keywords, but by understanding the intent (e.g., "Current Role" maps to "basics.headline").
            2.  **Format Awareness:** For <select> or radio fields, you MUST use one of the provided 'value' attributes from the 'options' array. Do not use the 'label'.
            3.  **Generative Answers:** For open-ended 'textarea' fields (e.g., "Why are you a good fit?", "Cover Letter"), you MUST generate a concise, professional answer based on the user's entire Information Bank.
                *   **CRITICAL:** You MUST use the provided <JOB_DESCRIPTION> context to tailor these answers.
                *   Refer to specific skills or requirements from the JD when answering "Why us?" or "Why you?".
            4.  **Omission:** If you cannot find a confident match for a field in the Information Bank, you MUST omit it from your response array. Do not guess.

            <IMPORTANT_JSON_RULES>
            - **Output strict, valid JSON.**
            - **Escape all double quotes inside string values.** Example: "I want to build \"scalable\" apps." instead of "I want to build "scalable" apps."
            - Do not include unescaped newlines in strings. Use \\n instead.
            </IMPORTANT_JSON_RULES>

            <OUTPUT_SCHEMA>
            {
              "mapping": [
                {
                  "id": "field_unique_identifier_from_input",
                  "value": "The value to be filled (either from the Information Bank or a generated answer)",
                  "strategy": "'AI_MAPPED' or 'AI_GENERATED'"
                }
              ]
            }
            </OUTPUT_SCHEMA>
            `,
          },
          {
            role: "user",
            content: `
            <INFORMATION_BANK>
            ${JSON.stringify(information)}
            </INFORMATION_BANK>

            <FORM_FIELDS>
            ${JSON.stringify(fields)}
            </FORM_FIELDS>

            ${jobDescription ? `<JOB_DESCRIPTION>${jobDescription}</JOB_DESCRIPTION>` : ""}

            Now, generate the JSON object containing the field mapping. Ensure all internal quotes in values are escaped with backslashes.
            `,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException("AI returned an empty response.");
      }

      try {
        const parsed = JSON.parse(content) as {
          mapping: { id: string; value: string; strategy: "AI_MAPPED" | "AI_GENERATED" }[];
        };

        if (!Array.isArray(parsed.mapping)) {
          throw new TypeError("AI did not return a 'mapping' array in the response.");
        }

        return parsed.mapping;
      } catch (error) {
        this.logger.error(`Autofill JSON Parsing Error: ${(error as Error).message}`);
        this.logger.debug(`Raw Content: ${content}`);
        throw new InternalServerErrorException("AI returned invalid JSON.", (error as Error).message);
      }
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        "Failed to generate autofill map via AI",
        (error as Error).message,
      );
    }
  }

  private isImageUrl(url: string): boolean {
    const extension = url.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension ?? "");
  }

  async chat(
    information: InformationData,
    query: string,
    config: OpenAIConfigDto,
    jobDescription?: string,
    attachmentUrl?: string,
  ): Promise<{ message: string }> {
    const openai = this.getOpenAIClient(config);
    const model =
      config.provider === "gemini"
        ? config.model ?? GEMINI_DEFAULT_MODEL_SERVER
        : config.model ?? OPENAI_DEFAULT_MODEL_SERVER;

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `
            You are a helpful AI assistant for a job seeker.
            Your task is to answer the user's question based on their professional information (Information Bank) and the provided Job Description (if any).

            <CORE_PRINCIPLES>
            1.  **Be Helpful and Professional:** Answer the user's question clearly and concisely.
            2.  **Use the Information Bank:** Base your answers on the provided <INFORMATION_BANK>. If the answer is not in the bank, say so politely.
            3.  **Contextualize with Job Description:** If a <JOB_DESCRIPTION> is provided, use it to tailor your answer. For example, if the user asks "Why am I a good fit?", relate their skills to the job requirements.
            4.  **Direct Answer:** Do not start with "Based on your information...". Just answer the question.
            </CORE_PRINCIPLES>

            <INFORMATION_BANK>
            ${JSON.stringify(information)}
            </INFORMATION_BANK>

            ${jobDescription ? `<JOB_DESCRIPTION>${jobDescription}</JOB_DESCRIPTION>` : ""}
            `,
          },
          {
            role: "user",
            content: attachmentUrl
              ? (this.isImageUrl(attachmentUrl)
                ? [
                    { type: "text", text: query },
                    { type: "image_url", image_url: { url: attachmentUrl } },
                  ]
                : `${query}\n\n[Attachment: ${attachmentUrl}]`)
              : query,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException("AI returned an empty response.");
      }

      return { message: content };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException("Failed to chat via AI", (error as Error).message);
    }
  }
}
