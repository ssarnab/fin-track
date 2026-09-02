// Shared category vocabulary + a stable name → color mapping, so the same
// category always renders the same color everywhere (Templates picker,
// Progress breakdown) instead of shifting with array position.

export const CATEGORY_PRESETS = [
  "Work",
  "Exercise",
  "Sleep",
  "Self-care",
  "Meals",
  "Commute",
  "Rest",
  "Family",
  "Personal",
];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function categoryColor(category: string): string {
  return CHART_COLORS[hashString(category) % CHART_COLORS.length];
}
