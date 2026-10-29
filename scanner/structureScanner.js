/**
 * Structure Scanner — analyses HTML document structure.
 * Checks headings, semantic elements, metadata completeness.
 */

const StructureScanner = {
  name: 'structure',

  scan() {
    try {
      // Heading analysis
      const h1s = Array.from(document.querySelectorAll('h1'));
      const h2s = Array.from(document.querySelectorAll('h2'));
      const h3s = Array.from(document.querySelectorAll('h3'));
      const h4s = Array.from(document.querySelectorAll('h4'));
      const h5s = Array.from(document.querySelectorAll('h5'));
      const h6s = Array.from(document.querySelectorAll('h6'));

      const headings = [
        ...h1s.map(h => ({ level: 1, text: h.textContent.trim().substring(0, 100) })),
        ...h2s.map(h => ({ level: 2, text: h.textContent.trim().substring(0, 100) })),
        ...h3s.map(h => ({ level: 3, text: h.textContent.trim().substring(0, 100) })),
        ...h4s.map(h => ({ level: 4, text: h.textContent.trim().substring(0, 100) })),
        ...h5s.map(h => ({ level: 5, text: h.textContent.trim().substring(0, 100) })),
        ...h6s.map(h => ({ level: 6, text: h.textContent.trim().substring(0, 100) })),
      ];

      // Check for skipped heading levels
      const headingLevelsPresent = [...new Set(headings.map(h => h.level))].sort();
      const skippedLevels = StructureScanner._findSkippedLevels(headingLevelsPresent, h1s.length);

      // Semantic landmark elements
      const landmarks = {
        header: document.querySelectorAll('header').length,
        main: document.querySelectorAll('main').length,
        nav: document.querySelectorAll('nav').length,
        footer: document.querySelectorAll('footer').length,
        aside: document.querySelectorAll('aside').length,
        section: document.querySelectorAll('section').length,
        article: document.querySelectorAll('article').length,
      };

      // Lists
      const lists = {
        ul: document.querySelectorAll('ul').length,
        ol: document.querySelectorAll('ol').length,
        dl: document.querySelectorAll('dl').length,
      };

      // Tables
      const tables = document.querySelectorAll('table').length;
      const tablesWithCaption = document.querySelectorAll('table caption').length;

      // Figure/figcaption
      const figures = document.querySelectorAll('figure').length;
      const figcaptions = document.querySelectorAll('figcaption').length;

      // Interactive elements
      const buttons = document.querySelectorAll('button').length;
      const details = document.querySelectorAll('details').length;
      const dialogs = document.querySelectorAll('dialog').length;

      // iFrames
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: f.getAttribute('src') ? f.getAttribute('src').substring(0, 150) : null,
        title: f.getAttribute('title') || null,
        sandbox: f.getAttribute('sandbox') || null,
        hasTitleAttr: !!f.getAttribute('title'),
      }));

      return {
        headings: {
          h1Count: h1s.length,
          h2Count: h2s.length,
          h3Count: h3s.length,
          h4Count: h4s.length,
          h5Count: h5s.length,
          h6Count: h6s.length,
          total: headings.length,
          items: headings,
          skippedLevels,
          multipleH1: h1s.length > 1,
          noH1: h1s.length === 0,
        },
        landmarks,
        lists,
        tables,
        tablesWithCaption,
        figures,
        figcaptions,
        buttons,
        details,
        dialogs,
        iframes,
        hasMain: landmarks.main > 0,
        hasNav: landmarks.nav > 0,
        hasHeader: landmarks.header > 0,
        hasFooter: landmarks.footer > 0,
      };
    } catch (err) {
      return { error: err.message };
    }
  },

  _findSkippedLevels(levelsPresent, h1Count) {
    if (levelsPresent.length < 2) return [];
    const skipped = [];

    // Check if levels jump (e.g. h1 then h3 with no h2)
    for (let i = 1; i < levelsPresent.length; i++) {
      const gap = levelsPresent[i] - levelsPresent[i - 1];
      if (gap > 1) {
        for (let s = levelsPresent[i - 1] + 1; s < levelsPresent[i]; s++) {
          skipped.push(s);
        }
      }
    }
    return skipped;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StructureScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.StructureScanner = StructureScanner;
}
