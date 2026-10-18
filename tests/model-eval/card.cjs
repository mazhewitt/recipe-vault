// Regenerates recipe-card.png and recipe-card-de.png (the handwritten cards used by the
// image-to-recipe and hard-german-card scenarios).
// Needs playwright installed in tests/e2e (cd tests/e2e && npm ci).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('path').join(__dirname, '..', 'e2e', 'node_modules', 'playwright'));
const cardHtml = (lines) => `<body style="margin:0;background:#d9c7a3;font-family:'Bradley Hand','Comic Sans MS',cursive;">
  <div style="margin:30px;padding:30px 40px;background:#fffdf3;transform:rotate(-1.5deg);box-shadow:4px 6px 12px rgba(0,0,0,.35);
     background-image:repeating-linear-gradient(#fffdf3 0 31px,#9fc3e6 31px 32px);color:#1d2a6b;font-size:21px;line-height:32px">
  ${lines}
  </div></body>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 900 } });
  await p.setContent(cardHtml(`<div style="font-size:30px;color:#a3201c;margin-bottom:8px">Omas Apfelkuchen</div>
  <div>für eine 26er Springform</div>
  <div>200 g Mehl, 1 Pck. Backpulver</div><div>125 g weiche Butter, 100 g Zucker</div>
  <div>1 Ei, 1 Prise Salz</div><div>4 säuerliche Äpfel (Boskop)</div>
  <div style="margin-top:10px">Butter, Zucker + Ei schaumig rühren, Mehl, Backpulver</div>
  <div>u. Salz unterrühren. Teig in die Form drücken.</div><div>Äpfel schälen, vierteln, einritzen, auflegen.</div>
  <div>Umluft 180° ca. 45 Min. backen. Mit Puderzucker</div><div>bestäuben, lauwarm mit Sahne servieren!</div>`));
  await p.screenshot({ path: __dirname + '/recipe-card-de.png' });
  await p.setContent(`<body style="margin:0;background:#d9c7a3;font-family:'Bradley Hand','Comic Sans MS',cursive;">
  <div style="margin:30px;padding:30px 40px;background:#fffdf3;transform:rotate(-1.5deg);box-shadow:4px 6px 12px rgba(0,0,0,.35);
     background-image:repeating-linear-gradient(#fffdf3 0 31px,#9fc3e6 31px 32px);color:#1d2a6b;font-size:21px;line-height:32px">
  <div style="font-size:30px;color:#a3201c;margin-bottom:8px">Nana's Cheese Scones</div>
  <div>makes about 8</div>
  <div>225g self raising flour</div><div>pinch of salt, 1/2 tsp mustard powder</div>
  <div>55g butter (cold, cubed)</div><div>100g mature cheddar, grated</div><div>150ml milk + a bit for brushing</div>
  <div style="margin-top:10px">Oven 220 (fan 200). Rub butter into flour, salt + mustard</div>
  <div>till like breadcrumbs. Stir in most of the cheese.</div><div>Add milk, bring together - don't knead much!</div>
  <div>Pat out 2cm thick, cut rounds, brush with milk,</div><div>rest of cheese on top. Bake 12-15 min till golden.</div>
  </div></body>`);
  await p.screenshot({ path: __dirname + '/recipe-card.png' }); await b.close();
})();
