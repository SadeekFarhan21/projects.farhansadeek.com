import { chromium } from "playwright";

export const DEFAULT_BASE_URL = "https://doc.sis.columbia.edu/";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function normalizeTerm(term) {
  const compact = cleanText(term).replace(/\s+/g, "");
  if (!/^(Fall|Spring|Summer)\d{4}$/i.test(compact)) {
    throw new Error(`Invalid term "${term}". Use values like Fall2026, Spring2026, or Summer2026.`);
  }

  return compact.replace(/^(fall|spring|summer)/i, (match) => {
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });
}

export function normalizeLetter(letter) {
  const value = cleanText(letter).toUpperCase();
  if (!/^[A-Z]$/.test(value)) {
    throw new Error(`Invalid letter "${letter}". Use A through Z.`);
  }

  return value;
}

export function normalizeKind(kind) {
  const value = cleanText(kind).toLowerCase();
  if (!["subject", "department"].includes(value)) {
    throw new Error(`Invalid kind "${kind}". Use "subject" or "department".`);
  }

  return value;
}

export function buildIndexPath(kind, letter) {
  const normalizedKind = normalizeKind(kind);
  const prefix = normalizedKind === "subject" ? "subj" : "dept";
  return `sel/${prefix}-${normalizeLetter(letter)}.html`;
}

export function buildListingPath(kind, code, term) {
  const normalizedKind = normalizeKind(kind);
  const normalizedCode = cleanText(code).toUpperCase();
  const normalizedTerm = normalizeTerm(term);

  if (!/^[A-Z0-9_]{2,8}$/.test(normalizedCode)) {
    throw new Error(`Invalid ${normalizedKind} code "${code}".`);
  }

  if (normalizedKind === "subject") {
    return `subj/${normalizedCode}/_${normalizedTerm}.html`;
  }

  return `sel/${normalizedCode}_${normalizedTerm}.html`;
}

export function parseEnrollment(enrollment) {
  const text = cleanText(enrollment);
  if (!text) return null;

  const studentsMatch = text.match(/(\d+)\s+students?/i);
  const maxMatch = text.match(/\((\d+)\s+max\)/i);
  const asOfMatch = text.match(/as of\s+(.+?)(?:\s+\/|$)/i);

  return {
    raw: text,
    enrolled: studentsMatch ? Number(studentsMatch[1]) : null,
    max: maxMatch ? Number(maxMatch[1]) : null,
    asOf: asOfMatch ? cleanText(asOfMatch[1]) : null,
    isFull: /(?:^|\/\s*)full\b/i.test(text)
  };
}

function inferEntryCode(url, kind) {
  if (kind === "subject") {
    const match = url.match(/\/subj\/([^/]+)\/_[^/]+\.html$/i);
    return match?.[1] ?? null;
  }

  const match = url.match(/\/sel\/([^/_]+)_[^/]+\.html$/i);
  return match?.[1] ?? null;
}

function inferTermFromUrl(url) {
  const match = url.match(/(?:_|-)(Fall|Spring|Summer)\d{4}\.html$/i);
  if (!match) {
    const fallback = url.match(/(Fall|Spring|Summer)\d{4}\.html$/i);
    return fallback ? normalizeTerm(fallback[0].replace(/\.html$/i, "")) : null;
  }

  return normalizeTerm(match[0].slice(1).replace(/\.html$/i, ""));
}

function parseCourseHeader(headerText) {
  const lines = String(headerText ?? "")
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);
  const summary = lines[0] ?? "";
  const title = lines.slice(1).join(" ") || null;
  const numberMatch = summary.match(/\s([A-Z]{1,4}\d{4}[A-Z]?)$/);
  const number = numberMatch?.[1] ?? null;
  const beforeNumber = number ? summary.slice(0, summary.length - number.length).trim() : summary;
  const termMatch = beforeNumber.match(/^(Fall|Spring|Summer)\s+(\d{4})\s+(.+)$/i);

  return {
    summary,
    term: termMatch ? normalizeTerm(`${termMatch[1]}${termMatch[2]}`) : null,
    groupName: termMatch ? cleanText(termMatch[3]) : null,
    number,
    title
  };
}

function enrichSection(section) {
  const fields = section.fields ?? {};
  const instructorValue = fields.Instructors ?? fields.Instructor ?? null;

  return {
    ...section,
    callNumber: fields["Call Number"] ?? null,
    points: fields.Points ?? null,
    enrollment: fields.Enrollment ?? null,
    enrollmentParsed: parseEnrollment(fields.Enrollment),
    instructors: instructorValue ? instructorValue.split(/\s+and\s+/i).map(cleanText).filter(Boolean) : [],
    notes: fields.Notes ?? null
  };
}

