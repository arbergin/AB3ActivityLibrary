"use client";

import { useEffect, useRef } from "react";

type ActivityDetailsEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  expanded?: boolean;
  rows?: number;
  placeholder?: string;
};

type FormatCommand = "bold" | "italic" | "underline" | "insertUnorderedList";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInlineMarkdown(value: string) {
  let html = escapeHtml(value);

  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  html = html.replace(/\+\+([^+\n]+)\+\+/g, "<u>$1</u>");

  return html;
}

function markdownToHtml(value: string) {
  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n");

  const lines = normalized.split("\n");
  const output: string[] = [];
  let bulletItems: string[] = [];

  function flushBullets() {
    if (bulletItems.length === 0) return;

    output.push(
      `<ul>${bulletItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`
    );
    bulletItems = [];
  }

  lines.forEach((line) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);

    if (bulletMatch) {
      bulletItems.push(bulletMatch[1]);
      return;
    }

    flushBullets();

    if (!line.trim()) {
      output.push("<div><br></div>");
      return;
    }

    output.push(`<div>${renderInlineMarkdown(line)}</div>`);
  });

  flushBullets();

  return output.join("");
}

// Browser rich-text commands can wrap entire paragraphs and lists in spans,
// especially immediately after pasting plain text. Preserve those wrappers
// rather than discarding their contents or merging separate paragraphs.
type InlineStyle = { bold: boolean; italic: boolean; underline: boolean };
const NO_STYLE: InlineStyle = { bold: false, italic: false, underline: false };

function styleForElement(element: HTMLElement, inherited: InlineStyle): InlineStyle {
  const tag = element.tagName.toLowerCase();
  const css = element.style;
  return {
    bold: inherited.bold || tag === "strong" || tag === "b" ||
      css.fontWeight === "bold" || Number(css.fontWeight) >= 600,
    italic: inherited.italic || tag === "em" || tag === "i" || css.fontStyle === "italic",
    underline: inherited.underline || tag === "u" ||
      css.textDecorationLine.includes("underline") || css.textDecoration.includes("underline"),
  };
}

function wrapText(text: string, style: InlineStyle): string {
  if (!text) return "";
  let output = text;
  if (style.underline) output = `++${output}++`;
  if (style.italic) output = `*${output}*`;
  if (style.bold) output = `**${output}**`;
  return output;
}

function serializeInlineNode(node: Node, inherited: InlineStyle = NO_STYLE): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return wrapText(node.textContent ?? "", inherited);
  }
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName.toLowerCase() === "br") return "\n";

  const style = styleForElement(node, inherited);
  return Array.from(node.childNodes)
    .map((child) => serializeInlineNode(child, style))
    .join("");
}

function serializeBlockNodes(nodes: Node[], inherited: InlineStyle = NO_STYLE): string[] {
  const lines: string[] = [];
  let inlineParts: string[] = [];

  function flushInline() {
    const text = inlineParts.join("").replace(/\n+$/g, "");
    if (text.trim()) lines.push(text);
    inlineParts = [];
  }

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim()) inlineParts.push(wrapText(text, inherited));
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;

    const tag = node.tagName.toLowerCase();
    const style = styleForElement(node, inherited);

    if (tag === "ul" || tag === "ol") {
      flushInline();
      for (const item of Array.from(node.children)) {
        if (!(item instanceof HTMLElement)) continue;
        const itemText = serializeInlineNode(item, style).replace(/\n/g, " ").trim();
        if (itemText) lines.push(`- ${itemText}`);
      }
      continue;
    }
    if (tag === "li") {
      flushInline();
      const itemText = serializeInlineNode(node, inherited).replace(/\n/g, " ").trim();
      if (itemText) lines.push(`- ${itemText}`);
      continue;
    }
    if (tag === "div" || tag === "p") {
      flushInline();
      const children = Array.from(node.childNodes);
      const hasBlockChildren = children.some((child) =>
        child instanceof HTMLElement && ["div", "p", "ul", "ol", "li"].includes(child.tagName.toLowerCase())
      );
      if (hasBlockChildren) {
        lines.push(...serializeBlockNodes(children, style));
      } else {
        const content = serializeInlineNode(node, inherited).replace(/\n+$/g, "");
        lines.push(content.trim() ? content : "");
      }
      continue;
    }

    // Spans/strong/em/underline may contain block elements after execCommand.
    const children = Array.from(node.childNodes);
    const hasBlockDescendant = Boolean(node.querySelector("div, p, ul, ol, li"));
    if (hasBlockDescendant) {
      flushInline();
      lines.push(...serializeBlockNodes(children, style));
    } else {
      inlineParts.push(serializeInlineNode(node, inherited));
    }
  }
  flushInline();
  return lines;
}

function editorHtmlToMarkdown(editor: HTMLElement) {
  return serializeBlockNodes(Array.from(editor.childNodes))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export default function ActivityDetailsEditor({
  value,
  onChange,
  disabled = false,
  expanded = false,
  rows = 8,
  placeholder,
}: ActivityDetailsEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedValueRef = useRef(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (lastEmittedValueRef.current === value && editor.innerHTML) return;

    editor.innerHTML = markdownToHtml(value);
    lastEmittedValueRef.current = value;
  }, [value]);

  function emitMarkdown() {
    const editor = editorRef.current;
    if (!editor) return;

    const markdown = editorHtmlToMarkdown(editor);
    lastEmittedValueRef.current = markdown;
    onChange(markdown);
  }

  function applyFormat(command: FormatCommand) {
    const editor = editorRef.current;
    if (!editor || disabled) return;

    editor.focus();
    document.execCommand(command, false);
    emitMarkdown();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("bold")}
          disabled={disabled}
          className="flex h-8 min-w-8 items-center justify-center rounded border border-slate-300 bg-white px-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          title="Bold selected text"
        >
          B
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("italic")}
          disabled={disabled}
          className="flex h-8 min-w-8 items-center justify-center rounded border border-slate-300 bg-white px-2 text-sm italic text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          title="Italicize selected text"
        >
          I
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("underline")}
          disabled={disabled}
          className="flex h-8 min-w-8 items-center justify-center rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 underline hover:bg-slate-100 disabled:opacity-50"
          title="Underline selected text"
        >
          U
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("insertUnorderedList")}
          disabled={disabled}
          className="flex h-8 items-center justify-center rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          title="Create or remove a bulleted list"
        >
          • List
        </button>
      </div>

      <div className="relative">
        {!value && (
          <div className="pointer-events-none absolute left-3 top-2 text-slate-400">
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitMarkdown}
          onBlur={emitMarkdown}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="textbox"
          aria-multiline="true"
          aria-label="Activity Details"
          data-rows={rows}
          className={`block w-full overflow-y-auto px-3 py-2 outline-none ${
            expanded ? "min-h-[520px]" : "min-h-32"
          } ${disabled ? "cursor-not-allowed bg-slate-100 opacity-70" : ""} [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_strong]:font-bold [&_em]:italic [&_u]:underline`}
        />
      </div>
    </div>
  );
}
