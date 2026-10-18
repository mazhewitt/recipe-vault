// Drives the real app's /api/chat (SSE) through cooking scenarios and records outcome checks.
// Usage: node run-eval.cjs <port> <label> [scenarioFilter]
// Writes runs/results/<label>.json. Token usage is read from the server log if the app logs it
// ("gemini usage" lines); otherwise reported as null.
const fs = require('fs');
const path = require('path');
const PORT = process.argv[2]; const LABEL = process.argv[3]; const FILTER = process.argv[4];
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = { 'X-API-Key': 'test-api-key-for-playwright' };
const RUN = path.join(__dirname, 'runs', String(PORT));
const ids = JSON.parse(fs.readFileSync(path.join(RUN, 'ids.json'), 'utf8')).ids;
const card = fs.readFileSync(path.join(__dirname, 'recipe-card.png')).toString('base64');
const cardDe = fs.readFileSync(path.join(__dirname, 'recipe-card-de.png')).toString('base64');
const wrote = (r) => r.tools.some(t => /^(create|update|delete)_recipe/.test(t));

async function chat(message, { conversation_id, current_recipe, image } = {}) {
  const t0 = Date.now(); let tFirstText = null;
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...KEY },
    body: JSON.stringify({ message, conversation_id, current_recipe, image }),
  });
  const events = []; let buf = '';
  const dec = new TextDecoder();
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = /^event: (.*)$/m.exec(raw)?.[1]; const data = /^data: (.*)$/m.exec(raw)?.[1];
      if (!ev) continue;
      let d; try { d = JSON.parse(data); } catch { d = data; }
      if (ev === 'chunk' && d.text && tFirstText === null) tFirstText = Date.now() - t0;
      events.push({ ev, d, t: Date.now() - t0 });
    }
  }
  const text = events.filter(e => e.ev === 'chunk').map(e => e.d.text).join('');
  const done = events.find(e => e.ev === 'done');
  return {
    status: res.status, ms: Date.now() - t0, firstTextMs: tFirstText, text,
    tools: events.filter(e => e.ev === 'tool_use').map(e => `${e.d.tool}:${e.d.status}`),
    artifacts: events.filter(e => ['recipe_artifact', 'meal_artifact', 'timer_start'].includes(e.ev)).map(e => ({ ev: e.ev, ...e.d })),
    errors: events.filter(e => e.ev === 'error').map(e => e.d),
    conversation_id: done?.d?.conversation_id,
  };
}
const get = async (id) => (await fetch(`${BASE}/api/recipes/${id}`, { headers: KEY })).json();
const list = async () => { const d = await (await fetch(`${BASE}/api/recipes`, { headers: KEY })).json(); return Array.isArray(d) ? d : d.recipes; };
const cur = (k, title) => ({ recipe_id: ids[k], title });
const ingQty = (r, re) => r.ingredients?.find(i => re.test(i.name))?.quantity;

