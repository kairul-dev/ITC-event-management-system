import { stripPaperworkFileMarker } from "./paperworkFile";
import { stripEventPosterMarker } from "./eventPoster";

const SECTION_HEADING_PATTERN =
  /(?:^|\n)\s*(?:\d{1,2}\.0|LAMPIRAN\s+\d*)\s+[^\n]+/gi;

const normalizeWhitespace = (value: string) =>
  stripEventPosterMarker(stripPaperworkFileMarker(value))
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const extractNumberedSection = (
  value: string | null | undefined,
  heading: string,
) => {
  if (!value) return "";

  const normalized = normalizeWhitespace(value);
  const headingPattern = new RegExp(
    String.raw`(?:^|\n)\s*${escapeRegExp(heading)}\s*(?:\n|:)?`,
    "i",
  );
  const headingMatch = headingPattern.exec(normalized);

  if (!headingMatch) return "";

  const contentStart = headingMatch.index + headingMatch[0].length;
  const rest = normalized.slice(contentStart);
  const nextHeading = SECTION_HEADING_PATTERN.exec(rest);
  SECTION_HEADING_PATTERN.lastIndex = 0;

  return normalizeWhitespace(nextHeading ? rest.slice(0, nextHeading.index) : rest);
};

export const getPurposeText = (purpose: string | null | undefined) =>
  extractNumberedSection(purpose, "1.0 TUJUAN") || normalizeWhitespace(purpose || "");

export const getObjectiveText = (
  purpose: string | null | undefined,
  objective: string | null | undefined,
) =>
  extractNumberedSection(purpose, "5.0 OBJEKTIF AKTIVITI") ||
  extractNumberedSection(objective, "5.0 OBJEKTIF AKTIVITI") ||
  normalizeWhitespace(objective || "");
