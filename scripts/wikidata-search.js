const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('Usage: npm run wikidata-search -- "person name"');
  process.exit(1);
}

async function search(query) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&limit=10`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.search || data.search.length === 0) {
    console.log('No results found.');
    return;
  }

  const ids = data.search.map(r => r.id).join('|');
  const detailUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&format=json&props=labels|descriptions|claims&languages=en`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  let found = false;
  for (const r of data.search) {
    const e = detailData.entities[r.id];
    const p31 = (e.claims?.P31 || []).map(c => c.mainsnak?.datavalue?.value?.id);
    if (!p31.includes('Q5')) continue;
    found = true;

    const label = e.labels?.en?.value || '?';
    const desc = e.descriptions?.en?.value || '';
    const birth = (e.claims?.P569 || []).map(c => c.mainsnak?.datavalue?.value?.time)?.[0] || '';
    const death = (e.claims?.P570 || []).map(c => c.mainsnak?.datavalue?.value?.time)?.[0] || '';
    const birthYear = birth ? birth.slice(1, 5) : '?';
    const deathYear = death ? death.slice(1, 5) : '?';

    console.log(`${r.id}  ${label}  (${birthYear}–${deathYear})  ${desc}`);
  }

  if (!found) {
    console.log('No person (Q5) entities found. All results were non-person items.');
  }
}

search(query);
