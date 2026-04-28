/**
 * Core utility functions
 */

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function truncate(text, maxChars) {
  if (!text || !maxChars || text.length <= maxChars) return text || "";
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

export function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}
