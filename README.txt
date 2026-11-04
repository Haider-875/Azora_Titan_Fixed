AZORA SOLUTIONS — FIXED STATIC SITE

What was fixed:
- Root index.html now has its required assets/js files beside it.
- All pages from public/ are moved to the same deploy root, so navigation like hardware.html, quote.html, etc. works.
- assets/js/data.js, imgdata.js and app.js are now available at the paths referenced by the HTML.
- Existing embedded product images were preserved.

Preview:
Open index.html in a browser.

For best results (especially JS interactions), serve this folder with a local web server:
  python -m http.server 8080
Then open:
  http://localhost:8080/

No source React placeholder is used for the static site preview; the generated HTML is the actual Azora site.
