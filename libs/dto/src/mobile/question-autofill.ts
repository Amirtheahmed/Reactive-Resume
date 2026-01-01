// libs/dto/src/mobile/question-autofill.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

// =============================================================================
// Question Types
// =============================================================================

/**
 * Supported question/input types for dynamic form filling
 */
export const questionTypeSchema = z.enum([
  "text",
  "textarea",
  "select",
  "multiselect",
  "date",
  "number",
  "boolean",
  "email",
  "phone",
  "url",
]);

export type QuestionType = z.infer<typeof questionTypeSchema>;

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * A single question to be answered by the AI
 */
export const questionItemSchema = z.object({
  /** Unique identifier for the question (used to match answers) */
  id: z.string().min(1),

  /** The question text (e.g., "What is your highest level of education?") */
  question: z.string().min(1),

  /** The expected answer type */
  type: questionTypeSchema.default("text"),

  /** Available options for select/multiselect types */
  options: z.array(z.string()).optional(),

  /** Additional context (placeholder text, help text, field description) */
  context: z.string().optional(),

  /** Whether the question requires an answer */
  required: z.boolean().default(false),

  /** Maximum length for text/textarea answers */
  maxLength: z.number().positive().optional(),

  /** Category/section grouping (e.g., "education", "work_history", "personal") */
  category: z.string().optional(),
});

export type QuestionItem = z.infer<typeof questionItemSchema>;

/**
 * Extended job context for better answer personalization
 */
export const questionJobContextSchema = z.object({
  /** Job title */
  title: z.string().optional(),

  /** Company name */
  company: z.string().optional(),

  /** Full job description */
  description: z.string().optional(),

  /** Job posting URL */
  url: z.string().url().optional(),

  /** Industry sector */
  industry: z.string().optional(),

  /** Job location */
  location: z.string().optional(),

  /** Employment type (full-time, part-time, contract, etc.) */
  employmentType: z.string().optional(),

  /** Experience level required */
  experienceLevel: z.string().optional(),

  /** Key skills or requirements extracted from the job posting */
  keyRequirements: z.array(z.string()).optional(),
});

export type QuestionJobContext = z.infer<typeof questionJobContextSchema>;

/**
 * Request body for question-based autofill
 */
export const questionAutofillRequestSchema = z.object({
  /** Array of questions to answer */
  questions: z.array(questionItemSchema).min(1).max(50),

  /** Job context for personalized answers */
  job_context: questionJobContextSchema.optional(),

  /** Page URL where the questions were found (for logging/debugging) */
  page_url: z.string().url().optional(),

  /** Additional instructions for the AI (e.g., "Keep answers brief", "Use formal tone") */
  instructions: z.string().max(500).optional(),
});

export class QuestionAutofillRequestDto extends createZodDto(questionAutofillRequestSchema) {}

// =============================================================================
// Response Schemas
// =============================================================================

/**
 * Strategy used to generate the answer
 */
export const answerStrategySchema = z.enum([
  /** Direct mapping from user profile (highest confidence) */
  "DETERMINISTIC",
  /** AI mapped from user data to answer format */
  "AI_MAPPED",
  /** AI generated content based on context */
  "AI_GENERATED",
  /** Intelligent default when no direct data available */
  "SMART_DEFAULT",
  /** Unable to answer - needs user input */
  "SKIPPED",
]);

export type AnswerStrategy = z.infer<typeof answerStrategySchema>;

/**
 * A single answer to a question
 */
export const questionAnswerSchema = z.object({
  /** The question ID this answer corresponds to */
  question_id: z.string(),

  /**
   * The answer value
   * - string for text/textarea/select/date/email/phone/url
   * - string[] for multiselect
   * - number for number type
   * - boolean for boolean type
   * - null if skipped/unable to answer
   */
  value: z.union([z.string(), z.array(z.string()), z.number(), z.boolean(), z.null()]),

  /** Confidence score (0.0 - 1.0) */
  confidence: z.number().min(0).max(1),

  /** Strategy used to generate this answer */
  strategy: answerStrategySchema,

  /** Optional explanation of how/why this answer was generated */
  reasoning: z.string().optional(),

  /** Source field from user profile (e.g., "basics.email", "experience[0].company") */
  source_field: z.string().optional(),
});

export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;

/**
 * A question that needs manual review/input
 */
export const needsReviewQuestionSchema = z.object({
  /** The question ID */
  question_id: z.string(),

  /** The original question text */
  question: z.string(),

  /** Why this question needs review */
  reason: z.string(),

  /** Confidence score (typically < 0.6) */
  confidence: z.number().min(0).max(1),

  /** Suggested answers if any */
  suggestions: z.array(z.string()).optional(),

  /** The question category if provided */
  category: z.string().optional(),
});

export type NeedsReviewQuestion = z.infer<typeof needsReviewQuestionSchema>;

/**
 * Response metadata
 */
export const questionAutofillMetadataSchema = z.object({
  /** Total questions received */
  questions_received: z.number(),

  /** Questions successfully answered (confidence >= threshold) */
  questions_answered: z.number(),

  /** Questions that need review (confidence < threshold) */
  questions_needs_review: z.number(),

  /** Questions skipped (no applicable data) */
  questions_skipped: z.number(),

  /** AI model used for generation */
  ai_model_used: z.string(),

  /** Processing time in milliseconds */
  processing_time_ms: z.number(),

  /** Average confidence across all answers */
  average_confidence: z.number().min(0).max(1).optional(),
});

export type QuestionAutofillMetadata = z.infer<typeof questionAutofillMetadataSchema>;

/**
 * Complete response for question-based autofill
 */
export const questionAutofillResponseSchema = z.object({
  /** Successfully generated answers (confidence >= 0.6) */
  answers: z.array(questionAnswerSchema),

  /** Questions that need manual review (confidence < 0.6) */
  needs_review: z.array(needsReviewQuestionSchema),

  /** Warning messages (e.g., "Some questions may have incomplete answers") */
  warnings: z.array(z.string()),

  /** Response metadata */
  metadata: questionAutofillMetadataSchema,
});

export class QuestionAutofillResponseDto extends createZodDto(questionAutofillResponseSchema) {}

export type QuestionAutofillResponse = z.infer<typeof questionAutofillResponseSchema>;
