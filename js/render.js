// render.js — Song rendering for 3 view modes
// Modes: 'text' | 'chords-inline' | 'chords-split'

let categoryLabels = {};

export function setCategoryLabels(categories) {
  categoryLabels = {};
  for (const cat of categories) {
    categoryLabels[cat.id] = cat.label;
  }
}

export function getCategoryLabel(id) {
  return categoryLabels[id] || id;
}

export function renderSong(song, mode) {
  const effectiveMode = getEffectiveMode(mode);

  const el = document.createElement('article');
  el.className = `song-view mode-${effectiveMode}`;

  // Header
  el.appendChild(renderHeader(song));

  if (effectiveMode === 'chords-split') {
    el.appendChild(renderSplit(song));
  } else {
    el.appendChild(renderVerses(song, effectiveMode));
  }

  return el;
}

function getEffectiveMode(mode) {
  if (mode === 'chords-split') {
    // Auto-downgrade to inline on narrow screens
    if (window.innerWidth < 768) return 'chords-inline';
  }
  return mode;
}

function renderHeader(song) {
  const header = document.createElement('header');
  header.className = 'song-header';

  const title = document.createElement('h1');
  title.textContent = song.title;

  const meta = document.createElement('div');
  meta.className = 'song-meta';

  const cat = document.createElement('span');
  cat.className = `cat-badge cat-${song.category}`;
  cat.textContent = getCategoryLabel(song.category);

  const key = document.createElement('span');
  key.className = 'song-key';
  key.textContent = `Tonacja: ${song.key}`;

  meta.appendChild(cat);
  meta.appendChild(key);
  header.appendChild(title);
  header.appendChild(meta);
  return header;
}

function renderVerses(song, mode) {
  const container = document.createElement('div');
  container.className = 'verses-container';

  for (const verse of song.verses) {
    const section = document.createElement('section');
    section.className = `verse verse-${verse.type}`;

    const label = document.createElement('div');
    label.className = 'verse-label';
    label.textContent = verse.label || '';
    section.appendChild(label);

    for (const line of verse.lines) {
      if (mode === 'text') {
        // Text only
        const lyricEl = document.createElement('p');
        lyricEl.className = 'lyric-line';
        lyricEl.textContent = line.text;
        section.appendChild(lyricEl);
      } else {
        // chords-inline: chord line above lyric line
        const pair = document.createElement('div');
        pair.className = 'chord-pair';

        const chordEl = document.createElement('div');
        chordEl.className = 'chord-line';
        chordEl.innerHTML = formatChords(line.chords);

        const lyricEl = document.createElement('div');
        lyricEl.className = 'lyric-line';
        lyricEl.textContent = line.text;

        pair.appendChild(chordEl);
        pair.appendChild(lyricEl);
        section.appendChild(pair);
      }
    }
    container.appendChild(section);
  }
  return container;
}

function renderSplit(song) {
  const wrapper = document.createElement('div');
  wrapper.className = 'split-wrapper';

  const lyricsPane = document.createElement('div');
  lyricsPane.className = 'split-pane split-lyrics';

  const chordsPane = document.createElement('div');
  chordsPane.className = 'split-pane split-chords';

  const lyricsLabel = document.createElement('div');
  lyricsLabel.className = 'split-pane-label';
  lyricsLabel.textContent = 'Słowa';
  lyricsPane.appendChild(lyricsLabel);

  const chordsLabel = document.createElement('div');
  chordsLabel.className = 'split-pane-label';
  chordsLabel.textContent = 'Akordy';
  chordsPane.appendChild(chordsLabel);

  for (const verse of song.verses) {
    const verseLabel = document.createElement('div');
    verseLabel.className = 'verse-label';
    verseLabel.textContent = verse.label || '';

    const verseLabelChords = verseLabel.cloneNode(true);

    lyricsPane.appendChild(verseLabel);
    chordsPane.appendChild(verseLabelChords);

    for (const line of verse.lines) {
      const lyricEl = document.createElement('p');
      lyricEl.className = 'lyric-line';
      lyricEl.textContent = line.text;
      lyricsPane.appendChild(lyricEl);

      const chordEl = document.createElement('p');
      chordEl.className = 'chord-line-split';
      chordEl.innerHTML = formatChords(line.chords);
      chordsPane.appendChild(chordEl);
    }
  }

  wrapper.appendChild(lyricsPane);
  wrapper.appendChild(chordsPane);
  return wrapper;
}

// Format chord string — bold chord names, dim dots
function formatChords(chordsStr) {
  if (!chordsStr) return '';
  return chordsStr.split(' ').map(token => {
    if (token === '.') {
      return '<span class="chord-dot">·</span>';
    }
    return `<span class="chord-name">${token}</span>`;
  }).join(' ');
}

export function renderSongList(songs, activeCategories) {
  const filtered = activeCategories.length
    ? songs.filter(s => activeCategories.includes(s.category))
    : songs;

  // Group by category
  const groups = {};
  for (const song of filtered) {
    if (!groups[song.category]) groups[song.category] = [];
    groups[song.category].push(song);
  }

  const container = document.createElement('div');
  container.className = 'song-list';

  for (const [cat, catSongs] of Object.entries(groups)) {
    const groupEl = document.createElement('div');
    groupEl.className = 'song-group';

    const groupLabel = document.createElement('h2');
    groupLabel.className = 'group-label';
    groupLabel.textContent = getCategoryLabel(cat);
    groupEl.appendChild(groupLabel);

    for (const song of catSongs.sort((a, b) => a.title.localeCompare(b.title, 'pl'))) {
      const item = document.createElement('button');
      item.className = 'song-item';
      item.dataset.id = song.id;
      item.innerHTML = `
        <span class="song-item-title">${song.title}</span>
        <span class="song-item-key">${song.key}</span>
      `;
      groupEl.appendChild(item);
    }
    container.appendChild(groupEl);
  }

  return container;
}

export function renderSearchResults(results) {
  const container = document.createElement('div');
  container.className = 'search-results';

  if (results.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = 'Brak wyników. Spróbuj inaczej.';
    container.appendChild(empty);
    return container;
  }

  for (const { song, snippet } of results) {
    const item = document.createElement('button');
    item.className = 'search-result-item';
    item.dataset.id = song.id;

    const title = document.createElement('div');
    title.className = 'result-title';
    title.textContent = song.title;

    const catBadge = document.createElement('span');
    catBadge.className = `cat-badge cat-${song.category}`;
    catBadge.textContent = getCategoryLabel(song.category);

    title.appendChild(catBadge);
    item.appendChild(title);

    if (snippet) {
      const snippetEl = document.createElement('div');
      snippetEl.className = 'result-snippet';

      for (const line of snippet) {
        const lineEl = document.createElement('div');
        lineEl.className = line.isMatch ? 'snippet-line match' : 'snippet-line';
        lineEl.textContent = line.text;
        snippetEl.appendChild(lineEl);
      }
      item.appendChild(snippetEl);
    }

    container.appendChild(item);
  }

  return container;
}
