import { Client } from "@notionhq/client";

const DEFAULT_NOTION_VERSION = process.env.NOTION_VERSION || "2026-03-11";

export function createNotionClient({
  auth = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN,
  notionVersion = DEFAULT_NOTION_VERSION,
} = {}) {
  if (!auth) {
    throw new Error(
      "Missing Notion auth token. Set NOTION_API_KEY or NOTION_TOKEN, or pass auth explicitly.",
    );
  }

  return new Client({
    auth,
    notionVersion,
  });
}

export async function search(client, params = {}) {
  return client.search(params);
}

export async function getPage(client, pageId) {
  return client.pages.retrieve({ page_id: pageId });
}

export async function getPageMarkdown(client, pageId) {
  return client.pages.retrieveMarkdown({ page_id: pageId });
}

export async function createPage(client, params) {
  return client.pages.create(params);
}

export async function updatePage(client, pageId, params = {}) {
  return client.pages.update({
    page_id: pageId,
    ...params,
  });
}

export async function updatePageMarkdown(client, pageId, markdown) {
  return client.pages.updateMarkdown({
    page_id: pageId,
    markdown,
  });
}

export async function trashPage(client, pageId) {
  return client.pages.update({
    page_id: pageId,
    in_trash: true,
  });
}

export async function restorePage(client, pageId) {
  return client.pages.update({
    page_id: pageId,
    in_trash: false,
  });
}

export async function listBlockChildren(client, blockId) {
  return client.blocks.children.list({ block_id: blockId });
}

export async function appendBlockChildren(client, blockId, children) {
  return client.blocks.children.append({
    block_id: blockId,
    children,
  });
}
