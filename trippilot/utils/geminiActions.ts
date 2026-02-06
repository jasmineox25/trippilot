export type HasId = { id: string };

export function applyGeminiReorder<T extends HasId>(
  places: T[],
  target?: string,
): T[] {
  const raw = String(target || "").trim();
  if (!raw) return places;

  const ids = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (ids.length < 2) return places;

  const byId = new Map(places.map((p) => [p.id, p] as const));
  const reordered: T[] = [];

  ids.forEach((id) => {
    const p = byId.get(id);
    if (p) reordered.push(p);
  });

  // Append any missing stops to preserve user intent.
  places.forEach((p) => {
    if (!ids.includes(p.id)) reordered.push(p);
  });

  // If we didn't actually reorder, keep original.
  if (reordered.length !== places.length) return places;
  const same = places.every((p, i) => reordered[i]?.id === p.id);
  return same ? places : reordered;
}
