// search.js — Fuzzy search with snippet extraction

let fuse = null;
let _songs = [];

export function initSearch(songs) {
  _songs = songs;

  fuse = new Fuse(songs, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'verses.lines.text', weight: 1 }
    ],
    threshold: 0.8,          // tolerates typos
    includeMatches: true,    // needed for snippet highlighting
    minMatchCharLength: 2,
    ignoreLocation: true,    // search anywhere in the text
    useExtendedSearch: false
  });
}

export function search(query) {
  if (!fuse || !query || query.trim().length < 2) return [];

  const results = fuse.search(query.trim());

  return results.map(result => ({
    song: result.item,
    snippet: extractSnippet(result.item, result.matches, query)
  }));
}

// Extract a context snippet from the matched line ±2 lines around it
function extractSnippet(song, matches, query) {
  if (!matches || matches.length === 0) return null;

  // Find a match in verse lines (not just title)
  const lineMatch = matches.find(m => m.key === 'verses.lines.text');
  if (!lineMatch) return null;

  // Collect all lines flat with their indices
  const allLines = [];
  for (const verse of song.verses) {
    for (const line of verse.lines) {
      allLines.push(line.text);
    }
  }

  // Find which line was matched
  const matchedText = lineMatch.value;
  const matchedIndex = allLines.findIndex(l => l === matchedText);
  if (matchedIndex === -1) return null;

  // Grab ±2 lines around match
  const start = Math.max(0, matchedIndex - 2);
  const end = Math.min(allLines.length - 1, matchedIndex + 2);
  const context = allLines.slice(start, end + 1);

  // Highlight the matched line
  const highlighted = context.map((line, i) => {
    const isMatch = start + i === matchedIndex;
    return { text: line, isMatch };
  });

  return highlighted;
}

export function getCategories(songs) {
  const cats = new Set(songs.map(s => s.category));
  return Array.from(cats).sort();
}

export function filterByCategories(songs, activeCategories) {
  if (!activeCategories || activeCategories.length === 0) return songs;
  return songs.filter(s => activeCategories.includes(s.category));
}
