#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ColumbiaSisParser, DEFAULT_BASE_URL, summarizeListing } from "./sis.js";

const parser = new ColumbiaSisParser({
  baseUrl: process.env.COLUMBIA_SIS_BASE_URL ?? DEFAULT_BASE_URL,
  headless: process.env.HEADLESS !== "false",
  timeoutMs: Number(process.env.COLUMBIA_SIS_TIMEOUT_MS ?? 30000)
});

const server = new McpServer({
  name: "columbia-sis",
  version: "0.1.0"
});

function asJson(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

const letterSchema = z.object({
  letter: z.string().min(1).max(1).describe("Alphabet letter to load, for example C.")
});

const listingSchema = z.object({
  code: z.string().min(2).describe("Subject or department code, for example COMS."),
  term: z.string().describe("Term label, for example Fall2026 or Fall 2026."),
  limit: z.number().int().positive().optional().describe("Optional max number of sections to return."),
  query: z.string().optional().describe("Optional case-insensitive filter across course titles, section titles, instructors, notes, and call numbers."),
  includePlainText: z.boolean().optional().describe("Include the plain-text listing page, when available.")
});

server.tool(
  "list_subjects",
  "List Columbia Directory of Classes subjects by first letter, including each subject code and available term URLs.",
  letterSchema.shape,
  async ({ letter }) => asJson(await parser.listIndex("subject", letter))
);

server.tool(
  "list_departments",
  "List Columbia Directory of Classes departments by first letter, including each department code and available term URLs.",
  letterSchema.shape,
  async ({ letter }) => asJson(await parser.listIndex("department", letter))
);

server.tool(
  "search_subjects",
  "Search subject names and subject codes. This may load multiple SIS index pages.",
  {
    query: z.string().min(1).describe("Subject name or code fragment, for example computer science or COMS."),
    limit: z.number().int().positive().optional().describe("Maximum matches to return. Defaults to 25.")
  },
  async ({ query, limit }) => asJson(await parser.searchIndex("subject", query, { limit }))
);

server.tool(
  "search_departments",
  "Search department names and department codes. This may load multiple SIS index pages.",
  {
    query: z.string().min(1).describe("Department name or code fragment, for example computer science or COMS."),
    limit: z.number().int().positive().optional().describe("Maximum matches to return. Defaults to 25.")
  },
  async ({ query, limit }) => asJson(await parser.searchIndex("department", query, { limit }))
);

server.tool(
  "get_subject_courses",
  "Parse a subject term listing into courses and sections.",
  listingSchema.shape,
  async ({ code, term, limit, query, includePlainText }) => {
    const listing = await parser.getListing("subject", code, term, { limit, query, includePlainText });
    return asJson(includePlainText ? listing : summarizeListing(listing));
  }
);

server.tool(
  "get_department_courses",
  "Parse a department term listing into courses and sections.",
  listingSchema.shape,
  async ({ code, term, limit, query, includePlainText }) => {
    const listing = await parser.getListing("department", code, term, { limit, query, includePlainText });
    return asJson(includePlainText ? listing : summarizeListing(listing));
  }
);

server.tool(
  "get_listing_by_url",
  "Parse any Columbia SIS course listing URL that contains table.course-listing.",
  {
    url: z.string().url().describe("A SIS subject or department listing URL."),
    limit: z.number().int().positive().optional(),
    query: z.string().optional(),
    includePlainText: z.boolean().optional()
  },
  async ({ url, limit, query, includePlainText }) => {
    const listing = await parser.getListingByUrl(url, { limit, query, includePlainText });
    return asJson(includePlainText ? listing : summarizeListing(listing));
  }
);

server.tool(
  "get_section_details",
  "Parse a SIS section detail page returned from a course listing.",
  {
    url: z.string().url().describe("A section URL, for example https://doc.sis.columbia.edu/subj/COMS/W3134-20263-001/.")
  },
  async ({ url }) => asJson(await parser.getSection(url))
);

server.tool(
  "get_plain_text_listing",
  "Return the SIS plain-text version of a subject or department listing.",
  {
    kind: z.enum(["subject", "department"]).describe("Whether to build a subject or department plain-text listing URL."),
    code: z.string().min(2),
    term: z.string()
  },
  async ({ kind, code, term }) => asJson(await parser.getPlainTextListing(kind, code, term))
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on("SIGINT", async () => {
  await parser.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await parser.close();
  process.exit(0);
});

main().catch(async (error) => {
  await parser.close();
  console.error(error);
  process.exit(1);
});
