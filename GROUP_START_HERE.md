# 給組員：由這裏開始 / Start here

This folder is the complete website. No server, account or install is needed.

## 1. Open it

1. Unzip the folder.
2. Double-click `index.html` (Chrome is best).
3. The map, charts and estate table should work immediately. The page is in
   traditional Chinese.

## 2. What to edit

| I want to change… | Open… |
| --- | --- |
| Headline, standfirst, paragraphs, chart wording, captions, data notes | `index.html` |
| Colours, fonts, spacing, mobile layout | `assets/css/style.css` |
| Map zoom, tooltips, table filters | `assets/js/site.js` |
| The underlying data | `hk_cycling_story_data/` then run `python3 build_data.py` |

The detailed guide is `EDITING.md`. Read it before changing numbers.

## 3. Five rules so we do not break the page

1. **Do not edit `assets/data/map-data.js` or the CSV files by hand.** They are
   generated. Change the raw data and run `python3 build_data.py` instead.
2. **The headline lives in four places** in `index.html`: `<title>`, the meta
   description, the JSON-LD block and the `<h1>`. Change all four.
3. **A chart number lives in several places**: the row label (`0/25`), the bar
   width (`--w:0%`), the value at the right (`0%`), the chart headline/annotation,
   and the matching CSV. Change all of them, or the fact-check will fail.
4. **One person edits `index.html` at a time.** Google Drive does not merge HTML
   like a Google Doc; two people saving the same file creates a conflicted copy.
   Send a message in the group before you start.
5. **Keep a backup.** Before a big edit, duplicate the file as
   `index_working_2026-11-02.html` or make a copy of the whole folder.

## 4. If we use a shared folder (Google Drive / OneDrive / Dropbox)

- Upload the **unzipped folder**, not just the zip, and share it with “Editor”
  access.
- Agree who is editing which file and when. The safest split is:
  - one person owns `index.html` (words + charts),
  - one person owns `assets/css/style.css` (design),
  - one person owns `assets/js/site.js` (map/table),
  - one person checks numbers against the CSVs.
- When two people must edit `index.html`, take turns. Do not edit it at the same
  time.
- At the end of each session, add a note in the group: date, what changed, and
  which file.

## 5. If we use GitHub (best for parallel work)

One person creates the repository and pushes this folder:

```bash
cd path/to/the/unzipped/folder
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git push -u origin main
```

Everyone else:

```bash
git clone https://github.com/YOUR-NAME/YOUR-REPO.git
cd YOUR-REPO
git checkout -b your-name/edit
# edit files
git add .
git commit -m "Describe the edit"
git push -u origin your-name/edit
```

Then open a pull request on GitHub. The owner merges it. This avoids overwritten
work and keeps a history.

To get a shareable preview URL, in the repository go to **Settings → Pages**,
choose **Deploy from a branch → main → / (root)**. GitHub will publish
`index.html` at `https://YOUR-NAME.github.io/YOUR-REPO/`.

## 6. Before sending the folder back

- [ ] Open `index.html` at desktop width and at 390px wide.
- [ ] The map still pans, zooms and opens estate details.
- [ ] The table says “顯示 135 / 135 個屋邨”.
- [ ] Both charts still have a headline, chatter, annotation, note, source and
      credit.
- [ ] No number in the text disagrees with its chart or CSV.
- [ ] The headline in the browser tab matches the headline on the page.

If something breaks, the quickest fix is to restore the last good copy of the
file you changed, not to rebuild everything.

## 7. Who to ask

Ask the person who owns the file, or the data editor for number questions. If
you are stuck, send a screenshot and the exact file name and line number.
