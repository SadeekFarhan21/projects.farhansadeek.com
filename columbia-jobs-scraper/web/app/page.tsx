"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, string>;

const COLUMNS: { key: string; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "department", label: "Department" },
  { key: "location", label: "Location" },
  { key: "eligibility", label: "Eligibility" },
  { key: "terms", label: "Terms" },
  { key: "commitment", label: "Commitment" },
  { key: "hours_per_week", label: "Hours/wk" },
  { key: "contact_emails", label: "Contacts" },
  { key: "description", label: "Description" },
];

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        /* skip */
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function shortDept(name: string): string {
  return name
    .replace(/^Department of /i, "")
    .replace(/^Dept of /i, "")
    .replace(/^Dept /i, "")
    .replace(/ and /gi, " & ")
    .trim();
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= 220) return <>{text || "—"}</>;
  return (
    <>
      {expanded ? text : text.slice(0, 220) + "…"}
      <br />
      <button className="expand-btn" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "collapse" : "expand"}
      </button>
    </>
  );
}

function EligibilityTicks({ value }: { value: string }) {
  const eligible = new Set(value.split(";").map((s) => s.trim()).filter(Boolean));
  if (eligible.size === 0) return <span className="muted">—</span>;
  return (
    <div className="tick-grid">
      {CLASS_YEARS.map((year) => {
        const on = eligible.has(year);
        return (
          <div key={year} className={`tick-row${on ? " on" : ""}`} title={year}>
            <span className="tick">{on ? "✓" : "·"}</span>
            <span className="tick-label">{year[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

function DisciplineTags({ value }: { value: string }) {
  const items = value.split(";").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return <span className="muted">—</span>;
  return (
    <>
      {items.map((t, i) => (
        <span key={i} className="tag">
          {t}
        </span>
      ))}
    </>
  );
}

function DepartmentTag({ value }: { value: string }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <span className="tag dept" title={value}>
      {shortDept(value)}
    </span>
  );
}

function ContactsList({ value }: { value: string }) {
  const emails = value.split(";").map((s) => s.trim()).filter(Boolean);
  if (emails.length === 0) return <span className="muted">—</span>;
  return (
    <>
      {emails.map((e, i) => (
        <span key={i}>
          <a href={`mailto:${e}`}>{e}</a>
          {i < emails.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
}

const DEFAULT_HIDDEN = new Set<string>(["location"]);

export default function Page() {
  const [data, setData] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [eligYears, setEligYears] = useState<Set<string>>(new Set());
  const [showEligPicker, setShowEligPicker] = useState(false);
  const [commit, setCommit] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState(1);
  const [hidden, setHidden] = useState<Set<string>>(DEFAULT_HIDDEN);
  const [showColPicker, setShowColPicker] = useState(false);

  function toggleEligYear(year: string) {
    setEligYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  const visibleCols = useMemo(
    () => COLUMNS.filter((c) => !hidden.has(c.key)),
    [hidden],
  );

  function toggleCol(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    fetch("/columbia_full_dump.csv")
      .then((r) => r.text())
      .then((text) => {
        const rows = parseCSV(text);
        const headers = rows.shift() || [];
        const parsed = rows
          .filter((r) => r.length > 1 && r.some(Boolean))
          .map((r) => {
            const obj: Row = {};
            headers.forEach((h, i) => (obj[h] = (r[i] || "").trim()));
            return obj;
          });
        setData(parsed);
        setLoaded(true);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const depts = useMemo(() => uniqSorted(data.map((r) => r.department)), [data]);
  const commits = useMemo(() => uniqSorted(data.map((r) => r.commitment)), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let rows = data.filter((r) => {
      if (dept && r.department !== dept) return false;
      if (eligYears.size > 0) {
        const rowYears = r.eligibility.split(";").map((s) => s.trim());
        const matches = rowYears.some((y) => eligYears.has(y));
        if (!matches) return false;
      }
      if (commit && r.commitment !== commit) return false;
      if (q && !Object.values(r).join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = (a[sortKey] || "").toLowerCase();
        const bv = (b[sortKey] || "").toLowerCase();
        if (av < bv) return -1 * sortDir;
        if (av > bv) return 1 * sortDir;
        return 0;
      });
    }
    return rows;
  }, [data, search, dept, eligYears, commit, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  return (
    <div className="wrap">
      <header className="site">
        <div>
          <h1>Columbia Undergraduate Research Positions</h1>
        </div>
        <a className="dl" href="/columbia_full_dump.csv" download>
          Download CSV
        </a>
      </header>

      <div className="controls">
        <input
          className="search"
          type="search"
          placeholder="Search title, department, lab, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {depts.map((d) => (
            <option key={d} value={d}>
              {d.length > 60 ? d.slice(0, 60) + "…" : d}
            </option>
          ))}
        </select>
        <div className="col-picker-wrap">
          <button
            className="dl"
            onClick={() => setShowEligPicker((s) => !s)}
            aria-expanded={showEligPicker}
          >
            {eligYears.size === 0
              ? "All eligibility"
              : `Eligibility: ${[...eligYears].sort((a, b) => CLASS_YEARS.indexOf(a as typeof CLASS_YEARS[number]) - CLASS_YEARS.indexOf(b as typeof CLASS_YEARS[number])).join(", ")}`}
          </button>
          {showEligPicker && (
            <div className="col-picker" role="menu">
              <label className="col-picker-item">
                <input
                  type="checkbox"
                  checked={eligYears.size === 0}
                  onChange={() => setEligYears(new Set())}
                />
                <span>All</span>
              </label>
              {CLASS_YEARS.map((y) => {
                const checked = eligYears.has(y);
                return (
                  <label key={y} className="col-picker-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEligYear(y)}
                    />
                    <span>{y}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <select value={commit} onChange={(e) => setCommit(e.target.value)}>
          <option value="">All commitments</option>
          {commits.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="count">
          {loaded ? `${filtered.length} / ${data.length} shown` : "loading…"}
        </span>
        <div className="col-picker-wrap">
          <button
            className="dl"
            onClick={() => setShowColPicker((s) => !s)}
            aria-expanded={showColPicker}
          >
            Columns ({visibleCols.length}/{COLUMNS.length})
          </button>
          {showColPicker && (
            <div className="col-picker" role="menu">
              {COLUMNS.map((c) => {
                const checked = !hidden.has(c.key);
                return (
                  <label key={c.key} className="col-picker-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCol(c.key)}
                    />
                    <span>{c.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {visibleCols.map((col) => (
                <th key={col.key} onClick={() => toggleSort(col.key)}>
                  {col.label}
                  <span className="sort-ind">
                    {sortKey === col.key ? (sortDir > 0 ? "↑" : "↓") : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td className="loading" colSpan={visibleCols.length}>
                  Failed to load CSV: {error}
                </td>
              </tr>
            )}
            {!error && !loaded && (
              <tr>
                <td className="loading" colSpan={visibleCols.length}>
                  Loading…
                </td>
              </tr>
            )}
            {!error && loaded && filtered.length === 0 && (
              <tr>
                <td className="loading" colSpan={visibleCols.length}>
                  No matches.
                </td>
              </tr>
            )}
            {filtered.map((r, idx) => (
              <tr key={r.url || idx}>
                {visibleCols.map((col) => {
                  const v = (r[col.key] || "").trim();
                  if (col.key === "title") {
                    return (
                      <td key={col.key} className="title-cell">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer">
                            {v || "(untitled)"}
                          </a>
                        ) : (
                          v
                        )}
                      </td>
                    );
                  }
                  if (col.key === "department") {
                    return (
                      <td key={col.key} className="dept-cell">
                        <DepartmentTag value={v} />
                      </td>
                    );
                  }
                  if (col.key === "eligibility") {
                    return (
                      <td key={col.key}>
                        <EligibilityTicks value={v} />
                      </td>
                    );
                  }
                  if (col.key === "disciplines") {
                    return (
                      <td key={col.key}>
                        <DisciplineTags value={v} />
                      </td>
                    );
                  }
                  if (col.key === "contact_emails") {
                    return (
                      <td key={col.key}>
                        <ContactsList value={v} />
                      </td>
                    );
                  }
                  if (col.key === "description") {
                    return (
                      <td key={col.key} className="desc">
                        <Description text={v} />
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className={v ? "" : "muted"}>
                      {v || "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer>
        <a href="/columbia_full_dump.csv">columbia_full_dump.csv</a> · client-side
        rendered.
      </footer>
    </div>
  );
}
