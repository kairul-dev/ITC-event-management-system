export type UploadedPaperworkFile = {
  name: string;
  path: string;
  type: string;
  size: number;
  uploadedAt: string;
};

const PAPERWORK_FILE_MARKER = "__ITC_PAPERWORK_FILE__";
const PAPERWORK_FILE_PATTERN = new RegExp(
  String.raw`\n*${PAPERWORK_FILE_MARKER}(\{[\s\S]*?\})${PAPERWORK_FILE_MARKER}\n*`,
  "m",
);

export function appendPaperworkFileMarker(
  value: string,
  file: UploadedPaperworkFile,
) {
  const cleanValue = stripPaperworkFileMarker(value);
  return `${cleanValue}${cleanValue ? "\n\n" : ""}${PAPERWORK_FILE_MARKER}${JSON.stringify(file)}${PAPERWORK_FILE_MARKER}`;
}

export function stripPaperworkFileMarker(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(PAPERWORK_FILE_PATTERN, "").trim();
}

export function getPaperworkFile(
  ...values: Array<string | null | undefined>
): UploadedPaperworkFile | null {
  for (const value of values) {
    const match = value?.match(PAPERWORK_FILE_PATTERN);
    if (!match?.[1]) continue;

    try {
      const parsed = JSON.parse(match[1]) as UploadedPaperworkFile;
      if (parsed?.path && parsed?.name) return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

export function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
