// Demo account content: the recipes, collections and favourites the demo
// account is seeded with (functions/api/admin/seed-demo.ts) and that the
// public read-only demo (/demo) renders. One source, so they can't drift.
// No credentials here — this file is bundled into the web app.

export const DEMO_USER_ID = '00000000-de30-4000-8000-000000000001'
export const DEMO_DISPLAY_NAME = 'Demo Cook'

/** Demo photos: static assets in public/demo/<name>.jpg, copied into R2 as
 *  demo/<name>.jpg at seed time (/api/images also falls back to the static
 *  file). All CC0 / public domain, resized to ≤1200px (some cropped):
 *   shakshuka — "Shakshuka (Unsplash).jpg", Jarosław Ceborski · Wikimedia Commons
 *   chilli    — "Chili con carne cuisson.jpg" · Wikimedia Commons
 *   omelette  — "Egg and spinach breakfast omelet.jpg" · Wikimedia Commons
 *   risotto   — "RISOTTO POLLO E FUNGHI - Marrocco's 2025-05-09.jpg" · Wikimedia Commons
 *   traybake  — "Free roast chicken rosemary image" · rawpixel (CC0)
 *   aglio     — "Close-up photograph of white spaghetti with sprinkled cheese, herbs and garlic bread", Astha Jain · WordPress Photo Directory
 *   curry     — "Free vegan chickpea curry image" · rawpixel (CC0)
 *   pancakes  — "A plate of three fluffy pancakes…", diegolopez97 · WordPress Photo Directory
 *   salmon    — "Grilled salmon fillet served with sautéed vegetables", Muhammad Yeasin · WordPress Photo Directory
 *   muffins   — "Banana muffins", Myamin39 · Wikimedia Commons */
export const DEMO_PHOTOS = ['shakshuka', 'chilli', 'omelette', 'risotto', 'traybake', 'aglio', 'curry', 'pancakes', 'salmon', 'muffins'] as const
export type DemoPhoto = typeof DEMO_PHOTOS[number]
export const demoPhotoKey = (name: DemoPhoto) => `demo/${name}.jpg`
export const demoPhotoAsset = (name: DemoPhoto) => `/demo/${name}.jpg`

/** Fixed share link for the shakshuka recipe: /share/<token>. */
export const DEMO_SHARE_TOKEN = 'de30a7c1f2b84e6d9a0c5b31'

export interface DemoIngredient { amount: string; unit: string; name: string }

export interface DemoRecipe {
  id: string
  title: string
  description: string
  servings: number
  prep_time: number
  cook_time: number
  ingredients: DemoIngredient[]
  steps: string[]
  tags: string[]
  calories_per_serving: number
  cost_per_serving: number // USD
  source_guess?: string
  source_url?: string
  photo?: DemoPhoto
  share?: boolean
  favourite?: boolean
}

const i = (amount: string, unit: string, name: string): DemoIngredient => ({ amount, unit, name })

