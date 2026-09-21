/** Fisher–Yates on a copy; preserve the source answer key. */
export function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffleOptions<T extends { options: string[]; correctOptionIndex: number }>(question: T): T {
  const order = shuffled(question.options.map((_, index) => index));
  return { ...question, options: order.map(index => question.options[index]), correctOptionIndex: order.indexOf(question.correctOptionIndex) };
}

/** Select five tasks per available band before shuffling answers. Keep source level IDs. */
export function battleQuestions<T extends { level: string }>(pool: readonly T[]): T[] {
  const cefr = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const levels = [...new Set(pool.map(q => q.level))].sort((a, b) =>
    cefr.includes(a) && cefr.includes(b) ? cefr.indexOf(a) - cefr.indexOf(b) : a.localeCompare(b, 'en', { numeric: true }));
  return levels.flatMap(level => shuffled(pool.filter(q => q.level === level)).slice(0, 5));
}
