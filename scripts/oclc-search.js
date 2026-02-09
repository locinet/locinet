#!/usr/bin/env node
// Search Open Library for OCLC numbers.
// Usage: node scripts/oclc-search.js "author" "title"

const author = process.argv[2];
const title = process.argv[3];
if (!author || !title) {
  console.error('Usage: npm run oclc-search -- "author" "title"');
  process.exit(1);
}

async function search(author, title) {
  const params = new URLSearchParams({
    author,
    title,
    limit: "10",
  });
  const url = `https://openlibrary.org/search.json?${params}`;
  console.error(`Searching Open Library...`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();

  if (!data.docs || data.docs.length === 0) {
    console.log("No results found.");
    return;
  }

  for (const doc of data.docs) {
    const docTitle = doc.title || "?";
    const authors = (doc.author_name || []).join(", ") || "?";
    const year = doc.first_publish_year || "?";
    const langs = (doc.language || []).join(", ") || "?";
    const oclcs = (doc.id_oclc || []).join(", ") || "none";
    const editions = doc.edition_count || 0;

    console.log(`  Title:     ${docTitle}`);
    console.log(`  Author:    ${authors}`);
    console.log(`  Year:      ${year}`);
    console.log(`  Languages: ${langs}`);
    console.log(`  OCLC:      ${oclcs}`);
    console.log(`  Editions:  ${editions}`);
    console.log();
  }

  // Print WorldCat search URL for manual follow-up
  const wcQuery = encodeURIComponent(`${author} ${title}`);
  console.log(`WorldCat: https://search.worldcat.org/search?q=${wcQuery}`);
}

search(author, title);
