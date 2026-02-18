const categoryEmojiMap: Record<string, string> = {
  tacos: '🌮',
  bebidas: '🥤',
  aguas: '💧',
  extras: '🧀',
  postres: '🍮',
  promociones: '🏷️',
  tortas: '🥪',
  quesadillas: '🫔',
  sopas: '🍲',
  ensaladas: '🥗',
  desayunos: '🍳',
  carnes: '🥩',
  mariscos: '🦐',
  antojitos: '🫓',
  cervezas: '🍺',
  cockteles: '🍹',
};

export function getCategoryEmoji(name: string): string {
  const key = name.toLowerCase().trim();
  return categoryEmojiMap[key] ?? '🍽️';
}
