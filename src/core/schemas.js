import * as z from "zod";
import { ServiceEnum } from "../services/agent/schemas.js";

const TimestampSchema = z.string().datetime().or(z.string().min(1)).optional();

export const SyncSelectionSchema = z.object({
  notebookIds: z.array(z.string()).default([]),
  sectionIds: z.array(z.string()).default([]),
  pageIds: z.array(z.string()).default([]),
  titleIncludes: z.array(z.string()).default([]),
  query: z.string().optional(),
  modifiedAfter: TimestampSchema,
  createdAfter: TimestampSchema,
  limitPages: z.number().int().positive().optional(),
});

export const SyncEndpointSchema = z.object({
  service: ServiceEnum,
  parentPageId: z.string().optional(),
  databaseId: z.string().optional(),
  sectionId: z.string().optional(),
  notebookId: z.string().optional(),
});

export const SyncLimitsSchema = z.object({
  maxNotebooks: z.number().int().positive().optional(),
  maxSectionsPerNotebook: z.number().int().positive().optional(),
  maxPagesPerSection: z.number().int().positive().optional(),
  maxPages: z.number().int().positive().optional(),
  maxPayloadChars: z.number().int().positive().optional(),
});

export const SyncAgentSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().optional(),
  sourceContextQuery: z.string().optional(),
  destinationContextQuery: z.string().optional(),
  title: z.string().optional(),
});

export const SyncProfileSchema = z.object({
  source: SyncEndpointSchema,
  destination: SyncEndpointSchema,
  selection: SyncSelectionSchema.optional(),
  limits: SyncLimitsSchema.optional(),
  agent: SyncAgentSchema.optional(),
  agents: z.record(SyncAgentSchema).optional(),
  schedule: z.any().optional(),
  debug: z.any().optional(),
});

export const SyncItemPlanSchema = z.object({
  itemId: z.string(),
  title: z.string(),
  sourceService: ServiceEnum,
  destinationService: ServiceEnum,
  sourceType: z.string(),
  destinationType: z.string(),
  action: z.enum(["create", "update", "skip"]).default("create"),
  summary: z.string(),
  canonicalMarkdown: z.string(),
  targetPayload: z.any(),
  warnings: z.array(z.string()).default([]),
  mappingNotes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export const SyncPlanSchema = z.object({
  profileName: z.string(),
  source: SyncEndpointSchema,
  destination: SyncEndpointSchema,
  selection: SyncSelectionSchema,
  limits: SyncLimitsSchema,
  agent: SyncAgentSchema.optional(),
  itemCount: z.number().int().nonnegative(),
  items: z.array(SyncItemPlanSchema),
  warnings: z.array(z.string()).default([]),
});

export const BatchSyncItemPlanSchema = z.array(SyncItemPlanSchema);