function filterCourses(courses, options = {}) {
  const limit = Number(options.limit ?? 0);
  const query = cleanText(options.query).toLowerCase();
  let filtered = courses;

  if (query) {
    filtered = courses
      .map((course) => ({
        ...course,
        sections: course.sections.filter((section) => {
          const haystack = [
            course.number,
            course.title,
            section.title,
            section.callNumber,
            section.fields?.Instructor,
            section.fields?.Instructors,
            section.fields?.Notes
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      }))
      .filter((course) => {
        const courseHaystack = [course.number, course.title, course.groupName].filter(Boolean).join(" ").toLowerCase();
        return course.sections.length > 0 || courseHaystack.includes(query);
      });
  }

  if (limit > 0) {
    let remaining = limit;
    filtered = filtered
      .map((course) => {
        if (remaining <= 0) return null;
        const sections = course.sections.slice(0, remaining);
        remaining -= sections.length;
        return { ...course, sections };
      })
      .filter(Boolean);
  }

  return filtered;
}

async function parseIndexPage(page, kind) {
  return page.evaluate((indexKind) => {
    const clean = (value) =>
      String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t\r\n]+/g, " ")
        .trim();

    const rows = Array.from(document.querySelectorAll("table.index tr")).slice(1);
    return rows
      .map((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 2) return null;

        const terms = Array.from(cells[1].querySelectorAll("a")).map((anchor) => {
          const url = new URL(anchor.getAttribute("href"), document.location.href).href;
          return {
            term: clean(anchor.textContent),
            url
          };
        });

        return {
          kind: indexKind,
          name: clean(cells[0].textContent),
          terms
        };
      })
      .filter(Boolean);
  }, kind);
}

async function parseCourseListingPage(page) {
  const listing = await page.evaluate(() => {
    const clean = (value) =>
      String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t\r\n]+/g, " ")
        .trim();

    const title = clean(document.querySelector("#header h1")?.textContent || document.title);
    const plainTextUrl = document.querySelector("#header a[href$='_text.html']")?.href ?? null;
    const footer = clean(document.querySelector("#footer")?.textContent);
    const table = document.querySelector("table.course-listing");
    const courses = [];
    let currentCourse = null;

    for (const row of Array.from(table?.querySelectorAll("tr") ?? [])) {
      const header = row.querySelector("th");
      if (header) {
        currentCourse = {
          headerText: header.innerText,
          sections: []
        };
        courses.push(currentCourse);
        continue;
      }

      const cells = row.querySelectorAll("td");
      const details = row.querySelector(".course-details");
      const sectionAnchor = cells[0]?.querySelector("a");
      if (!currentCourse || !details || !sectionAnchor) continue;

      const fields = {};
      for (const dt of Array.from(details.querySelectorAll("dt"))) {
        const key = clean(dt.textContent).replace(/:$/, "");
        let dd = dt.nextElementSibling;
        while (dd && dd.tagName !== "DD") dd = dd.nextElementSibling;
        fields[key] = clean(dd?.textContent);
      }

      currentCourse.sections.push({
        section: clean(sectionAnchor.textContent).replace(/^Section\s+/i, ""),
        sectionLabel: clean(sectionAnchor.textContent),
        sectionUrl: new URL(sectionAnchor.getAttribute("href"), document.location.href).href,
        title: clean(details.querySelector("h1")?.textContent),
        fields,
        vergilUrl: details.querySelector("a[href*='vergil/class']")?.href ?? null
      });
    }

    return {
      title,
      url: document.location.href,
      plainTextUrl,
      footer,
      courses
    };
  });

  const courses = listing.courses.map((course) => {
    const parsed = parseCourseHeader(course.headerText);
    return {
      ...parsed,
      headerText: course.headerText,
      sections: course.sections.map(enrichSection)
    };
  });

  return {
    ...listing,
    courses,
    courseCount: courses.length,
    sectionCount: courses.reduce((count, course) => count + course.sections.length, 0)
  };
}

async function parseSectionPage(page) {
  const section = await page.evaluate(() => {
    const clean = (value) =>
      String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t\r\n]+/g, " ")
        .trim();

    const fields = {};
    for (const row of Array.from(document.querySelectorAll("table.section tr"))) {
      const key = clean(row.querySelector("th")?.textContent);
      const value = clean(row.querySelector("td")?.textContent);
      if (key) fields[key] = value;
    }

    const meta = {};
    for (const node of Array.from(document.querySelectorAll("meta[name]"))) {
      meta[node.getAttribute("name")] = node.getAttribute("content") ?? "";
    }

    return {
      title: clean(document.querySelector("#section-header h1")?.textContent || document.title),
      heading: clean(document.querySelector("#section-header h2")?.textContent),
      url: document.location.href,
      fields,
      meta,
      vergilUrl: document.querySelector("a[href*='vergil/class']")?.href ?? null,
      footer: clean(document.querySelector("#footer")?.textContent)
    };
  });

  return {
    ...section,
    callNumber: section.fields["Call Number"] ?? null,
    points: section.fields.Points ?? null,
    instructor: section.fields.Instructor ?? section.fields.Instructors ?? null,
    enrollmentParsed: parseEnrollment(section.fields.Enrollment),
    courseDescription: section.fields["Course Description"] ?? null,
    methodOfInstruction: section.fields["Method of Instruction"] ?? null,
    subject: section.fields.Subject ?? null,
    number: section.fields.Number ?? null,
    section: section.fields.Section ?? null
  };
}

