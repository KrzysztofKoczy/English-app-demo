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
