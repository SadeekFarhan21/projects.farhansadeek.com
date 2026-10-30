#!/usr/bin/env node
import { ColumbiaSisParser, summarizeListing } from "./sis.js";

function usage() {
  console.error(`Usage:
  node src/cli.js subjects <letter>
  node src/cli.js departments <letter>
  node src/cli.js courses <code> <term> [--department] [--limit n] [--query text]
  node src/cli.js section <url>`);
  process.exit(1);
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

const [command, ...args] = process.argv.slice(2);
if (!command) usage();

const parser = new ColumbiaSisParser();

try {
  if (command === "subjects") {
    const [letter] = args;
    if (!letter) usage();
    console.log(JSON.stringify(await parser.listIndex("subject", letter), null, 2));
  } else if (command === "departments") {
    const [letter] = args;
    if (!letter) usage();
    console.log(JSON.stringify(await parser.listIndex("department", letter), null, 2));
  } else if (command === "courses") {
    const [code, term] = args;
    if (!code || !term) usage();
    const kind = args.includes("--department") ? "department" : "subject";
    const limit = readOption(args, "--limit");
    const query = readOption(args, "--query");
    const listing = await parser.getListing(kind, code, term, {
      limit: limit ? Number(limit) : undefined,
      query: query ?? undefined
    });
    console.log(JSON.stringify(summarizeListing(listing), null, 2));
  } else if (command === "section") {
    const [url] = args;
    if (!url) usage();
    console.log(JSON.stringify(await parser.getSection(url), null, 2));
  } else {
    usage();
  }
} finally {
  await parser.close();
}
