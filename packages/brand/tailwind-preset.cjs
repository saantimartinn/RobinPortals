// Tailwind preset with the Project Robin brand (DESIGN.md). The apps keep
// their existing class names: the neutral and accent scales they use are
// remapped onto the three brand colours, so `slate-*` becomes navy mixed into
// cream, `amber-*` becomes the brand orange and `white` becomes paper, the
// near-white surface that sits on the cream page.
const navy = '#2D3A64';
const orange = '#ECB450';
const cream = '#FEFBE5';
const paper = '#FFFDF5'; // surfaces on the cream page (brand.css --robin-paper)

// Navy over cream. 400 is >= 3:1 on cream (icons, placeholders); 500 and up are
// >= 4.5:1 (text).
const ink = {
  50: '#F6F3E0',
  100: '#EDECDB',
  200: '#DFDED2',
  300: '#C3C5C1',
  400: '#8B919E',
  500: '#687088',
  600: '#4E5979',
  700: '#3C486D',
  800: navy,
  900: navy,
  950: navy,
};

// Orange over cream for fills. Text on these fills is navy (5.9:1 on orange);
// cream text on orange is never used (1.8:1).
const accent = {
  50: '#FCF2D3',
  100: '#FAE9C0',
  200: '#F6DBA2',
  300: '#F1C97D',
  400: '#EEBB5F',
  500: orange,
  600: navy, // amber-600 is used for text, and orange text on cream is unreadable
  700: navy,
  800: navy,
  900: navy,
  950: navy,
};

module.exports = {
  theme: {
    extend: {
      colors: {
        navy,
        orange: accent,
        cream,
        paper,
        slate: ink,
        gray: ink,
        sky: ink,
        blue: ink,
        amber: accent,
        yellow: accent,
        white: paper,
        black: navy,
      },
      fontFamily: {
        display: ['"Robin Display"', 'Oswald', 'Impact', 'sans-serif'],
        serif: ['"Robin Subtitle"', '"Bodoni Moda"', 'Georgia', 'serif'],
        sans: ['"Robin Text"', 'Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
