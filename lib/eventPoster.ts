export type UploadedEventPoster = {
  name: string;
  path: string;
  type: string;
  size: number;
  uploadedAt: string;
  publicUrl: string;
};

const EVENT_POSTER_MARKER = "__ITC_EVENT_POSTER__";
const EVENT_POSTER_PATTERN = new RegExp(
  String.raw`\n*${EVENT_POSTER_MARKER}(\{[\s\S]*?\})${EVENT_POSTER_MARKER}\n*`,
  "m",
);

export function appendEventPosterMarker(
  value: string,
  poster: UploadedEventPoster,
) {
  const cleanValue = stripEventPosterMarker(value);
  return `${cleanValue}${cleanValue ? "\n\n" : ""}${EVENT_POSTER_MARKER}${JSON.stringify(poster)}${EVENT_POSTER_MARKER}`;
}

export function stripEventPosterMarker(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(EVENT_POSTER_PATTERN, "").trim();
}

export function getEventPoster(
  ...values: Array<string | null | undefined>
): UploadedEventPoster | null {
  for (const value of values) {
    const match = value?.match(EVENT_POSTER_PATTERN);
    if (!match?.[1]) continue;

    try {
      const parsed = JSON.parse(match[1]) as UploadedEventPoster;
      if (parsed?.path && parsed?.publicUrl) return parsed;
    } catch {
      return null;
    }
  }

  return null;
}
