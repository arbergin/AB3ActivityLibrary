export type ActivityDetailsMarkdownRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type ActivityDetailsMarkdownBlock =
  | { type: "paragraph"; runs: ActivityDetailsMarkdownRun[] }
  | { type: "bullet"; runs: ActivityDetailsMarkdownRun[] }
  | { type: "blank" };

type FormatFlags = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

function pushRun(
  runs: ActivityDetailsMarkdownRun[],
  text: string,
  formats: FormatFlags
) {
  if (!text) {
    return;
  }

  const previousRun = runs[runs.length - 1];

  if (
    previousRun &&
    Boolean(previousRun.bold) === Boolean(formats.bold) &&
    Boolean(previousRun.italic) === Boolean(formats.italic) &&
    Boolean(previousRun.underline) === Boolean(formats.underline)
  ) {
    previousRun.text += text;
    return;
  }

  runs.push({
    text,
    ...(formats.bold ? { bold: true } : {}),
    ...(formats.italic ? { italic: true } : {}),
    ...(formats.underline ? { underline: true } : {}),
  });
}

function findClosingMarker(
  value: string,
  marker: "**" | "*" | "++",
  startIndex: number
) {
  return value.indexOf(marker, startIndex + marker.length);
}

function parseInlineRange(
  value: string,
  runs: ActivityDetailsMarkdownRun[],
  formats: FormatFlags
) {
  let index = 0;
  let plainTextStart = 0;

  function flushPlainText(endIndex: number) {
    if (endIndex > plainTextStart) {
      pushRun(runs, value.slice(plainTextStart, endIndex), formats);
    }
  }

  while (index < value.length) {
    let marker: "**" | "*" | "++" | null = null;
    let nextFormats: FormatFlags | null = null;

    if (value.startsWith("**", index)) {
      marker = "**";
      nextFormats = { ...formats, bold: true };
    } else if (value.startsWith("++", index)) {
      marker = "++";
      nextFormats = { ...formats, underline: true };
    } else if (value.startsWith("*", index)) {
      marker = "*";
      nextFormats = { ...formats, italic: true };
    }

    if (!marker || !nextFormats) {
      index += 1;
      continue;
    }

    const closingIndex = findClosingMarker(value, marker, index);

    if (closingIndex === -1) {
      index += marker.length;
      continue;
    }

    flushPlainText(index);

    const innerValue = value.slice(index + marker.length, closingIndex);
    parseInlineRange(innerValue, runs, nextFormats);

    index = closingIndex + marker.length;
    plainTextStart = index;
  }

  flushPlainText(value.length);
}

export function parseActivityDetailsInline(
  value: string
): ActivityDetailsMarkdownRun[] {
  const runs: ActivityDetailsMarkdownRun[] = [];

  parseInlineRange(value, runs, {});

  return runs.length > 0 ? runs : [{ text: "" }];
}

export function parseActivityDetailsMarkdown(
  value?: string | null
): ActivityDetailsMarkdownBlock[] {
  const normalized = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n");

  if (!normalized.trim()) {
    return [];
  }

  return normalized.split("\n").map((line) => {
    if (!line.trim()) {
      return { type: "blank" } as const;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);

    if (bulletMatch) {
      return {
        type: "bullet",
        runs: parseActivityDetailsInline(bulletMatch[1]),
      } as const;
    }

    return {
      type: "paragraph",
      runs: parseActivityDetailsInline(line),
    } as const;
  });
}

export function stripActivityDetailsMarkdown(value?: string | null) {
  return String(value ?? "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\+\+([^+\n]+)\+\+/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ");
}
