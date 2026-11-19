# Spin & Solve

A spin-the-wheel word puzzle game for 1–3 players (humans or computer opponents), built as an installable Progressive Web App. No build step and no dependencies: plain HTML, CSS and JavaScript.

## How to play

- **Spin** the wheel. Land on a cash value and call a consonant to earn that amount for every time the letter appears.
- **Buy a vowel** for $250.
- **Bankrupt** wipes your round winnings; **Lose a Turn** passes play.
- **Solve** on your turn to bank your round winnings (minimum $1,000).
- Highest bank after the final round wins.

## Project layout

```
index.html              Page markup and PWA meta tags
styles.css              All styles
app.js                  Game logic, wheel drawing, sounds, computer players, install prompt
sw.js                   Service worker (offline play, font caching)
manifest.webmanifest    App name, colours and icons for installation
icons/                  App icon (SVG source + PNG sizes, incl. maskable and Apple touch icon)
vercel.json             Headers so the service worker and manifest update correctly
```

## Run locally

Service workers need `http://localhost` or HTTPS, so serve the folder rather than opening the file directly:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repo.
2. Leave **Framework Preset** as **Other**, with no build command and the output directory left empty (the repo root is served as-is).
3. Deploy. Every push to `main` redeploys automatically.

Or from the command line: `npx vercel --prod`.

## Install on your phone

Open the deployed URL on your phone:

- **iPhone / iPad (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** tap **Install app** in the game header, or ⋮ menu → **Install app**.

The installed app opens full screen and works offline after the first visit.

## Releasing updates

When you change `index.html`, `styles.css`, `app.js` or any icon, bump `VERSION` in `sw.js` (e.g. `v1` → `v2`). Installed copies pick up the new version the next time they're opened online.
