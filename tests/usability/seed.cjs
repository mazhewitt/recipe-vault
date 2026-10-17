// Seeds a realistic family recipe book into a running mock server (started by server.sh).
// Usage: node tests/usability/seed.cjs http://127.0.0.1:3011   -> prints {"ids": {...}} JSON
// Idempotent-ish: deletes every existing recipe first. fresh.sh calls this for you.
//
// The book: Granny's Beef Lasagne (19 ingredients, 10 steps, photo), Lemon Drizzle Cake (photo),
// Thai Green Curry (photo), Sunday Roast Chicken with a very long title (photo), Pancakes (no
// description), Mushroom Risotto, Chocolate Brownies, Shakshuka, Banana Bread, Weeknight Bolognese.
// Photos are the tiny fixtures in tests/e2e/fixtures (large-photo.jpg is 8MB, over the 5MB upload
// limit, so it is not used here). Oven temperatures use the 'Celsius' unit.
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:3011';
const KEY = { 'X-API-Key': 'test-api-key-for-playwright' };
const FIX = path.join(__dirname, '..', 'e2e', 'fixtures');

const ing = (name, quantity, unit, notes) => ({ name, quantity, unit, notes });
const st = (instruction, duration_minutes, temperature_value, temperature_unit) =>
  ({ instruction, duration_minutes, temperature_value, temperature_unit });

