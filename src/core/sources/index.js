/**
 * Source item collection coordinator
 */

import { collectOneNoteSourceItems } from "./onenote.js";
import { collectNotionSourceItems } from "./notion.js";

export async function collectSourceItems(profile, overrides = {}) {
  const sourceService = overrides.source?.service || profile.source.service;

  if (sourceService === "onenote") {
    return collectOneNoteSourceItems(profile, overrides);
  }
  if (sourceService === "notion") {
    return collectNotionSourceItems(profile, overrides);
  }

  throw new Error(`Unsupported source service: ${sourceService}`);
}
