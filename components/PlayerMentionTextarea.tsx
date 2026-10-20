"use client";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { MentionPlayer } from "@/lib/playerMentions";

type Props = { value: string; onChange: (next: string) => void; players: MentionPlayer[]; rows?: number; placeholder?: string; className?: string; autoFocus?: boolean };
export default function PlayerMentionTextarea({ value, onChange, players, rows = 3, placeholder, className, autoFocus }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const search = useMemo(() => {
    const before = value.slice(0, caret);
    const match = before.match(/(?:^|\s)@([\p{L}\p{N} .'-]*)$/u);
    if (!match || dismissed) return null;
    return { start: caret - match[1].length - 1, query: match[1].toLowerCase().trim() };
  }, [value, caret, dismissed]);
  const matches = search ? players.filter(p => p.name.toLowerCase().includes(search.query)).slice(0, 8) : [];
  function pick(player: MentionPlayer) {
    if (!search) return;
    const token = `@[${player.name}](player:${player.id})`;
    const next = value.slice(0, search.start) + token + " " + value.slice(caret);
    const nextCaret = search.start + token.length + 1;
    onChange(next); setCaret(nextCaret); setActive(0); setDismissed(true);
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(nextCaret, nextCaret); });
  }
  function keyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!search || !matches.length) { if (e.key === "Escape") setDismissed(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i - 1 + matches.length) % matches.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[Math.min(active, matches.length - 1)]); }
    else if (e.key === "Escape") { e.preventDefault(); setDismissed(true); }
  }
  return <div className="relative">
    <textarea ref={ref} autoFocus={autoFocus} rows={rows} value={value} placeholder={placeholder} className={className}
      onChange={e => { onChange(e.target.value); setCaret(e.target.selectionStart); setActive(0); setDismissed(false); }}
      onClick={e => { setCaret(e.currentTarget.selectionStart); setDismissed(false); }} onKeyUp={e => { if (!['ArrowDown','ArrowUp'].includes(e.key)) setCaret(e.currentTarget.selectionStart); }} onKeyDown={keyDown} />
    {search && matches.length > 0 && <div role="listbox" aria-label="Mention a player" className="absolute left-0 top-full z-[90] mt-1 max-h-60 w-full max-w-sm overflow-y-auto rounded-lg border border-slate-300 bg-white p-1 shadow-xl">
      {matches.map((player, i) => <button key={player.id} type="button" role="option" aria-selected={active === i}
        onMouseDown={e => e.preventDefault()} onClick={() => pick(player)} className={`block w-full rounded px-3 py-2 text-left text-sm ${i === active ? 'bg-blue-100' : 'hover:bg-slate-100'}`}>{player.name}</button>)}
    </div>}
  </div>;
}