const SCENARIOS = [
  { id: 'display-by-name', run: async () => {
      const r = await chat("Show me Granny's lasagne");
      return { turns: [r], checks: { displayed_lasagne: r.artifacts.some(a => a.ev === 'recipe_artifact' && a.recipe_id === ids.lasagne) } };
  } },
  { id: 'display-german', run: async () => {
      const r = await chat('Zeig mir bitte das Bananenbrot');
      return { turns: [r], checks: { displayed_banana: r.artifacts.some(a => a.ev === 'recipe_artifact' && a.recipe_id === ids.bread) } };
  } },
  { id: 'timer-for-step', run: async () => {
      const r = await chat('The ragu is on now, set a timer for the simmering', { current_recipe: cur('lasagne', "Granny's Beef Lasagne") });
      const t = r.artifacts.find(a => a.ev === 'timer_start');
      return { turns: [r], checks: { timer_started: !!t, timer_90min: !!t && Math.abs(t.duration_minutes - 90) < 1, timer_step4: !!t && t.step_number === 4 } };
  } },
  { id: 'halve-current', run: async () => {
      // The prompt allows either presenting the scaled list or saving it; both must be right.
      const r = await chat('Can you halve this recipe? Just two of us tonight.', { current_recipe: cur('curry', 'Thai Green Curry') });
      const after = await get(ids.curry);
      const saved = after.servings === 2;
      const t = r.text.toLowerCase().replace(/\s+/g, ' ');
      return { turns: [r], saved, checks: {
        coconut_200ml: saved ? Math.abs((ingQty(after, /coconut/i) ?? 0) - 200) < 1 : /200 ?ml/.test(t),
        chicken_250g: saved ? Math.abs((ingQty(after, /chicken/i) ?? 0) - 250) < 1 : /250 ?g/.test(t),
        beans_75g: saved ? Math.abs((ingQty(after, /bean/i) ?? 0) - 75) < 1 : /75 ?g/.test(t),
        nothing_dropped: after.ingredients?.length === 9 && after.steps?.length === 5,
        consistent_servings: saved ? true : after.servings === 4,
      } };
  } },
  { id: 'image-to-recipe', run: async () => {
      // The prompt says: extract, show, then ask "edit it or add it to the book?" — so confirm once.
      const before = (await list()).length;
      const a = await chat('Please add this recipe card to the book', { image: { data: card, media_type: 'image/png' } });
      const turns = [a];
      let scone = (await list()).find(x => /scone/i.test(x.title));
      if (!scone) {
        turns.push(await chat('Yes, add it to the book please', { conversation_id: a.conversation_id }));
        scone = (await list()).find(x => /scone/i.test(x.title));
      }
      const all = await list();
      const full = scone ? await get(scone.id) : null;
      return { turns, checks: {
        created_one: all.length === before + 1 && !!scone,
        displayed_after_create: turns.some(t => t.artifacts.some(x => x.ev === 'recipe_artifact' && scone && x.recipe_id === scone.id)),
        six_ingredients: full?.ingredients?.length === 6 || full?.ingredients?.length === 7,
        flour_225: Math.abs((full ? ingQty(full, /flour/i) : 0) - 225) < 1,
        temp_220_celsius: !!full?.steps?.some(s => s.temperature_value === 220 || s.temperature_value === 200),
        bake_12_15: !!full?.steps?.some(s => s.duration_minutes >= 12 && s.duration_minutes <= 15),
      }, created: full ? { title: full.title, ingredients: full.ingredients.map(i => [i.quantity, i.unit, i.name, i.notes]), steps: full.steps.map(s => [s.instruction, s.duration_minutes, s.temperature_value, s.temperature_unit]), servings: full.servings } : null };
  } },
  { id: 'text-to-recipe', run: async () => {
      const r = await chat("Save this one: Mum's flapjacks. 250g oats, 125g butter, 125g light brown sugar, 3 tbsp golden syrup. Melt the butter, sugar and syrup in a pan, stir in the oats, press into a lined 20cm tin and bake for 20 minutes at 180C. Cool before cutting into 12.");
      const f = (await list()).find(x => /flapjack/i.test(x.title)); const full = f ? await get(f.id) : null;
      return { turns: [r], checks: {
        created: !!full, four_ingredients: full?.ingredients?.length === 4,
        bake_20: !!full?.steps?.some(s => s.duration_minutes === 20), temp_180: !!full?.steps?.some(s => s.temperature_value === 180),
        serves_12: full?.servings === 12,
      } };
  } },
  { id: 'meal-plan', run: async () => {
      // The prompt says: propose first, call display_meal_plan only after the user confirms.
      const a = await chat('Plan a dinner for 6 from my book: one main and one dessert');
      const b = await chat('Yes, that looks good — show me the plan', { conversation_id: a.conversation_id });
      const m = [...a.artifacts, ...b.artifacts].find(x => x.ev === 'meal_artifact');
      const valid = new Set(Object.values(ids));
      return { turns: [a, b], checks: {
        proposed_before_display: !a.artifacts.some(x => x.ev === 'meal_artifact'),
        meal_plan_shown: !!m, ids_valid: !!m && m.recipes.every(x => valid.has(x.recipe_id)),
        has_main_and_dessert: !!m && m.recipes.some(x => [ids.lasagne, ids.curry, ids.roast, ids.risotto, ids.shakshuka, ids.bolognese].includes(x.recipe_id)) && m.recipes.some(x => [ids.drizzle, ids.brownies, ids.bread, ids.pancakes].includes(x.recipe_id)),
        guest_count_6: !!m && m.guest_count === 6,
      } };
  } },
  { id: 'grounded-search', run: async () => {
      const r = await chat('Which of my recipes are vegetarian? Just the names please.');
      const t = r.text.toLowerCase();
      return { turns: [r], checks: {
        names_shakshuka: t.includes('shakshuka'), names_risotto: t.includes('risotto'),
        no_meat_dishes: !/lasagne|curry|roast|bolognese/.test(t),
      } };
  } },
  { id: 'guided-cooking-2-turns', run: async () => {
      const a = await chat("I'm about to make this. What do I need to do first?", { current_recipe: cur('drizzle', 'Lemon Drizzle Cake') });
      const b = await chat('Done. The butter and sugar are creamed. Next?', { conversation_id: a.conversation_id, current_recipe: cur('drizzle', 'Lemon Drizzle Cake') });
      return { turns: [a, b], checks: {
        first_mentions_oven: /oven|preheat|180/i.test(a.text), next_mentions_eggs: /egg/i.test(b.text),
        concise_first: a.text.length < 900, concise_next: b.text.length < 900,
      } };
  } },
  { id: 'troubleshoot-french', run: async () => {
      const r = await chat('Mon gâteau est retombé au milieu, pourquoi ?', { current_recipe: cur('drizzle', 'Lemon Drizzle Cake') });
      return { turns: [r], checks: { replied_french: /\b(le|la|les|four|gâteau|parce|peut)\b/i.test(r.text) && !/\bthe\b/i.test(r.text), no_tool_writes: !r.tools.some(t => /update|create|delete/.test(t)) } };
  } },
  // ---- Harder scenarios (prefix "hard-"): added once every model passed the basic set. ----
  { id: 'hard-german-card', run: async () => {
      const before = (await list()).length;
      const a = await chat('Kannst du dieses Rezept in mein Buch aufnehmen?', { image: { data: cardDe, media_type: 'image/png' } });
      const turns = [a];
      let k = (await list()).find(x => /apfel/i.test(x.title));
      if (!k) { turns.push(await chat('Ja, bitte speichern', { conversation_id: a.conversation_id })); k = (await list()).find(x => /apfel/i.test(x.title)); }
      const full = k ? await get(k.id) : null;
      const names = (full?.ingredients || []).map(i => i.name.toLowerCase()).join(' | ');
      return { turns, checks: {
        created_one: (await list()).length === before + 1 && !!k,
        replied_german: turns.every(t => /\b(ich|und|das|der|die|ist|habe|dein|deinem)\b/i.test(t.text)) && !turns.some(t => /\b(the|and|your)\b/i.test(t.text)),
        has_apples_4: (full?.ingredients || []).some(i => /apfel|äpfel|apple/i.test(i.name) && i.quantity === 4),
        flour_200: Math.abs((full ? ingQty(full, /mehl|flour/i) : 0) - 200) < 1,
        all_7_ingredients: (full?.ingredients?.length || 0) >= 7 && /salz|salt/.test(names) && /backpulver|baking/.test(names),
        bake_45_180: !!full?.steps?.some(s => s.duration_minutes === 45 && s.temperature_value === 180),
      }, created: full ? { title: full.title, ingredients: full.ingredients.map(i => [i.quantity, i.unit, i.name, i.notes]), steps: full.steps.map(s => [s.instruction, s.duration_minutes, s.temperature_value, s.temperature_unit]) } : null };
  } },
  { id: 'hard-substitute-and-scale', run: async () => {
      const r = await chat("I've got no coconut milk, only double cream. Swap it in and make it for 6 people.", { current_recipe: cur('curry', 'Thai Green Curry') });
      const after = await get(ids.curry); const saved = after.servings === 6;
      const t = r.text.toLowerCase();
      return { turns: [r], saved, checks: {
        cream_used: saved ? (after.ingredients || []).some(i => /cream/i.test(i.name)) : /cream/.test(t),
        coconut_gone: saved ? !(after.ingredients || []).some(i => /coconut/i.test(i.name)) : true,
        chicken_750: saved ? Math.abs((ingQty(after, /chicken/i) ?? 0) - 750) < 1 : /750 ?g/.test(t),
        beans_225: saved ? Math.abs((ingQty(after, /bean/i) ?? 0) - 225) < 1 : /225 ?g/.test(t),
        still_9_ingredients: (after.ingredients?.length || 0) === 9,
      } };
  } },
  { id: 'hard-cups', run: async () => {
      const r = await chat('My American friend wants to bake this. How much flour, butter and caster sugar in cups?', { current_recipe: cur('drizzle', 'Lemon Drizzle Cake') });
      const t = r.text.toLowerCase();
      return { turns: [r], checks: {
        uses_cups: (t.match(/cup/g) || []).length >= 3,
        butter_about_1_cup: /butter[^\n]{0,60}\b1\b[^\n]{0,10}cup|1 cup[^\n]{0,40}butter|butter[^\n]{0,40}(2 sticks)/.test(t),
        no_write: !wrote(r),
      } };
  } },
  { id: 'hard-guided-5-turns', run: async () => {
      const c = cur('lasagne', "Granny's Beef Lasagne");
      const msgs = ["Let's cook this together. I'm at the stove, what first?", 'Veg is soft.', 'Mince is browned now.', "Wine's bubbled off.", 'Tomatoes, stock and oregano are in.'];
      const turns = []; let conv;
      for (const m of msgs) { const r = await chat(m, { conversation_id: conv, current_recipe: c }); conv = r.conversation_id; turns.push(r); }
      const timers = turns.flatMap(t => t.artifacts.filter(a => a.ev === 'timer_start'));
      return { turns, checks: {
        simmer_timer_90: timers.some(x => Math.abs(x.duration_minutes - 90) < 1),
        timer_not_premature: !turns.slice(0, 3).some(t => t.artifacts.some(a => a.ev === 'timer_start' && Math.abs(a.duration_minutes - 90) < 1)),
        concise: turns.every(t => t.text.length < 700),
        no_errors: turns.every(t => !t.errors.length),
        no_write: !turns.some(wrote),
      } };
  } },
  { id: 'hard-constrained-meal', run: async () => {
      const a = await chat("Dinner for 4 tomorrow from my book. One of us is vegetarian so the main has to be veggie, and it needs to be quick on a weeknight. Add a dessert.");
      const b = await chat('Sounds good, show me the plan', { conversation_id: a.conversation_id });
      const m = [...a.artifacts, ...b.artifacts].find(x => x.ev === 'meal_artifact');
      const meat = [ids.lasagne, ids.curry, ids.roast, ids.bolognese];
      return { turns: [a, b], checks: {
        meal_plan_shown: !!m,
        no_meat: !!m && !m.recipes.some(x => meat.includes(x.recipe_id)),
        veggie_main: !!m && m.recipes.some(x => [ids.shakshuka, ids.risotto].includes(x.recipe_id)),
        has_dessert: !!m && m.recipes.some(x => [ids.drizzle, ids.brownies, ids.bread, ids.pancakes].includes(x.recipe_id)),
        guests_4: !!m && m.guest_count === 4,
      } };
  } },
  { id: 'hard-followup-reference', run: async () => {
      const a = await chat('Show me the curry');
      const b = await chat('How long does it take altogether?', { conversation_id: a.conversation_id, current_recipe: cur('curry', 'Thai Green Curry') });
      return { turns: [a, b], checks: {
        displayed_curry: a.artifacts.some(x => x.ev === 'recipe_artifact' && x.recipe_id === ids.curry),
        total_30: /\b30\b|half an hour|half-hour/i.test(b.text),
      } };
  } },
  { id: 'hard-missing-recipe', run: async () => {
      const before = (await list()).length;
      const r = await chat('Show me my beef wellington recipe');
      return { turns: [r], checks: {
        nothing_displayed: !r.artifacts.some(x => x.ev === 'recipe_artifact'),
        nothing_created: (await list()).length === before && !wrote(r),
        says_not_found: /(don't|do not|couldn't|could not|can't|cannot|no)\b[^.]{0,60}(find|have|see|recipe)/i.test(r.text),
      } };
  } },
];

(async () => {
  const out = { label: LABEL, port: PORT, scenarios: [] };
  for (const s of SCENARIOS) {
    if (FILTER && !s.id.includes(FILTER)) continue;
    const t0 = Date.now();
    try {
      const res = await s.run();
      res.checks.no_reset_notice = !res.turns.some(t => /\b(reset|starting fresh|fresh start)\b/i.test(t.text));
      const passed = Object.values(res.checks).filter(Boolean).length;
      out.scenarios.push({ id: s.id, ms: Date.now() - t0, passed, total: Object.keys(res.checks).length, ...res });
      console.log(`${LABEL} ${s.id}: ${passed}/${Object.keys(res.checks).length} ${JSON.stringify(res.checks)} ${Date.now() - t0}ms`);
    } catch (e) {
      out.scenarios.push({ id: s.id, error: String(e) });
      console.log(`${LABEL} ${s.id}: ERROR ${e}`);
    }
  }
  const log = fs.readFileSync(path.join(RUN, 'server.log'), 'utf8');
  const clean = log.replace(/\x1b\[[0-9;]*m/g, '');
  const usage = [...clean.matchAll(/gemini usage model=(\S+) prompt_tokens=(\d+) output_tokens=(\d+) thoughts_tokens=(\d+) cached_tokens=(\d+) finish_reason=(\S+)/g)];
  out.usage = usage.length ? usage.reduce((a, m) => ({ calls: a.calls + 1, prompt: a.prompt + +m[2], output: a.output + +m[3], thoughts: a.thoughts + +m[4], cached: a.cached + +m[5], reasons: { ...a.reasons, [m[6]]: (a.reasons[m[6]] || 0) + 1 } }), { calls: 0, prompt: 0, output: 0, thoughts: 0, cached: 0, reasons: {} }) : null;
  out.server_errors = (log.match(/ERROR.*$/gm) || []).slice(0, 20);
  fs.mkdirSync(path.join(__dirname, 'runs', 'results'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'runs', 'results', `${LABEL}.json`), JSON.stringify(out, null, 2));
  const P = out.scenarios.reduce((a, s) => a + (s.passed || 0), 0), T = out.scenarios.reduce((a, s) => a + (s.total || 0), 0);
  console.log(`== ${LABEL}: ${P}/${T} checks; usage=${JSON.stringify(out.usage)}`);
})();
