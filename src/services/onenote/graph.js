import { GRAPH_ROOT } from "./constants.js";

export async function graphRequest(token, url, { binary = false } = {}) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: binary ? "*/*" : "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph request failed for ${url}: ${res.status} ${res.statusText}\n${text}`);
  }

  if (binary) {
    return {
      arrayBuffer: await res.arrayBuffer(),
      contentType: res.headers.get("content-type") || "application/octet-stream",
      contentDisposition: res.headers.get("content-disposition") || "",
    };
  }

  return res.json();
}

export async function graphGetAll(token, url) {
  const items = [];
  let nextUrl = url;
  while (nextUrl) {
    const data = await graphRequest(token, nextUrl);
    if (Array.isArray(data.value)) {
      items.push(...data.value);
    } else {
      throw new Error(`Expected collection response from ${nextUrl}`);
    }
    nextUrl = data["@odata.nextLink"] || null;
  }
  return items;
}

export function listNotebooks(token) {
  return graphGetAll(
    token,
    `${GRAPH_ROOT}/me/onenote/notebooks?$top=100&$select=id,displayName,isDefault,isShared,userRole`,
  );
}

export function listNotebookSections(token, notebookId) {
  return graphGetAll(
    token,
    `${GRAPH_ROOT}/me/onenote/notebooks/${notebookId}/sections?$top=100&$select=id,displayName,self`,
  );
}

export function listSectionPages(token, sectionId) {
  return graphGetAll(
    token,
    `${GRAPH_ROOT}/me/onenote/sections/${sectionId}/pages?$top=100&$select=id,title,createdDateTime,lastModifiedDateTime,self&$expand=parentNotebook($select=id,displayName),parentSection($select=id,displayName,self)`,
  );
}

export function getNotebook(token, notebookId) {
  return graphRequest(token, `${GRAPH_ROOT}/me/onenote/notebooks/${notebookId}`);
}

export function getSection(token, sectionId) {
  return graphRequest(token, `${GRAPH_ROOT}/me/onenote/sections/${sectionId}`);
}

export function getPage(token, pageId) {
  return graphRequest(token, `${GRAPH_ROOT}/me/onenote/pages/${pageId}`);
}

export async function getPageContent(token, pageId) {
  const res = await fetch(`${GRAPH_ROOT}/me/onenote/pages/${pageId}/content?includeIDs=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/html",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch page content for ${pageId}: ${res.status} ${text}`);
  }

  return res.text();
}

export async function createPage(token, sectionId, html) {
  const res = await fetch(`${GRAPH_ROOT}/me/onenote/sections/${sectionId}/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/xhtml+xml",
      Accept: "application/json",
    },
    body: html,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create OneNote page in section ${sectionId}: ${res.status} ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export function extractResourceUrls(html) {
  const urls = new Set();
  const patterns = [
    /data-fullres-src="([^"]+)"/g,
    /data-src="([^"]+)"/g,
    /data="([^"]+)"/g,
    /src="([^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = match[1];
      if (/^https:\/\/graph\.microsoft\.com\//i.test(url)) {
        urls.add(url);
      }
    }
  }

  return [...urls];
}
