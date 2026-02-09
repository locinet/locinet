#!/usr/bin/env node
// Extract PDF outline (table of contents) with page numbers.
// Usage: node scripts/extract-pdf-toc.js <path-or-url>
// Output: JSON array of {title, page, depth, children[]}

const fs = require("fs");
const { PDFParse } = require("pdf-parse");

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: node scripts/extract-pdf-toc.js <path-or-url>");
    process.exit(1);
  }

  let dataBuffer;
  if (pdfPath.startsWith("http://") || pdfPath.startsWith("https://")) {
    console.error(`Downloading ${pdfPath}...`);
    const res = await fetch(pdfPath);
    if (!res.ok) {
      console.error(`Download failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    dataBuffer = new Uint8Array(await res.arrayBuffer());
    console.error(`Downloaded ${dataBuffer.length} bytes`);
  } else {
    if (!fs.existsSync(pdfPath)) {
      console.error(`File not found: ${pdfPath}`);
      process.exit(1);
    }
    dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
  }
  const parser = new PDFParse(dataBuffer);
  await parser.load();
  const info = await parser.getInfo();

  // Build obj-num → page-number map from the internal pdfjs document
  const objToPage = {};
  let doc = null;
  for (const key of Object.getOwnPropertyNames(parser)) {
    const val = parser[key];
    if (val && typeof val === "object" && typeof val.getPage === "function") {
      doc = val;
      break;
    }
  }
  if (doc) {
    for (let i = 1; i <= info.total; i++) {
      try {
        const page = await doc.getPage(i);
        if (page && page.ref) {
          objToPage[page.ref.num] = i;
        }
      } catch (e) {
        // skip
      }
    }
  }

  const hasPages = Object.keys(objToPage).length > 0;

  function getPage(dest) {
    if (!hasPages || !dest || !dest[0] || typeof dest[0] !== "object") return null;
    return objToPage[dest[0].num] || null;
  }

  function buildTree(items) {
    const result = [];
    for (const item of items) {
      const title = (item.title || "").trim();
      if (!title) continue;
      const page = getPage(item.dest);
      const children =
        item.items && item.items.length > 0 ? buildTree(item.items) : [];
      result.push({ title, page, children });
    }
    return result;
  }

  const outline = info.outline ? buildTree(info.outline) : [];

  if (outline.length === 0) {
    console.error("No outline/bookmarks found in this PDF.");
    process.exit(1);
  }

  // Print both JSON (for programmatic use) and a readable tree (for quick reference)
  const mode = process.argv[3];
  if (mode === "--json") {
    console.log(JSON.stringify(outline, null, 2));
  } else {
    // Default: human-readable tree
    function printTree(nodes, depth) {
      for (const node of nodes) {
        const indent = "  ".repeat(depth);
        const pg = node.page ? `[p.${node.page}]` : "[?]";
        console.log(`${pg.padEnd(8)}${indent}${node.title}`);
        if (node.children.length > 0) {
          printTree(node.children, depth + 1);
        }
      }
    }
    console.log(`Pages: ${info.total}`);
    console.log(`Title: ${info.info.Title || "(none)"}`);
    console.log("---");
    printTree(outline, 0);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
