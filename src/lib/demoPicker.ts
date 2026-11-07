// The recorded "What's for dinner tonight?" example shown in the tour and on
// the landing page. Ideas are demo recipes, so they carry the demo photos
// (including any hand-picked Unsplash photo). Labelled "Example result" where shown.

export const PICKER_INPUT = ['eggs', 'spinach', 'feta']

export const PICKER_IDEAS: { recipeId: string; time: string; shopping: string[] }[] = [
  { recipeId: 'de300000000000000000000000000009', time: '10 min', shopping: [] },                                  // Spinach & feta omelette
  { recipeId: 'de300000000000000000000000000001', time: '30 min', shopping: ['tin chopped tomatoes', 'red pepper'] }, // Shakshuka
  { recipeId: 'de300000000000000000000000000005', time: '35 min', shopping: ['tin chickpeas', 'coconut milk'] },     // Chickpea & spinach curry
]

export const shoppingLabel = (items: string[]) => items.length ? `Shopping list: ${items.join(', ')}` : 'Nothing to buy'
