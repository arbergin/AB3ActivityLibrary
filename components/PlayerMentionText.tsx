"use client";
import Link from "next/link";
import { Fragment } from "react";
import { MENTION_RE } from "@/lib/playerMentions";
export default function PlayerMentionText({ text, teamId }: { text: string; teamId: string }) {
  const pieces: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION_RE)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push(text.slice(last, index));
    pieces.push(<Link key={`${index}-${match[2]}`} href={`/team-planning/${teamId}/players/${match[2]}`}
      onClick={e => e.stopPropagation()} className="font-semibold text-blue-700 underline decoration-blue-300 hover:text-blue-900">@{match[1]}</Link>);
    last = index + match[0].length;
  }
  pieces.push(text.slice(last));
  return <span className="whitespace-pre-wrap">{pieces.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</span>;
}
