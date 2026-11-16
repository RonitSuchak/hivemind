Screenshots for the little preview windows (src/components/ToolPreview.jsx).
One JPG per tool, named by the tool's id in src/data/tools.js, about 880px wide, 16:10, top of the home page:
chatgpt.jpg duolingo.jpg khan-academy.jpg quizlet.jpg kahoot.jpg photomath.jpg desmos.jpg
brilliant.jpg anki.jpg seneca.jpg sparx-maths.jpg khanmigo.jpg
Take them logged OUT, so no personal dashboards or chats appear. A missing file shows "No preview".

Captured 2026-11-15 in a logged-out browser: all except duolingo.jpg (this computer rejects the site's
certificate) and quizlet.jpg (the site shows a 'verify you are human' check). Add those two by hand.

Added 2026-11-16 (same way, logged out): geogebra, coursera, phet, scratch, code-org, isaac-physics,
oak-national-academy, save-my-exams, codecademy, perplexity, mathigon, 3blue1brown, freecodecamp, crash-course, notebooklm.
Skipped on purpose, add by hand if you want them:
  certificate rejected on this computer: bbc-bitesize, edx, wolfram-alpha, blooket, ted-ed (and duolingo, as before)
  a "verifying you are not a bot" page: claude (and quizlet, as before)
  a cookie or consent box covers the page: gemini, symbolab, physics-and-maths-tutor, memrise, corbettmaths, nrich,
  grammarly, dr-frost-maths, babbel
After adding or removing a JPG, run  node scripts/list-shots.mjs  from the frontend folder so the site knows about it.
