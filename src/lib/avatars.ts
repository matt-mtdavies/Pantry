export const AVATARS = [
  { id: 'herb',       emoji: '🌿', label: 'Herb' },
  { id: 'lemon',      emoji: '🍋', label: 'Lemon' },
  { id: 'orange',     emoji: '🍊', label: 'Orange' },
  { id: 'apple',      emoji: '🍎', label: 'Apple' },
  { id: 'peach',      emoji: '🍑', label: 'Peach' },
  { id: 'mango',      emoji: '🥭', label: 'Mango' },
  { id: 'pineapple',  emoji: '🍍', label: 'Pineapple' },
  { id: 'grapes',     emoji: '🍇', label: 'Grapes' },
  { id: 'strawberry', emoji: '🍓', label: 'Strawberry' },
  { id: 'cherry',     emoji: '🍒', label: 'Cherry' },
  { id: 'kiwi',       emoji: '🥝', label: 'Kiwi' },
  { id: 'blueberry',  emoji: '🫐', label: 'Blueberry' },
  { id: 'watermelon', emoji: '🍉', label: 'Watermelon' },
  { id: 'avocado',    emoji: '🥑', label: 'Avocado' },
  { id: 'tomato',     emoji: '🍅', label: 'Tomato' },
  { id: 'pepper',     emoji: '🌶️', label: 'Pepper' },
  { id: 'mushroom',   emoji: '🍄', label: 'Mushroom' },
  { id: 'carrot',     emoji: '🥕', label: 'Carrot' },
  { id: 'corn',       emoji: '🌽', label: 'Corn' },
  { id: 'broccoli',   emoji: '🥦', label: 'Broccoli' },
  { id: 'garlic',     emoji: '🧄', label: 'Garlic' },
  { id: 'olive',      emoji: '🫒', label: 'Olive' },
]

export const AVATAR_MAP: Record<string, string> = Object.fromEntries(
  AVATARS.map(a => [a.id, a.emoji])
)

export function avatarEmoji(id: string | null | undefined): string {
  return AVATAR_MAP[id ?? ''] ?? '🌿'
}
