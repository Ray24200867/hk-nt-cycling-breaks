# How to edit this website

The site is a static HTML page. There is **no build step for ordinary text or
design edits**: change the file, save it, refresh the browser.

Open `index.html` in Chrome, then use **View → Reload Page** or `Cmd + Shift + R`
after CSS changes.

---

## 1. Which file does what

| File | What to edit there |
| --- | --- |
| `index.html` | All story text, headline, standfirst, byline, chart titles and numbers, map captions, data notes, AI note, corrections |
| `assets/css/style.css` | Colours, fonts, type sizes, spacing, page width, mobile breakpoints |
| `assets/js/site.js` | Map zoom/pan, tooltips, estate detail panel, table filters and sorting |
| `assets/data/map-data.js` | **Generated.** Do not hand-edit; rebuild it |
| `assets/data/*.csv` | **Generated.** Downloaded by readers and used for fact-checking |
| `build_data.py` | Recomputes the map data and CSVs from `hk_cycling_story_data/` |
| `assets/img/` | Planning image (WebP + PNG fallback) |

The page is intentionally one HTML file plus local assets. There is no CMS and no
server.

---

## 2. Change the headline, standfirst or date

The headline appears in **four** places. Change all of them or the browser tab,
search engines and the page will disagree:

1. `<title>` — around line 6
2. `<meta name="description">` — around line 7
3. `"headline"` inside the JSON-LD block — around line 22
4. `<h1 class="headline">` — around line 47

The standfirst is the `<p class="standfirst">` directly below the `<h1>`
(around line 48). The byline and date are in `<div class="byline">` (line 49).

Keep the headline in sentence case, present tense, and roughly 20–25 Chinese
characters so it fits two lines at 360px. If you change the headline, also check
the two chart headlines lower down: they should make a different point, not copy
the headline.

---

## 3. Change the story text

The body copy is inside `<div class="text">` (starts around line 176).

- Paragraphs are plain `<p>…</p>`.
- Section headings are `<h2>一、由康樂到代步</h2>`, etc.
- The key-numbers strip is the `<div class="stats">` block.
- Keep paragraphs short (one idea, about three sentences) per the stylebook.
- Every figure should be attributed in the same or next sentence.

If you edit a paragraph that contains a number, check that the same number still
appears in the stats strip, chart, data notes and CSV.

---

## 4. Change chart numbers

Charts are hand-built HTML/CSS inside `index.html`, not generated from the CSV.
To change one bar, update **all** of these:

**Chart 1** is `<figure id="chart-district">` around line 219.

```html
<div class="bar-row__label">葵青<span>0/25</span></div>
<div class="bar-row__track">
  <div class="bar-row__fill" style="--w:0%"></div>
</div>
<div class="bar-row__value">0%</div>
```

- `0/25` → estates with parking / total estates
- `--w:0%` → the bar width (the percentage shown)
- `0%` → the number at the right
- Also update the chart headline, annotation, note, and the CSV in
  `assets/data/district_coverage.csv`.

**Chart 2** is `<figure id="chart-accident">` around line 326. Its bars use
`--w:22%` and `--w:78%` on a 0–5% axis, with the percentages and counts in
`.bar-row__value`.

If the underlying data changes, it is safer to rebuild the data and then send me
the new figures to update the charts, because the chart HTML is static.

---

## 5. Change colours or fonts

Open `assets/css/style.css`. The whole design is controlled by the tokens at the
top:

```css
:root {
  --ink: #16293F;
  --slate: #5B6573;
  --navy: #1F3A5F;
  --mist: #EEF2F6;
  --paper: #FFFFFF;
  --rust: #C4502A;      /* story highlight: bars, dots, key number */
  --context: #B5BAC1;   /* comparison bars and map tracks */
  --harbour: #2B6CB0;
  --grid: #E4E7EB;
}
```

Changing `--rust` changes the highlighted bar, the 0% dot, the map's no-parking
estates and the “41” statistic in one go. The stylebook fixes these colours, so
only change them if the class palette changes.

Fonts are set in `--serif` and `--sans` (lines 21–22) and loaded by the Google
Fonts `<link>` in `index.html` around line 17. If you change the Latin font, keep
`Noto Serif TC` / `Noto Sans TC` in the stack so Chinese still renders correctly.

Type sizes are in `.headline`, `.standfirst`, `.text > p`, `.chart__title` and
the `@media` blocks at the bottom of the CSS.

---

## 6. Change the map

The map is generated from `assets/data/map-data.js` by `build_data.py`. Do not
edit `map-data.js` directly.

- **Default view / district buttons**: `index.html` around lines 60–75.
- **Which layers start switched on**: the `checked` attributes on the
  `data-layer` checkboxes around line 69.
- **Map interaction**: `assets/js/site.js` — `focusDistrict`, `focusEstate`,
  `renderDetail`, `renderTable`.
- **Map colours and marker sizes**: `.map-*` rules in `style.css`.
- **Map notes and caption**: the `<figcaption>` below the map in `index.html`.

The map only covers the New Territories cycle-network area. Three remote Lantau
estates (龍田邨, 雅寧苑, 長貴邨) and seven parking sites are outside the crop;
this is stated in the caption.

---

## 7. Replace the planning image

The image is `assets/img/san-tin-pedestrian-cycling-network.webp` (displayed) and
`.png` (fallback and “open original” link).

If you replace it:

1. Keep the same filenames, or update both the `<source>` and `<img>` paths in
   the `<picture>` element.
2. Keep the 795 × 1125 proportions, or update the `width`/`height` attributes.
3. Update the `alt` text and the caption credit.
4. Use a WebP around 150–300 KB and a PNG for the full-size link.

---

## 8. Rebuild the data (only if the raw data changes)

Put the new raw files in `hk_cycling_story_data/` using the same filenames, then:

```bash
cd "/Users/sarachen/Desktop/Data/Cycling story_2"
python3 build_data.py
```

This rewrites:

- `assets/data/map-data.js`
- `assets/data/estates_nt.csv`
- `assets/data/district_coverage.csv`
- `assets/data/accident_severity_2025.csv`

`build_data.py` uses only the Python standard library. It reads the district
outlines from `assets/data/hk18_districts_source.geojson` and simplifies them for
the web map.

**Important:** rebuilding does **not** update the hand-written chart HTML, the
stats strip, the story paragraphs or the data notes. After a rebuild, check the
central number (94 ÷ 135 = 69.6%) and update those places by hand.

If you only change a headline or a colour, do **not** run `build_data.py`.

---

## 9. Quick checks after editing

- [ ] Search for the old headline in `index.html`; it should appear nowhere.
- [ ] Reload at 1440px **and** 390px wide (Chrome DevTools → Toggle device toolbar).
- [ ] The map still pans, zooms and opens estate details.
- [ ] The table still says “顯示 135 / 135 個屋邨”.
- [ ] Both charts still have a title, chatter, annotation, note, source and credit.
- [ ] No number in the text disagrees with its chart or CSV.
- [ ] Every local link and image still opens (`assets/…`, `hk_cycling_story_data/README.md`).

---

## 10. Things not to do

- Do not edit `assets/data/map-data.js` by hand; it is overwritten by the build.
- Do not rename `assets/css/style.css` or `assets/js/site.js` without updating
  `index.html`.
- Do not change a chart bar's `--w` without changing its label, value, headline
  and CSV — a fact-checker will compare them.
- Do not add a second y-axis, start bars above zero, or introduce a colour
  outside the palette; those are stylebook failures.

If you want a specific change — a new headline, an English version, different
colours, more estates, another chart — tell me which section and what it should
say, and I can make it in the files.
