/**
 * Sync plan application to destination services
 */

import { createNotionClient, createPage as createNotionPage, updatePage } from "../services/notion/service.js";
import { getAccessToken } from "../services/onenote/auth.js";
import { createPage as createOneNotePage } from "../services/onenote/graph.js";

async function applyToNotion(plan, client, quiet = false) {
  const results = [];
  for (const item of plan.items) {
    if (item.action === "skip") {
      results.push({ itemId: item.itemId, skipped: true });
      continue;
    }
    const payload = item.targetPayload || {};
    if (item.action === "update" || payload.existingPageId || payload.page_id) {
      const pageId = payload.existingPageId || payload.page_id;
      const { existingPageId, page_id, ...updatePayload } = payload;
      const result = await updatePage(client, pageId, updatePayload);
      results.push({ itemId: item.itemId, result });
      continue;
    }
    const result = await createNotionPage(client, payload);
    results.push({ itemId: item.itemId, result });
    if (!quiet) {
      console.log(`Created Notion page for ${item.title}`);
    }
  }
  return results;
}

async function applyToOneNote(plan, token, quiet = false) {
  const results = [];
  for (const item of plan.items) {
    if (item.action === "skip") {
      results.push({ itemId: item.itemId, skipped: true });
      continue;
    }
    const payload = item.targetPayload || {};
    const sectionId = payload.sectionId;
    const html = payload.html || payload.xhtml || "";
    if (!sectionId) {
      throw new Error(`Missing destination sectionId for OneNote item ${item.itemId}`);
    }
    const result = await createOneNotePage(token, sectionId, html);
    results.push({ itemId: item.itemId, result });
    if (!quiet) {
      console.log(`Created OneNote page for ${item.title}`);
    }
  }
  return results;
}

export async function applySyncPlan(plan, { profile, quiet = false } = {}) {
  const results = [];
  const destination = profile?.destination || plan.destination;

  if (destination.service === "notion") {
    const client = createNotionClient(destination);
    return applyToNotion(plan, client, quiet);
  }

  if (destination.service === "onenote") {
    const token = await getAccessToken({
      token: process.env.ONENOTE_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN || destination.token,
      tenant: process.env.ONENOTE_TENANT_ID || process.env.MS_TENANT_ID || destination.tenant || "common",
      clientId: process.env.ONENOTE_CLIENT_ID || process.env.MS_CLIENT_ID || destination.clientId || "",
      scopes: destination.scopes,
      quiet: true,
    });

    return applyToOneNote(plan, token, quiet);
  }

  throw new Error(`Unsupported destination service: ${destination.service}`);
}
