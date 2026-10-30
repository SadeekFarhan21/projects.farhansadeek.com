/**
 * Inlines @xterm/xterm + @xterm/addon-fit (no CDN).
 * A DOM #mirror <pre> mirrors buffer height + link hit targets; text is transparent so the
 * visible xterm canvas shows through. #mirror-root scroll drives term.scrollToLine (not xterm touch scroll).
 * http(s) URLs in the mirror are linkified; taps post openUrl to React Native.
 * document paste (capture): forwards clipboard text to term.paste for OS paste while typing.
 * Run: node scripts/bundle-xterm-html.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "assets", "terminal");
const outFile = path.join(outDir, "xterm-bundle.html");

const xtermCss = fs.readFileSync(
  path.join(root, "node_modules", "@xterm", "xterm", "css", "xterm.css"),
  "utf8"
);
const xtermJs = fs.readFileSync(
  path.join(root, "node_modules", "@xterm", "xterm", "lib", "xterm.js"),
  "utf8"
);
const fitJs = fs.readFileSync(
  path.join(root, "node_modules", "@xterm", "addon-fit", "lib", "addon-fit.js"),
  "utf8"
);
const initJs = `
(function () {
  var FONT_SIZE = 12;
  var MIRROR_LINE_HEIGHT = Math.ceil(FONT_SIZE * 1.23);
  var MAX_BUFFER_LINES = 8000;
  var mirrorDrop = 0;
  function post(obj) {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    } catch (e) {}
  }
  window.addEventListener("error", function (e) {
    var msg = String((e && e.message) || "");
    // "Script error." is the generic cross-origin noise per HTML spec — never a real terminal failure.
    if (!msg || msg === "Script error.") return;
    post({ t: "error", m: msg });
  });
  var term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: FONT_SIZE,
    lineHeight: 1.23,
    scrollback: 5000,
    theme: {
      background: "#0A0A0A",
      foreground: "#D4D4D4",
      cursor: "#00FF88",
    },
    allowProposedApi: true,
  });
  var FitAddonCtor = (typeof FitAddon === "function") ? FitAddon : FitAddon.FitAddon;
  var fit = new FitAddonCtor();
  term.loadAddon(fit);
  term.open(document.getElementById("t"));
  var mirrorRoot = document.getElementById("mirror-root");
  var mirrorPre = document.getElementById("mirror");
  var termHost = document.getElementById("t");
  if (termHost) {
    termHost.style.pointerEvents = "none";
  }
  var mirrorSyncScheduled = false;
  var userMirrorScroll = false;
  var mirrorScrollEndTimer = null;
  function focusTerm() {
    try {
      term.focus();
    } catch (e) {}
  }
  window.__treenaFocus = focusTerm;
  function syncMirrorScrollFromTerm() {
    if (!mirrorRoot || userMirrorScroll) return;
    try {
      var buf = term.buffer.active;
      var vy = buf.viewportY;
      var ml = Math.max(0, vy - mirrorDrop);
      mirrorRoot.scrollTop = ml * MIRROR_LINE_HEIGHT;
    } catch (e) {}
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function linkifyLine(line) {
    var re = /\\bhttps?:\\/\\/[^\\s<]+/gi;
    var out = "";
    var last = 0;
    var m;
    var text = String(line);
    while ((m = re.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, m.index));
      var raw = m[0];
      var trimm = raw.replace(/[.,;:!?)\\]]+$/g, "");
      var suffix = raw.slice(trimm.length);
      try {
        var pu = new URL(trimm);
        if (pu.protocol !== "http:" && pu.protocol !== "https:") {
          out += escapeHtml(raw);
        } else {
          out +=
            '<a class="treena-mirror-url" href="' +
            escapeHtml(trimm) +
            '">' +
            escapeHtml(trimm) +
            "</a>" +
            escapeHtml(suffix);
        }
      } catch (e) {
        out += escapeHtml(raw);
      }
      last = m.index + raw.length;
    }
    out += escapeHtml(text.slice(last));
    return out;
  }
  function reinsertWraps(html, offsets) {
    if (!offsets.length) return html;
    var result = "";
    var visibleCount = 0;
    var oi = 0;
    var inTag = false;
    var k = 0;
    for (; k < html.length && oi < offsets.length; k++) {
      if (html[k] === "<") inTag = true;
      if (!inTag) {
        if (visibleCount === offsets[oi]) {
          result += "\\n";
          oi++;
        }
        if (html[k] === "&") {
          var semi = html.indexOf(";", k);
          if (semi > k && semi - k < 8) {
            result += html.slice(k, semi + 1);
            k = semi;
            visibleCount++;
            continue;
          }
        }
        visibleCount++;
      }
      result += html[k];
      if (html[k] === ">") inTag = false;
    }
    while (oi < offsets.length) { result += "\\n"; oi++; }
    if (k < html.length) result += html.slice(k);
    return result;
  }
  function syncMirror() {
    mirrorSyncScheduled = false;
    if (!mirrorPre) return;
    try {
      var buf = term.buffer.active;
      var n = buf.length;
      mirrorDrop = Math.max(0, n - MAX_BUFFER_LINES);
      var logicals = [];
      var cur = { text: "", wrapOffsets: [] };
      for (var i = mirrorDrop; i < n; i++) {
        var bline = buf.getLine(i);
        var lt = bline ? bline.translateToString(true) : "";
        if (bline && bline.isWrapped) {
          cur.wrapOffsets.push(cur.text.length);
          cur.text += lt;
        } else {
          if (i > mirrorDrop) logicals.push(cur);
          cur = { text: lt, wrapOffsets: [] };
        }
      }
      logicals.push(cur);
      // Merge URL continuations across hard line breaks
      for (var k = logicals.length - 2; k >= 0; k--) {
        var thisT = logicals[k].text;
        var nextT = logicals[k + 1].text;
        if (/https?:\\/\\/[^\\s]*[&=%\\/\\-_~+:?]$/.test(thisT) &&
            /^[A-Za-z0-9&=%\\-_.+\\/~:[\\]@!$'()*,;#]+/.test(nextT)) {
          logicals[k].text = thisT + nextT;
          logicals[k].wrapOffsets.push(thisT.length);
          for (var w = 0; w < logicals[k+1].wrapOffsets.length; w++) {
            logicals[k].wrapOffsets.push(thisT.length + logicals[k+1].wrapOffsets[w]);
          }
          logicals.splice(k + 1, 1);
        }
      }
      var outParts = [];
      for (var j = 0; j < logicals.length; j++) {
        var linked = linkifyLine(logicals[j].text);
        outParts.push(reinsertWraps(linked, logicals[j].wrapOffsets));
      }
      mirrorPre.innerHTML = outParts.join("\\n");
      syncMirrorScrollFromTerm();
    } catch (e) {}
  }
  function scheduleMirrorSync() {
    if (mirrorSyncScheduled) return;
    mirrorSyncScheduled = true;
    requestAnimationFrame(syncMirror);
  }
  term.onWriteParsed(function () {
    scheduleMirrorSync();
  });
  term.onScroll(function () {
    scheduleMirrorSync();
  });
  term.onResize(function () {
    scheduleMirrorSync();
  });
  if (mirrorRoot) {
    mirrorRoot.addEventListener(
      "scroll",
      function () {
        userMirrorScroll = true;
        if (mirrorScrollEndTimer) clearTimeout(mirrorScrollEndTimer);
        mirrorScrollEndTimer = setTimeout(function () {
          userMirrorScroll = false;
        }, 200);
        try {
          var buf = term.buffer.active;
          var ml = Math.max(0, Math.floor(mirrorRoot.scrollTop / MIRROR_LINE_HEIGHT));
          var bufLine = mirrorDrop + ml;
          var maxL = Math.max(0, buf.length - 1);
          term.scrollToLine(Math.min(maxL, bufLine));
        } catch (e) {}
      },
      { passive: true }
    );
  }
  function bindMirrorTouchFocus(el) {
    if (!el) return;
    el.addEventListener(
      "touchend",
      function () {
        focusTerm();
      },
      { passive: true }
    );
  }
  bindMirrorTouchFocus(mirrorRoot);
  bindMirrorTouchFocus(mirrorPre);
  if (mirrorRoot) {
    mirrorRoot.addEventListener("click", function (ev) {
      var a =
        ev.target &&
        ev.target.closest &&
        ev.target.closest("a.treena-mirror-url");
      if (a) {
        ev.preventDefault();
        ev.stopPropagation();
        var href = a.getAttribute("href");
        if (href) post({ t: "openUrl", url: String(href) });
        return;
      }
      focusTerm();
    });
  }
  function sendResize() {
    try {
      fit.fit();
      var pd = fit.proposeDimensions();
      if (pd && pd.cols > 0 && pd.rows > 0) {
        post({ t: "resize", cols: pd.cols, rows: pd.rows });
      }
      scheduleMirrorSync();
    } catch (e) {}
  }
  term.onData(function (d) {
    post({ t: "in", d: d });
  });
  document.addEventListener(
    "paste",
    function (ev) {
      try {
        var cd = ev.clipboardData;
        if (!cd) return;
        var text = cd.getData("text/plain");
        if (text == null || text === "") return;
        ev.preventDefault();
        ev.stopPropagation();
        term.paste(text);
      } catch (e) {}
    },
    true
  );
  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(function () {
      sendResize();
    });
    ro.observe(document.getElementById("wrap"));
  }
  window.addEventListener("load", sendResize);
  setTimeout(sendResize, 50);
  setTimeout(sendResize, 300);
  post({ t: "ready" });
  setTimeout(function () { post({ t: "ready" }); }, 100);
  setTimeout(function () { post({ t: "ready" }); }, 500);
  scheduleMirrorSync();
  window.__treenaWrite = function (b64) {
    try {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      term.write(text);
    } catch (e) {}
  };
  window.__treenaReset = function () {
    try {
      term.reset();
    } catch (e) {}
  };
  window.__treenaSetFontSize = function (px) {
    try {
      var size = Math.max(8, Math.min(24, Number(px) || 12));
      FONT_SIZE = size;
      term.options.fontSize = size;
      MIRROR_LINE_HEIGHT = Math.ceil(size * 1.23);
      if (mirrorPre) {
        mirrorPre.style.fontSize = size + "px";
      }
      fit.fit();
      scheduleMirrorSync();
      sendResize();
    } catch (e) {}
  };
})();
`;

const extraCss = `
html,body{margin:0;height:100%;background:#0A0A0A;overflow:hidden;}
#wrap{
  position:absolute;
  inset:0;
  padding:2px;
  box-sizing:border-box;
  overflow:hidden;
}
#mirror-root{
  position:absolute;
  inset:0;
  overflow:auto;
  -webkit-overflow-scrolling:touch;
  touch-action:pan-y;
  z-index:2;
  background:transparent;
}
#mirror{
  margin:0;
  min-height:100%;
  box-sizing:border-box;
  font-family:Menlo,Monaco,"Courier New",monospace;
  font-size:12px;
  line-height:1.23;
  color:transparent;
  -webkit-text-fill-color:transparent;
  background:transparent;
  white-space:pre;
  overflow-wrap:normal;
  word-break:normal;
  user-select:none;
  -webkit-user-select:none;
  padding:0 2px 80px;
}
#mirror a.treena-mirror-url{
  color:#79b8ff;
  -webkit-text-fill-color:#79b8ff;
  text-decoration:underline;
  user-select:text;
  -webkit-user-select:text;
  pointer-events:auto;
  cursor:pointer;
  touch-action:manipulation;
  padding:6px 2px;
  margin:-6px -2px;
}
#t{
  position:absolute;
  inset:0;
  height:100%;
  width:100%;
  z-index:1;
  pointer-events:none;
}
`;

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<style>${xtermCss}</style>
<style>${extraCss}</style>
</head>
<body>
<div id="wrap">
  <div id="t"></div>
  <div id="mirror-root">
    <pre id="mirror"></pre>
  </div>
</div>
<script>${xtermJs}</script>
<script>${fitJs}</script>
<script>${initJs}</script>
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html, "utf8");
console.log("Wrote", outFile);

const tsExport = `// Auto-generated by scripts/bundle-xterm-html.mjs — do not edit.\nexport default ${JSON.stringify(html)};\n`;
const tsFile = path.join(outDir, "xterm-bundle-html.ts");
fs.writeFileSync(tsFile, tsExport, "utf8");
console.log("Wrote", tsFile);