async function getPageText(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page.evaluate(() => {
    const clean = (value) => String(value ?? "").replace(/\u00a0/g, " ").trim();
    return {
      title: clean(document.querySelector("h1")?.textContent || document.title),
      url: document.location.href,
      text: clean(document.body?.innerText)
    };
  });
}

export class ColumbiaSisParser {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.headless = options.headless ?? true;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.browser = null;
    this.context = null;
  }

  async start() {
    if (this.browser) return;

    this.browser = await chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext({
      userAgent: "columbia-sis-mcp/0.1 (+https://doc.sis.columbia.edu parser)",
      viewport: { width: 1280, height: 900 }
    });
    this.context.setDefaultTimeout(this.timeoutMs);
  }

  async close() {
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    this.context = null;
    this.browser = null;
  }

  resolve(pathOrUrl) {
    return new URL(pathOrUrl, this.baseUrl).href;
  }

  async newPage() {
    await this.start();
    return this.context.newPage();
  }

  async listIndex(kind, letter) {
    const normalizedKind = normalizeKind(kind);
    const url = this.resolve(buildIndexPath(normalizedKind, letter));
    const page = await this.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const entries = await parseIndexPage(page, normalizedKind);
      const enriched = entries.map((entry) => {
        const terms = entry.terms.map((term) => ({
          ...term,
          term: normalizeTerm(term.term),
          code: inferEntryCode(term.url, normalizedKind)
        }));
        return {
          ...entry,
          code: terms.find((term) => term.code)?.code ?? null,
          terms
        };
      });

      return {
        kind: normalizedKind,
        letter: normalizeLetter(letter),
        url,
        count: enriched.length,
        entries: enriched
      };
    } finally {
      await page.close().catch(() => {});
    }
  }

  async searchIndex(kind, query, options = {}) {
    const normalizedKind = normalizeKind(kind);
    const normalizedQuery = cleanText(query).toLowerCase();
    if (!normalizedQuery) throw new Error("query is required.");

    const letters = options.letters?.length
      ? options.letters.map(normalizeLetter)
      : Array.from(new Set([normalizedQuery[0]?.toUpperCase(), ...LETTERS].filter((letter) => /^[A-Z]$/.test(letter))));
    const seen = new Set();
    const matches = [];

    for (const letter of letters) {
      const page = await this.listIndex(normalizedKind, letter);
      for (const entry of page.entries) {
        const haystack = `${entry.name} ${entry.code ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) continue;
        const key = `${entry.code}:${entry.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push(entry);
      }
    }

    return {
      kind: normalizedKind,
      query,
      count: matches.length,
      entries: matches.slice(0, Number(options.limit ?? 25))
    };
  }

  async getListing(kind, code, term, options = {}) {
    const url = this.resolve(buildListingPath(kind, code, term));
    return this.getListingByUrl(url, options);
  }

  async getListingByUrl(url, options = {}) {
    const page = await this.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const listing = await parseCourseListingPage(page);
      const courses = filterCourses(listing.courses, options);
      const result = {
        ...listing,
        courses,
        courseCount: courses.length,
        sectionCount: courses.reduce((count, course) => count + course.sections.length, 0)
      };

      if (options.includePlainText && listing.plainTextUrl) {
        result.plainText = await getPageText(page, listing.plainTextUrl);
      }

      return result;
    } finally {
      await page.close().catch(() => {});
    }
  }

  async getSection(url) {
    const page = await this.newPage();

    try {
      await page.goto(this.resolve(url), { waitUntil: "domcontentloaded" });
      return await parseSectionPage(page);
    } finally {
      await page.close().catch(() => {});
    }
  }

  async getPlainTextListing(kind, code, term) {
    const listingUrl = this.resolve(buildListingPath(kind, code, term).replace(/\.html$/i, "_text.html"));
    const page = await this.newPage();

    try {
      return await getPageText(page, listingUrl);
    } finally {
      await page.close().catch(() => {});
    }
  }
}

export function summarizeListing(listing) {
  return {
    title: listing.title,
    url: listing.url,
    courseCount: listing.courseCount,
    sectionCount: listing.sectionCount,
    courses: listing.courses.map((course) => ({
      number: course.number,
      title: course.title,
      sections: course.sections.map((section) => ({
        section: section.section,
        callNumber: section.callNumber,
        title: section.title,
        points: section.points,
        enrollment: section.enrollmentParsed,
        instructors: section.instructors,
        sectionUrl: section.sectionUrl,
        vergilUrl: section.vergilUrl
      }))
    }))
  };
}
