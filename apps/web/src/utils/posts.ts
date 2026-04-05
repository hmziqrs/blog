export function sortByDateDesc<T extends { data: { date: Date } }>(items: readonly T[]) {
  return items.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function collectSortedValues(values: Iterable<string>) {
  return [...new Set(values)].toSorted((a, b) => a.localeCompare(b));
}

export function countSortedValues(values: Iterable<string>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].toSorted(([left], [right]) => left.localeCompare(right));
}
