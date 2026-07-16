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

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\+\+[^+\n]+\+\+)/g;

export function parseActivityDetailsInline(value: string): ActivityDetailsMarkdownRun[] {
  const runs: ActivityDetailsMarkdownRun[] = [];
  let lastIndex = 0;
  for (const match of value.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) runs.push({ text: value.slice(lastIndex, index) });
    const token = match[0];
    if (token.startsWith("**")) runs.push({ text: token.slice(2, -2), bold: true });
    else if (token.startsWith("*")) runs.push({ text: token.slice(1, -1), italic: true });
    else runs.push({ text: token.slice(2, -2), underline: true });
    lastIndex = index + token.length;
  }
  if (lastIndex < value.length) runs.push({ text: value.slice(lastIndex) });
  return runs.length > 0 ? runs : [{ text: "" }];
}

export function parseActivityDetailsMarkdown(value?: string | null): ActivityDetailsMarkdownBlock[] {
  const normalized = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\\n/g, "\n");
  if (!normalized.trim()) return [];
  return normalized.split("\n").map((line) => {
    if (!line.trim()) return { type: "blank" } as const;
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (bulletMatch) return { type: "bullet", runs: parseActivityDetailsInline(bulletMatch[1]) } as const;
    return { type: "paragraph", runs: parseActivityDetailsInline(line) } as const;
  });
}

export function stripActivityDetailsMarkdown(value?: string | null) {
  return String(value ?? "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\+\+([^+\n]+)\+\+/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ");
}