export const DEMO_RECIPES: DemoRecipe[] = [
  {
    id: 'de300000000000000000000000000001',
    title: 'Shakshuka',
    description: 'Eggs gently poached in a smoky, spiced tomato and pepper sauce. One pan, on the table in 30 minutes.',
    servings: 2, prep_time: 10, cook_time: 20,
    ingredients: [
      i('2', 'tbsp', 'olive oil'),
      i('1', '', 'onion, finely sliced'),
      i('1', '', 'red pepper, sliced'),
      i('2', '', 'garlic cloves, crushed'),
      i('1', 'tsp', 'ground cumin'),
      i('1', 'tsp', 'smoked paprika'),
      i('400', 'g', 'tin chopped tomatoes'),
      i('4', '', 'eggs'),
      i('50', 'g', 'feta, crumbled'),
      i('1', 'small bunch', 'coriander, chopped'),
    ],
    steps: [
      'Heat the oil in a large frying pan over a medium heat. Add the onion and pepper and cook for 8 minutes until soft and starting to colour.',
      'Stir in the garlic, cumin and paprika and cook for 1 minute until fragrant.',
      'Tip in the tomatoes, season, and simmer for 8–10 minutes until thickened.',
      'Make four wells in the sauce and crack an egg into each. Cover and cook for 5–7 minutes until the whites are set but the yolks are still runny.',
      'Scatter over the feta and coriander and serve straight from the pan with crusty bread.',
    ],
    tags: ['breakfast', 'vegetarian', 'one-pan', 'middle eastern'],
    calories_per_serving: 380, cost_per_serving: 2.4,
    photo: 'shakshuka', share: true, favourite: true,
  },
  {
    id: 'de300000000000000000000000000002',
    title: 'Chilli con carne',
    description: 'A classic beef chilli with kidney beans — imported from a recipe site.',
    servings: 4, prep_time: 15, cook_time: 45,
    ingredients: [
      i('1', '', 'large onion, diced'),
      i('1', '', 'red pepper, chopped'),
      i('2', '', 'garlic cloves, finely chopped'),
      i('1', 'tbsp', 'oil'),
      i('1', 'tsp', 'hot chilli powder'),
      i('1', 'tsp', 'paprika'),
      i('1', 'tsp', 'ground cumin'),
      i('500', 'g', 'lean minced beef'),
      i('1', '', 'beef stock cube'),
      i('400', 'g', 'tin chopped tomatoes'),
      i('½', 'tsp', 'dried marjoram'),
      i('1', 'tsp', 'sugar'),
      i('2', 'tbsp', 'tomato purée'),
      i('410', 'g', 'tin red kidney beans, drained'),
      i('', '', 'long grain rice, to serve'),
      i('', '', 'soured cream, to serve'),
    ],
    steps: [
      'Heat the oil in a large pan over a medium heat and soften the onion for about 5 minutes.',
      'Add the garlic, red pepper, chilli powder, paprika and cumin. Stir and cook for another 5 minutes.',
      'Turn up the heat, add the mince and break it up. Keep stirring for at least 5 minutes until browned all over.',
      'Crumble the stock cube into 300ml hot water and pour it in with the tomatoes, marjoram, sugar and tomato purée. Season well.',
      'Bring to the boil, cover and simmer gently for 20 minutes, stirring now and then.',
      'Stir in the kidney beans and simmer uncovered for 10 minutes more. Turn off the heat and rest, covered, for 10 minutes.',
      'Serve with rice and soured cream.',
    ],
    tags: ['dinner', 'beef', 'batch cook', 'mexican'],
    calories_per_serving: 520, cost_per_serving: 3.1,
    photo: 'chilli',
    source_guess: 'BBC Good Food',
    source_url: 'https://www.bbcgoodfood.com/recipes/chilli-con-carne-recipe',
  },
  {
    id: 'de300000000000000000000000000003',
    title: 'Lemon garlic chicken traybake',
    description: 'Chicken thighs roasted over potatoes and courgette with lemon, garlic and thyme. Minimal washing up.',
    servings: 4, prep_time: 15, cook_time: 45,
    ingredients: [
      i('8', '', 'bone-in chicken thighs'),
      i('750', 'g', 'baby potatoes, halved'),
      i('2', '', 'courgettes, cut into chunks'),
      i('1', '', 'red onion, cut into wedges'),
      i('1', '', 'lemon'),
      i('6', '', 'garlic cloves, unpeeled'),
      i('3', 'tbsp', 'olive oil'),
      i('4', 'sprigs', 'thyme'),
    ],
    steps: [
      'Heat the oven to 200C/180C fan. Toss the potatoes, onion and garlic with 2 tbsp oil in a large roasting tin and season.',
      'Nestle the chicken thighs on top, skin-side up. Rub with the remaining oil, season, and squeeze over half the lemon.',
      'Cut the other lemon half into wedges and tuck into the tin with the thyme. Roast for 25 minutes.',
      'Add the courgettes, turn the potatoes, and roast for another 20 minutes until the chicken skin is golden and the juices run clear.',
      'Squeeze the roasted garlic out of its skins over everything before serving.',
    ],
    tags: ['dinner', 'chicken', 'traybake', 'weeknight'],
    calories_per_serving: 610, cost_per_serving: 3.6,
    photo: 'traybake',
    favourite: true,
  },
  {
    id: 'de300000000000000000000000000004',
    title: 'Spaghetti aglio e olio',
    description: 'Garlic, chilli, olive oil and parsley. A store-cupboard pasta that takes as long as the spaghetti does.',
    servings: 2, prep_time: 5, cook_time: 12,
    ingredients: [
      i('200', 'g', 'spaghetti'),
      i('4', '', 'garlic cloves, thinly sliced'),
      i('5', 'tbsp', 'extra virgin olive oil'),
      i('½', 'tsp', 'dried chilli flakes'),
      i('1', 'small bunch', 'flat-leaf parsley, chopped'),
      i('30', 'g', 'parmesan, finely grated'),
    ],
    steps: [
      'Cook the spaghetti in plenty of well-salted boiling water until al dente. Reserve a mug of the pasta water before draining.',
      'Meanwhile, warm the oil and garlic in a large frying pan over a low heat for 3–4 minutes until the garlic is pale gold — don\'t let it brown.',
      'Add the chilli flakes, then the drained spaghetti and a splash of pasta water. Toss hard for a minute until glossy.',
      'Stir through the parsley and parmesan, loosen with more pasta water if needed, and serve.',
    ],
    tags: ['dinner', 'pasta', 'quick', 'vegetarian', 'italian'],
    calories_per_serving: 640, cost_per_serving: 1.3,
    photo: 'aglio',
  },
  {
    id: 'de300000000000000000000000000005',
    title: 'Chickpea & spinach curry',
    description: 'A mild, creamy coconut curry that comes together from tins and a bag of spinach.',
    servings: 4, prep_time: 10, cook_time: 25,
    ingredients: [
      i('1', 'tbsp', 'vegetable oil'),
      i('1', '', 'onion, chopped'),
      i('3', '', 'garlic cloves, grated'),
      i('1', 'thumb', 'fresh ginger, grated'),
      i('2', 'tbsp', 'medium curry powder'),
      i('400', 'g', 'tin chopped tomatoes'),
      i('400', 'ml', 'tin coconut milk'),
      i('2 × 400', 'g', 'tins chickpeas, drained'),
      i('200', 'g', 'baby spinach'),
      i('½', '', 'lime, juiced'),
      i('', '', 'basmati rice, to serve'),
    ],
    steps: [
      'Fry the onion in the oil for 6–8 minutes until soft. Add the garlic, ginger and curry powder and cook for 1 minute.',
      'Pour in the tomatoes and coconut milk, add the chickpeas, and simmer for 15 minutes until thickened.',
      'Stir in the spinach a handful at a time until wilted. Season and finish with the lime juice.',
      'Serve with basmati rice.',
    ],
    tags: ['dinner', 'vegan', 'curry', 'indian', 'batch cook'],
    calories_per_serving: 430, cost_per_serving: 1.9,
    photo: 'curry',
  },
  {
    id: 'de300000000000000000000000000006',
    title: 'Fluffy buttermilk pancakes',
    description: 'Thick American-style pancakes. Plain yogurt loosened with milk stands in for buttermilk.',
    servings: 4, prep_time: 10, cook_time: 15,
    ingredients: [
      i('200', 'g', 'plain flour'),
      i('2', 'tsp', 'baking powder'),
      i('1', 'tbsp', 'caster sugar'),
      i('2', '', 'eggs'),
      i('150', 'g', 'natural yogurt'),
      i('150', 'ml', 'milk'),
      i('25', 'g', 'butter, melted, plus extra for the pan'),
      i('', '', 'maple syrup and berries, to serve'),
    ],
    steps: [
      'Whisk the flour, baking powder, sugar and a pinch of salt in a large bowl.',
      'In a jug, whisk the eggs, yogurt, milk and melted butter. Pour into the dry ingredients and stir until just combined — a few lumps are fine.',
      'Heat a non-stick pan over a medium heat with a little butter. Add ladlefuls of batter and cook for 2 minutes until bubbles appear, then flip and cook for 1 minute more.',
      'Keep warm while you cook the rest. Serve stacked with maple syrup and berries.',
    ],
    tags: ['breakfast', 'brunch', 'vegetarian', 'american'],
    calories_per_serving: 360, cost_per_serving: 0.9,
    photo: 'pancakes',
    favourite: true,
  },
  {
    id: 'de300000000000000000000000000007',
    title: 'Salmon with lemon butter & greens',
    description: 'Crisp-skinned salmon fillets with a quick lemon butter sauce and garlicky tenderstem broccoli.',
    servings: 2, prep_time: 5, cook_time: 15,
    ingredients: [
      i('2', '', 'skin-on salmon fillets'),
      i('200', 'g', 'tenderstem broccoli'),
      i('1', '', 'garlic clove, sliced'),
      i('1', 'tbsp', 'olive oil'),
      i('30', 'g', 'butter'),
      i('1', '', 'lemon, zested and juiced'),
      i('1', 'tbsp', 'capers'),
    ],
    steps: [
      'Pat the salmon dry and season. Heat the oil in a frying pan over a medium-high heat and cook skin-side down for 5 minutes until crisp.',
      'Flip and cook for 2–3 minutes more. Lift onto plates.',
      'Meanwhile, steam the broccoli for 4 minutes, then toss with the sliced garlic in the salmon pan for 1 minute.',
      'Turn the heat down, add the butter, lemon zest, juice and capers to the pan and swirl until foaming. Spoon over the salmon and serve with the broccoli.',
    ],
    tags: ['dinner', 'fish', 'quick', 'weeknight'],
    calories_per_serving: 540, cost_per_serving: 5.2,
    photo: 'salmon',
  },
  {
    id: 'de300000000000000000000000000008',
    title: 'Mushroom risotto',
    description: 'A rich, creamy risotto with chestnut mushrooms, thyme and parmesan.',
    servings: 4, prep_time: 10, cook_time: 30,
    ingredients: [
      i('300', 'g', 'risotto rice (arborio)'),
      i('250', 'g', 'chestnut mushrooms, sliced'),
      i('1', '', 'onion, finely chopped'),
      i('2', '', 'garlic cloves, crushed'),
      i('1.2', 'l', 'hot vegetable stock'),
      i('125', 'ml', 'dry white wine'),
      i('40', 'g', 'butter'),
      i('50', 'g', 'parmesan, grated'),
      i('3', 'sprigs', 'thyme, leaves picked'),
      i('1', 'tbsp', 'olive oil'),
    ],
    steps: [
      'Fry the mushrooms in the oil and half the butter over a high heat until golden. Spoon out and set aside.',
      'Lower the heat, add the onion and cook gently for 5 minutes. Add the garlic and thyme for 1 minute, then the rice, stirring until the grains turn translucent at the edges.',
      'Pour in the wine and let it bubble away. Add the stock a ladleful at a time, stirring and letting each addition absorb before adding the next, for about 20 minutes until the rice is just tender.',
      'Stir in the mushrooms, remaining butter and the parmesan. Cover and rest for 2 minutes before serving.',
    ],
    tags: ['dinner', 'vegetarian', 'rice', 'italian'],
    calories_per_serving: 470, cost_per_serving: 2.2,
    photo: 'risotto',
  },
  {
    id: 'de300000000000000000000000000009',
    title: 'Spinach & feta omelette',
    description: 'A soft folded omelette for one — a good home for the end of a bag of spinach.',
    servings: 1, prep_time: 3, cook_time: 5,
    ingredients: [
      i('3', '', 'eggs'),
      i('1', 'handful', 'baby spinach'),
      i('30', 'g', 'feta, crumbled'),
      i('1', 'tsp', 'butter'),
      i('', '', 'black pepper'),
    ],
    steps: [
      'Beat the eggs with a pinch of salt and plenty of pepper.',
      'Melt the butter in a small non-stick pan over a medium heat. Wilt the spinach for 30 seconds, then pour in the eggs.',
      'Stir gently with a spatula, drawing the set edges to the middle, until almost set but still a little runny on top.',
      'Scatter over the feta, fold in half and slide onto a plate.',
    ],
    tags: ['breakfast', 'lunch', 'vegetarian', 'quick'],
    calories_per_serving: 330, cost_per_serving: 1.4,
    photo: 'omelette',
  },
  {
    id: 'de30000000000000000000000000000a',
    title: 'Banana oat breakfast muffins',
    description: 'Lightly sweet muffins made with overripe bananas and oats. Freeze well for grab-and-go breakfasts.',
    servings: 12, prep_time: 15, cook_time: 22,
    ingredients: [
      i('3', '', 'very ripe bananas, mashed'),
      i('2', '', 'eggs'),
      i('80', 'ml', 'vegetable oil'),
      i('75', 'g', 'light brown sugar'),
      i('150', 'g', 'self-raising flour'),
      i('100', 'g', 'rolled oats'),
      i('1', 'tsp', 'ground cinnamon'),
      i('½', 'tsp', 'bicarbonate of soda'),
    ],
    steps: [
      'Heat the oven to 190C/170C fan and line a 12-hole muffin tin with cases.',
      'Whisk the bananas, eggs, oil and sugar together in a large bowl.',
      'Fold in the flour, oats, cinnamon and bicarbonate of soda until just combined.',
      'Divide between the cases and bake for 20–22 minutes until risen and a skewer comes out clean. Cool on a wire rack.',
    ],
    tags: ['breakfast', 'baking', 'make ahead'],
    calories_per_serving: 190, cost_per_serving: 0.4,
    photo: 'muffins',
  },
]

export interface DemoCollection { id: string; name: string; recipe_ids: string[] }

export const DEMO_COLLECTIONS: DemoCollection[] = [
  {
    id: 'de30c0000000000a',
    name: 'Weeknight dinners',
    recipe_ids: [
      'de300000000000000000000000000003',
      'de300000000000000000000000000004',
      'de300000000000000000000000000005',
      'de300000000000000000000000000007',
    ],
  },
  {
    id: 'de30c0000000000b',
    name: 'Weekend brunch',
    recipe_ids: [
      'de300000000000000000000000000001',
      'de300000000000000000000000000006',
      'de300000000000000000000000000009',
      'de30000000000000000000000000000a',
    ],
  },
]
