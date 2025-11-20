// apps/server/src/openai/openai.service.ts
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InformationData, ResumeData, resumeDataSchema } from "@reactive-resume/schema";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";

import { Config } from "../config/schema";

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService<Config>) {
    const apiKey = this.configService.get("OPENAI_API_KEY");
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateResume(
    information: InformationData,
    jobDescription: string,
  ): Promise<ResumeData> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.openai) {
      throw new InternalServerErrorException("OpenAI API key is not configured on the server.");
    }

    const schema = zodToJsonSchema(resumeDataSchema, "resumeDataSchema");

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // Or "gpt-4-turbo"
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert resume writer. Your task is to generate a professional resume in JSON format. The output MUST strictly adhere to the provided JSON schema. Use the user's information bank as the source of truth. Tailor the summary, experience descriptions, and skills to match the keywords and requirements in the job description. Do not invent information not present in the information bank.`,
        },
        {
          role: "user",
          content: `
            Here is the JSON schema the output must follow:
            ${JSON.stringify(schema)}

            Here is the user's information bank which is the source of truth:
            ${JSON.stringify(information)}

            Here is the job description to tailor the resume for:
            ${jobDescription}

            Now, generate the tailored resume JSON. Ensure all IDs are unique CUIDs.
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
      // Final validation before returning
      return resumeDataSchema.parse(parsedJson);
    } catch (error) {
      throw new InternalServerErrorException("AI returned invalid JSON.", error.message);
    }
  }
}
