import { Context7 } from "@upstash/context7-sdk";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const SERVICE_LIBRARY_IDS = {
  notion: "/websites/developers_notion_reference",
  onenote: "/microsoftgraph/microsoft-graph-docs-contrib",
};

const DEFAULT_QUERIES = {
  notion:
    "How should content be formatted when creating or updating Notion pages? Focus on blocks, rich text, page properties, markdown, and limitations that matter for translation.",
  onenote:
    "How should content be formatted when creating or updating OneNote pages through Microsoft Graph? Focus on XHTML body content, supported HTML elements and inline styles, and limitations that matter for translation.",
};

let context7Client;

function getContext7Client() {
  if (!context7Client) {
    context7Client = new Context7({
      apiKey:
        process.env.CONTEXT7_API_KEY ||
        process.env.CONTEXT7_KEY ||
        process.env.CONTEXT7_TOKEN,
    });
  }

  return context7Client;
}

function clampText(text, maxLength = 14000) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

async function fetchContext7Docs({ service, query }) {
  const libraryId = SERVICE_LIBRARY_IDS[service];
  if (!libraryId) {
    throw new Error(`Unknown service: ${service}`);
  }

  const client = getContext7Client();
  const searchQuery = query || DEFAULT_QUERIES[service];
  const docs = await client.getContext(searchQuery, libraryId, { type: "txt" });

  const rendered = Array.isArray(docs) ? docs.join("\n\n") : String(docs || "");
  if (!rendered.trim()) {
    return `Context7 returned no documentation for ${service} (${libraryId}).`;
  }

  return [
    `Library: ${libraryId}`,
    `Query: ${searchQuery}`,
    "",
    clampText(rendered),
  ].join("\n");
}

export const readServiceDocsTool = tool(
  async ({ service, query }) => fetchContext7Docs({ service, query }),
  {
    name: "read_service_docs",
    description:
      "Read current formatting and API guidance for OneNote or Notion from Context7.",
    schema: z.object({
      service: z.enum(["onenote", "notion"]),
      query: z
        .string()
        .optional()
        .describe("A focused Context7 query about the formatting or API behavior needed."),
    }),
  },
);
