// The four editorial lenses: a curation layer over the existing topic lanes.
// Topic answers "what is this about," lens answers "why should I care" --
// admin-curated only, never inferred by the (frozen) generator.
export const EDITORIAL_LENSES = [
  { value: "worth-watching", label: "Worth Watching" },
  { value: "worth-building", label: "Worth Building" },
  { value: "worth-trying", label: "Worth Trying" },
  { value: "worth-questioning", label: "Worth Questioning" },
] as const;

export type EditorialLensValue = (typeof EDITORIAL_LENSES)[number]["value"];

export function getEditorialLensLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return EDITORIAL_LENSES.find((lens) => lens.value === value)?.label || null;
}
