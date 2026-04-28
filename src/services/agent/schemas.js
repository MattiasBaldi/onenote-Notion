import * as z from "zod";

export const ServiceEnum = z.enum(["onenote", "notion"]);

export const TranslationPlanSchema = z.object({
  sourceService: ServiceEnum,
  targetService: ServiceEnum,
  sourceType: z.string().describe("The source artifact type, such as notebook, section, page, or block."),
  targetType: z.string().describe("The target artifact type, such as page, database entry, markdown, or block tree."),
  title: z.string(),
  summary: z.string(),
  canonicalMarkdown: z.string().describe("A normalized target ready markdown representation of the content."),
  targetPayload: z
    .record(z.any())
    .describe("A service-specific payload or patch plan that can be handed to the target adapter."),
  mappingNotes: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export const TranslationInputSchema = z.object({
  sourceService: ServiceEnum,
  targetService: ServiceEnum,
  sourceType: z.string(),
  inputFormat: z.enum(["json", "markdown", "html", "text"]),
  input: z.string(),
});
