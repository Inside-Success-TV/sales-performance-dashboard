import type { JsonObject } from "@/lib/types";

export function normalizeStringList(value: unknown): string[] {
  const parsed = normalizeJsonValue(value);

  if (Array.isArray(parsed)) {
    return parsed.flatMap(normalizeStringList).filter(Boolean);
  }

  if (typeof parsed === "string") {
    return splitListText(parsed);
  }

  if (parsed && typeof parsed === "object") {
    return Object.values(parsed)
      .flatMap(normalizeStringList)
      .filter(Boolean);
  }

  if (parsed === null || parsed === undefined) return [];
  return splitListText(String(parsed));
}

function normalizeJsonValue(value: unknown): JsonObject | string | unknown[] | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value as JsonObject;
  return String(value);
}

function splitListText(value: string): string[] {
  const text = value.trim();
  if (!text) return [];

  const bulletParts = text
    .split(/\s*•\s+/)
    .map(cleanListItem)
    .filter(Boolean);
  if (bulletParts.length > 1) return bulletParts.flatMap(splitListText);

  const lineParts = text
    .split(/\r?\n+/)
    .map(cleanListItem)
    .filter(Boolean);
  if (lineParts.length > 1) return lineParts.flatMap(splitListText);

  return splitNumberedText(text).map(cleanListItem).filter(Boolean);
}

function splitNumberedText(value: string): string[] {
  const markers = [...value.matchAll(/(?:^|\s)(?:\(?(\d{1,2})[.)]\)?)\s+/g)].map((match) => ({
    number: Number(match[1]),
    index: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  const hasSequentialList = markers.length >= 2 && markers[0].number === 1 && markers[1].number === 2;
  if (!hasSequentialList) return [value];

  return markers.map((marker, index) => {
    const next = markers[index + 1];
    return value.slice(marker.end, next?.index ?? value.length);
  });
}

function cleanListItem(value: string) {
  return value
    .trim()
    .replace(/^[•*-]\s+/, "")
    .replace(/^\(?\d{1,2}[.)]\)?\s+/, "")
    .trim();
}
