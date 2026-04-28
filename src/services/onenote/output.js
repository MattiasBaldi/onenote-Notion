import fs from "node:fs/promises";
import path from "node:path";
import {
  extractResourceUrls,
  getNotebook,
  getPage,
  getPageContent,
  getSection,
  graphRequest,
  listNotebookSections,
  listSectionPages,
} from "./graph.js";

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function writeText(filePath, data) {
  await fs.writeFile(filePath, data, "utf8");
}

export async function writeBinary(filePath, buffer) {
  await fs.writeFile(filePath, Buffer.from(buffer));
}

export function safeName(input) {
  const value = String(input || "untitled")
    .normalize("NFKD")
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return value.length ? value.replace(/\s/g, "_") : "untitled";
}

export function uniqueName(base, used) {
  const root = base || "untitled";
  let candidate = root;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${root}-${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

export function inferExtension(contentType, fallback = ".bin") {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  const map = new Map([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/jpg", ".jpg"],
    ["image/gif", ".gif"],
    ["image/webp", ".webp"],
    ["application/pdf", ".pdf"],
    ["text/plain", ".txt"],
    ["application/json", ".json"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ]);
  return map.get(type) || fallback;
}

export async function downloadPageResources(token, html, assetsDir, pageId) {
  await ensureDir(assetsDir);
  const urls = extractResourceUrls(html);
  const downloads = [];

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const binary = await graphRequest(token, url, { binary: true });
    const ext = inferExtension(binary.contentType);
    const fileName = `${String(index + 1).padStart(3, "0")}${ext}`;
    const filePath = path.join(assetsDir, fileName);
    await writeBinary(filePath, binary.arrayBuffer);
    downloads.push({
      url,
      fileName,
      contentType: binary.contentType,
      pageId,
    });
  }

  return downloads;
}

export async function exportNotebookTree({
  token,
  notebook,
  outDir,
  quiet = false,
}) {
  const notebookSections = await listNotebookSections(token, notebook.id);
  const notebookSlug = `${safeName(notebook.displayName)}__${notebook.id.slice(0, 8)}`;
  const notebookDir = path.join(outDir, notebookSlug);
  const sectionsDir = path.join(notebookDir, "sections");
  await ensureDir(sectionsDir);

  const notebookRecord = {
    ...notebook,
    pages: [],
  };
  const sectionNames = new Set();

  for (const section of notebookSections) {
    const sectionPages = await listSectionPages(token, section.id);
    const sectionSlug = uniqueName(
      `${safeName(section.displayName)}__${section.id.slice(0, 8)}`,
      sectionNames,
    );
    const sectionDir = path.join(sectionsDir, sectionSlug);
    const pagesDir = path.join(sectionDir, "pages");
    await ensureDir(pagesDir);
    await writeJson(path.join(sectionDir, "section.json"), section);

    const pageNames = new Set();
    for (const page of sectionPages) {
      const pageSlug = uniqueName(
        `${safeName(page.title)}__${page.id.slice(0, 8)}`,
        pageNames,
      );
      const pageDir = path.join(pagesDir, pageSlug);
      const assetsDir = path.join(pageDir, "assets");
      await ensureDir(pageDir);

      const pageHtml = await getPageContent(token, page.id);
      const resources = await downloadPageResources(token, pageHtml, assetsDir, page.id);

      await writeJson(path.join(pageDir, "page.json"), {
        ...page,
        notebookId: notebook.id,
        notebookName: notebook.displayName,
        sectionId: section.id,
        sectionName: section.displayName,
        resources,
      });
      await writeText(path.join(pageDir, "page.html"), pageHtml);

      notebookRecord.pages.push({
        id: page.id,
        title: page.title,
        sectionId: section.id,
        sectionName: section.displayName,
        path: path.relative(notebookDir, pageDir),
      });
    }
  }

  await writeJson(path.join(notebookDir, "notebook.json"), {
    ...notebook,
    pageCount: notebookRecord.pages.length,
  });

  if (!quiet) {
    console.log(`Exported ${notebook.displayName}`);
  }

  return {
    notebook,
    notebookDir,
    pageCount: notebookRecord.pages.length,
    sectionCount: notebookSections.length,
  };
}

export async function fetchNotebookDetails(token, notebookId) {
  const notebook = await getNotebook(token, notebookId);
  const sections = await listNotebookSections(token, notebookId);
  const sectionDetails = [];

  for (const section of sections) {
    const pages = await listSectionPages(token, section.id);
    sectionDetails.push({
      ...section,
      pageCount: pages.length,
      pages: pages.map((page) => ({
        id: page.id,
        title: page.title,
        createdDateTime: page.createdDateTime,
        lastModifiedDateTime: page.lastModifiedDateTime,
      })),
    });
  }

  return {
    ...notebook,
    sectionCount: sectionDetails.length,
    sections: sectionDetails,
  };
}

export async function fetchSectionDetails(token, sectionId) {
  const section = await getSection(token, sectionId);
  const pages = await listSectionPages(token, sectionId);

  return {
    ...section,
    pageCount: pages.length,
    pages,
  };
}

export async function fetchPageDetails(token, pageId) {
  const [page, html] = await Promise.all([getPage(token, pageId), getPageContent(token, pageId)]);

  return {
    ...page,
    html,
    resourceUrls: extractResourceUrls(html),
  };
}