const RECIPES = [
  {
    key: 'lasagne', photo: 'test-photo.jpg',
    title: "Granny's Beef Lasagne", tags: ['main', 'pasta', 'family-favourite'], difficulty: 3,
    description: 'Layers of slow-cooked ragu, creamy béchamel and plenty of cheese. The Sunday classic.',
    prep_time_minutes: 40, cook_time_minutes: 150, servings: 6,
    ingredients: [
      ing('olive oil', 2, 'tbsp'), ing('onion, finely chopped', 1), ing('carrot, finely chopped', 1),
      ing('celery stick, finely chopped', 1), ing('garlic cloves, crushed', 3), ing('beef mince', 750, 'g'),
      ing('tomato purée', 2, 'tbsp'), ing('chopped tomatoes', 2, 'tins'), ing('red wine', 150, 'ml'),
      ing('beef stock', 300, 'ml'), ing('dried oregano', 1, 'tsp'), ing('butter', 60, 'g'),
      ing('plain flour', 60, 'g'), ing('whole milk', 750, 'ml'), ing('nutmeg', null, null, 'a good grating'),
      ing('dried lasagne sheets', 12), ing('mozzarella', 125, 'g', 'torn'), ing('parmesan', 60, 'g', 'grated'),
      ing('salt and pepper', null, null, 'to taste'),
    ],
    steps: [
      st('Heat the oil in a large casserole and soften the onion, carrot and celery over a low heat.', 10),
      st('Add the garlic and cook for a minute, then turn up the heat and brown the mince in batches.', 8),
      st('Stir in the tomato purée, then the wine, and let it bubble until almost gone.', 3),
      st('Add the tomatoes, stock and oregano. Cover and simmer gently, stirring now and then.', 90),
      st('Meanwhile make the béchamel: melt the butter, stir in the flour and cook for a minute.', 2),
      st('Whisk in the milk a little at a time until smooth and thick. Season with nutmeg, salt and pepper.', 8),
      st('Heat the oven.', null, 180, 'Celsius'),
      st('Layer ragu, lasagne sheets and béchamel in a deep dish, three times, finishing with béchamel.'),
      st('Scatter over the mozzarella and parmesan and bake until golden and bubbling.', 45, 180, 'Celsius'),
      st('Rest for 10 minutes before cutting so the layers hold.', 10),
    ],
  },
  {
    key: 'drizzle', photo: 'test-photo.png',
    title: 'Lemon Drizzle Cake', tags: ['dessert', 'baking'], difficulty: 2,
    description: 'Sharp, sticky and crunchy-topped.',
    prep_time_minutes: 15, cook_time_minutes: 45, servings: 8,
    ingredients: [
      ing('unsalted butter, softened', 225, 'g'), ing('caster sugar', 225, 'g'), ing('eggs', 4),
      ing('self-raising flour', 225, 'g'), ing('lemons', 2, null, 'zested; juice kept for the drizzle'),
      ing('granulated sugar', 85, 'g'),
    ],
    steps: [
      st('Heat the oven and line a 2lb loaf tin.', null, 180, 'Celsius'),
      st('Beat the butter and caster sugar until pale and fluffy.', 4),
      st('Add the eggs one at a time, then fold in the flour and lemon zest.'),
      st('Spoon into the tin and bake until a skewer comes out clean.', 45, 180, 'Celsius'),
      st('Mix the lemon juice with the granulated sugar, prick the warm cake all over and pour the drizzle over.'),
      st('Leave in the tin until completely cool.', 30),
    ],
  },
  {
    key: 'curry', photo: 'test-photo.webp',
    title: 'Thai Green Curry', tags: ['main', 'curry', 'quick'], difficulty: 2,
    description: 'Fragrant weeknight curry with chicken and green beans.',
    prep_time_minutes: 10, cook_time_minutes: 20, servings: 4,
    ingredients: [
      ing('vegetable oil', 1, 'tbsp'), ing('green curry paste', 3, 'tbsp'), ing('chicken thighs, sliced', 500, 'g'),
      ing('coconut milk', 400, 'ml'), ing('fish sauce', 1, 'tbsp'), ing('palm sugar', 1, 'tsp'),
      ing('green beans, trimmed', 150, 'g'), ing('Thai basil', 1, 'handful'), ing('lime', 1),
    ],
    steps: [
      st('Fry the curry paste in the oil until fragrant.', 2),
      st('Add the chicken and stir to coat.', 3),
      st('Pour in the coconut milk, fish sauce and sugar and simmer.', 10),
      st('Add the beans and cook until just tender.', 4),
      st('Finish with basil and a squeeze of lime. Serve with jasmine rice.'),
    ],
  },
  {
    key: 'roast', photo: 'test-photo.webp',
    title: 'Sunday Roast Chicken with Lemon, Garlic and Thyme Potatoes', tags: ['main', 'roast'], difficulty: 3,
    description: 'A whole bird roasted over crisp potatoes.',
    prep_time_minutes: 20, cook_time_minutes: 90, servings: 4,
    ingredients: [
      ing('whole chicken', 1.6, 'kg'), ing('lemon', 1, null, 'halved'), ing('garlic bulb', 1, null, 'halved'),
      ing('thyme sprigs', 6), ing('Maris Piper potatoes', 1, 'kg', 'peeled and halved'), ing('olive oil', 3, 'tbsp'),
      ing('butter', 30, 'g'),
    ],
    steps: [
      st('Heat the oven.', null, 200, 'Celsius'),
      st('Parboil the potatoes, drain and shake to rough up the edges.', 8),
      st('Stuff the chicken with lemon, garlic and thyme, rub with butter and season.'),
      st('Sit the chicken on the potatoes in a roasting tin, drizzle with oil and roast.', 80, 200, 'Celsius'),
      st('Rest the chicken under foil while the potatoes crisp up in the oven.', 15),
      st('Carve and serve with the pan juices.'),
    ],
  },
  {
    key: 'pancakes',
    title: 'Pancakes', tags: ['dessert', 'breakfast', 'quick'], difficulty: 1,
    description: null,
    prep_time_minutes: 5, cook_time_minutes: 15, servings: 4,
    ingredients: [ing('plain flour', 100, 'g'), ing('eggs', 2), ing('milk', 300, 'ml'), ing('butter', null, null, 'for the pan')],
    steps: [
      st('Whisk everything into a smooth batter and rest it.', 10),
      st('Heat a little butter in a frying pan and cook each pancake for about a minute a side.', 1),
    ],
  },
  {
    key: 'risotto',
    title: 'Mushroom Risotto', tags: ['main', 'vegetarian'], difficulty: 3,
    description: 'Creamy, earthy and stirred with patience.',
    prep_time_minutes: 10, cook_time_minutes: 35, servings: 4,
    ingredients: [
      ing('dried porcini', 20, 'g'), ing('hot vegetable stock', 1.2, 'l'), ing('butter', 50, 'g'),
      ing('shallots, finely chopped', 2), ing('chestnut mushrooms, sliced', 300, 'g'), ing('arborio rice', 300, 'g'),
      ing('white wine', 125, 'ml'), ing('parmesan', 50, 'g', 'grated'),
    ],
    steps: [
      st('Soak the porcini in a little of the hot stock.', 10),
      st('Soften the shallots in half the butter, then fry the mushrooms until golden.', 8),
      st('Stir in the rice to toast it, then add the wine and let it absorb.', 2),
      st('Add the stock a ladle at a time, stirring, until the rice is just tender.', 20),
      st('Beat in the remaining butter and the parmesan, cover and rest.', 2),
    ],
  },
  {
    key: 'brownies',
    title: 'Chocolate Brownies', tags: ['dessert', 'baking'], difficulty: 2,
    description: 'Fudgy middles, crackly tops.',
    prep_time_minutes: 15, cook_time_minutes: 25, servings: 16,
    ingredients: [ing('dark chocolate', 200, 'g'), ing('butter', 175, 'g'), ing('caster sugar', 325, 'g'), ing('eggs', 3), ing('plain flour', 130, 'g'), ing('cocoa powder', 50, 'g')],
    steps: [
      st('Heat the oven and line a 20cm square tin.', null, 180, 'Celsius'),
      st('Melt the chocolate and butter together, then cool slightly.', 5),
      st('Whisk the eggs and sugar until thick, fold in the chocolate, then the flour and cocoa.'),
      st('Bake until just set with a slight wobble.', 25, 180, 'Celsius'),
    ],
  },
  {
    key: 'shakshuka',
    title: 'Shakshuka', tags: ['main', 'vegetarian', 'breakfast'], difficulty: 2,
    description: 'Eggs poached in spiced tomato and pepper sauce.',
    prep_time_minutes: 10, cook_time_minutes: 25, servings: 2,
    ingredients: [ing('olive oil', 2, 'tbsp'), ing('onion, sliced', 1), ing('red peppers, sliced', 2), ing('cumin', 1, 'tsp'), ing('smoked paprika', 1, 'tsp'), ing('chopped tomatoes', 1, 'tin'), ing('eggs', 4), ing('feta', 50, 'g'), ing('coriander', null, null, 'to serve')],
    steps: [
      st('Soften the onion and peppers in the oil.', 10),
      st('Add the spices, then the tomatoes, and simmer until thick.', 10),
      st('Make four wells, crack in the eggs, cover and cook until the whites set.', 6),
      st('Crumble over the feta and coriander and serve with bread.'),
    ],
  },
  {
    key: 'bread',
    title: 'Banana Bread', tags: ['dessert', 'baking'], difficulty: 1,
    description: 'For the bananas nobody ate.',
    prep_time_minutes: 10, cook_time_minutes: 60, servings: 10,
    ingredients: [ing('ripe bananas, mashed', 3), ing('melted butter', 75, 'g'), ing('light brown sugar', 150, 'g'), ing('egg', 1), ing('vanilla extract', 1, 'tsp'), ing('bicarbonate of soda', 1, 'tsp'), ing('plain flour', 190, 'g')],
    steps: [
      st('Heat the oven and grease a loaf tin.', null, 175, 'Celsius'),
      st('Mix the bananas and butter, then the sugar, egg and vanilla.'),
      st('Fold in the bicarb and flour.'),
      st('Bake until a skewer comes out clean.', 60, 175, 'Celsius'),
    ],
  },
  {
    key: 'bolognese',
    title: 'Weeknight Bolognese', tags: ['main', 'pasta', 'quick'], difficulty: 1,
    description: 'The quick version.',
    prep_time_minutes: 10, cook_time_minutes: 30, servings: 4,
    ingredients: [ing('beef mince', 500, 'g'), ing('onion, chopped', 1), ing('garlic cloves', 2), ing('passata', 500, 'g'), ing('spaghetti', 400, 'g')],
    steps: [
      st('Brown the mince with the onion and garlic.', 8),
      st('Add the passata and simmer.', 20),
      st('Cook the spaghetti, drain and toss with the sauce.', 10),
    ],
  },
];

async function main() {
  const list = await (await fetch(`${BASE}/api/recipes`, { headers: KEY })).json();
  const existing = Array.isArray(list) ? list : (list.recipes || []);
  for (const r of existing) await fetch(`${BASE}/api/recipes/${r.id}`, { method: 'DELETE', headers: KEY });
  const ids = {};
  for (const r of RECIPES) {
    const { key, photo, ...body } = r;
    const res = await fetch(`${BASE}/api/recipes`, { method: 'POST', headers: { ...KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`create ${key}: ${res.status} ${await res.text()}`);
    ids[key] = (await res.json()).id;
    if (photo) {
      const fd = new FormData();
      const buf = fs.readFileSync(path.join(FIX, photo));
      const type = photo.endsWith('.png') ? 'image/png' : photo.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      fd.append('photo', new Blob([buf], { type }), photo);
      const pr = await fetch(`${BASE}/api/recipes/${ids[key]}/photo`, { method: 'POST', headers: KEY, body: fd });
      if (!pr.ok) console.error(`photo ${key}: ${pr.status} ${await pr.text()}`);
    }
  }
  console.log(JSON.stringify({ ids }, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
