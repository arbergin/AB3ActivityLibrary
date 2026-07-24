"use client";

import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export type LegalDocumentItem =
  | { type: "heading"; number: string; text: string }
  | { type: "subheading"; number: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] };

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  introduction?: string;
  items: LegalDocumentItem[];
};

function renderLinkedText(text: string) {
  const email = "Support@ab3soccer.com";
  const parts = text.split(email);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 && (
        <a
          href="mailto:Support@ab3soccer.com"
          className="font-semibold text-[#0d2140] underline decoration-slate-300 underline-offset-2 hover:decoration-[#0d2140]"
        >
          {email}
        </a>
      )}
    </span>
  ));
}

export default function LegalDocumentPage({
  eyebrow,
  title,
  effectiveDate,
  lastUpdated,
  introduction,
  items,
}: LegalDocumentPageProps) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
          <header className="bg-[#0d2140] px-6 py-9 text-white sm:px-10 sm:py-12">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              {title}
            </h1>

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-200">
              <span>
                <strong className="text-white">Effective Date:</strong>{" "}
                {effectiveDate}
              </span>
              <span>
                <strong className="text-white">Last Updated:</strong>{" "}
                {lastUpdated}
              </span>
            </div>
          </header>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            {introduction && (
              <p className="mb-8 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
                {renderLinkedText(introduction)}
              </p>
            )}

            <div className="space-y-5">
              {items.map((item, index) => {
                if (item.type === "heading") {
                  return (
                    <h2
                      key={`${item.number}-${item.text}`}
                      className="pt-5 text-2xl font-black text-[#0d2140]"
                    >
                      {item.number}. {item.text}
                    </h2>
                  );
                }

                if (item.type === "subheading") {
                  return (
                    <h3
                      key={`${item.number}-${item.text}`}
                      className="pt-2 text-lg font-bold text-slate-900"
                    >
                      {item.number}. {item.text}
                    </h3>
                  );
                }

                if (item.type === "bullets") {
                  return (
                    <ul
                      key={`list-${index}`}
                      className="ml-6 list-disc space-y-2 text-base leading-7 text-slate-700"
                    >
                      {item.items.map((bullet, bulletIndex) => (
                        <li key={`${bulletIndex}-${bullet.slice(0, 32)}`}>
                          {renderLinkedText(bullet)}
                        </li>
                      ))}
                    </ul>
                  );
                }

                if (item.type === "numbered") {
                  return (
                    <ol
                      key={`numbered-list-${index}`}
                      className="ml-6 list-decimal space-y-2 text-base font-bold leading-7 text-slate-900"
                    >
                      {item.items.map((entry, entryIndex) => (
                        <li key={`${entryIndex}-${entry.slice(0, 32)}`}>
                          {renderLinkedText(entry)}
                        </li>
                      ))}
                    </ol>
                  );
                }

                const isEmphasized =
                  item.text.length > 35 &&
                  item.text === item.text.toUpperCase();

                return (
                  <p
                    key={`paragraph-${index}`}
                    className={`text-base leading-7 text-slate-700 ${
                      isEmphasized ? "font-bold text-slate-900" : ""
                    }`}
                  >
                    {renderLinkedText(item.text)}
                  </p>
                );
              })}
            </div>
          </div>

          <footer className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-10">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
              <Link href="/terms-of-service" className="hover:text-[#0d2140]">
                Terms of Service
              </Link>
              <Link href="/refund-policy" className="hover:text-[#0d2140]">
                Refund Policy
              </Link>
              <Link href="/privacy-policy" className="hover:text-[#0d2140]">
                Privacy Policy
              </Link>
              <Link href="/login" className="hover:text-[#0d2140]">
                Back to Login
              </Link>
            </div>
          </footer>
        </article>
      </section>
    </main>
  );
}
