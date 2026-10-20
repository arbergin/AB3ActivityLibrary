"use client";

import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { MENTION_RE, type MentionPlayer } from "@/lib/playerMentions";

type Props = {
  value: string;
  onChange: (next: string) => void;
  players: MentionPlayer[];
  rows?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

/** Stored tokens carry stable player IDs; the editor only shows @Player Name. */
function visibleText(raw: string): string {
  return raw.replace(MENTION_RE, (_match, name: string) => `@${name}`);
}

/** Translate a cursor boundary in the visible string to its raw-token boundary.
 * If an edit overlaps a mention, the whole token is replaced/removed rather
 * than leaving a broken player ID in the note.
 */
function rawBoundary(raw: string, visiblePosition: number, side: "start" | "end"): number {
  let rawIndex = 0;
  let visibleIndex = 0;
  for (const match of raw.matchAll(MENTION_RE)) {
    const tokenStart = match.index ?? 0;
    const plainLength = tokenStart - rawIndex;
    if (visiblePosition <= visibleIndex + plainLength) {
      return rawIndex + (visiblePosition - visibleIndex);
    }
    visibleIndex += plainLength;
    const tokenShownLength = (`@${match[1]}`).length;
    const tokenEnd = tokenStart + match[0].length;
    if (visiblePosition < visibleIndex + tokenShownLength) {
      return side === "start" ? tokenStart : tokenEnd;
    }
    if (visiblePosition === visibleIndex + tokenShownLength) return tokenEnd;
    visibleIndex += tokenShownLength;
    rawIndex = tokenEnd;
  }
  return rawIndex + (visiblePosition - visibleIndex);
}

export default function PlayerMentionTextarea({
  value, onChange, players, rows = 3, placeholder, className, autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const display = useMemo(() => visibleText(value), [value]);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const search = useMemo(() => {
    const before = display.slice(0, caret);
    const match = before.match(/(?:^|\s)@([\p{L}\p{N} .'-]*)$/u);
    if (!match || dismissed) return null;
    const start = caret - match[1].length - 1;
    // Do not reopen the picker when moving the caret within a saved mention.
    const rawStart = rawBoundary(value, start, "start");
    if (value.slice(rawStart).startsWith("@[")) return null;
    return { start, query: match[1].toLowerCase().trim() };
  }, [display, caret, dismissed, value]);
  const matches = search
    ? players.filter(p => p.name.toLowerCase().includes(search.query)).slice(0, 8)
    : [];

  function focusAt(position: number) {
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(position, position);
    });
  }

  function pick(player: MentionPlayer) {
    if (!search) return;
    const token = `@[${player.name}](player:${player.id})`;
    const start = rawBoundary(value, search.start, "start");
    const end = rawBoundary(value, caret, "end");
    const next = value.slice(0, start) + token + " " + value.slice(end);
    const position = search.start + player.name.length + 2;
    onChange(next);
    setCaret(position);
    setActive(0);
    setDismissed(true);
    focusAt(position);
  }

  function changeVisible(nextVisible: string, nextCaret: number) {
    // Find the minimal replaced span to preserve untouched structured mentions.
    let prefix = 0;
    const oldLength = display.length;
    const nextLength = nextVisible.length;
    while (prefix < oldLength && prefix < nextLength && display[prefix] === nextVisible[prefix]) prefix++;
    let suffix = 0;
    while (suffix < oldLength - prefix && suffix < nextLength - prefix &&
      display[oldLength - suffix - 1] === nextVisible[nextLength - suffix - 1]) suffix++;
    const previousEnd = oldLength - suffix;
    const replacement = nextVisible.slice(prefix, nextLength - suffix);
    const rawStart = rawBoundary(value, prefix, "start");
    const rawEnd = rawBoundary(value, previousEnd, "end");
    onChange(value.slice(0, rawStart) + replacement + value.slice(rawEnd));
    setCaret(nextCaret);
    setActive(0);
    setDismissed(false);
  }

  function keyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!search || matches.length === 0) {
      if (e.key === "Escape") setDismissed(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(index => (index + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(index => (index - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(matches[Math.min(active, matches.length - 1)]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDismissed(true);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        rows={rows}
        value={display}
        placeholder={placeholder}
        className={className}
        onChange={event => changeVisible(event.target.value, event.target.selectionStart)}
        onClick={event => { setCaret(event.currentTarget.selectionStart); setDismissed(false); }}
        onKeyUp={event => {
          if (!["ArrowDown", "ArrowUp"].includes(event.key)) setCaret(event.currentTarget.selectionStart);
        }}
        onKeyDown={keyDown}
      />
      {search && matches.length > 0 && (
        <div role="listbox" aria-label="Mention a player"
          className="absolute left-0 top-full z-[90] mt-1 max-h-60 w-full max-w-sm overflow-y-auto rounded-lg border border-slate-300 bg-white p-1 shadow-xl">
          {matches.map((player, index) => (
            <button key={player.id} type="button" role="option" aria-selected={active === index}
              onMouseDown={event => event.preventDefault()}
              onClick={() => pick(player)}
              className={`block w-full rounded px-3 py-2 text-left text-sm ${index === active ? "bg-blue-100" : "hover:bg-slate-100"}`}>
              {player.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
