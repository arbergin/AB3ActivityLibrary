import Image from "next/image";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";

export default function AppHeader() {
  return (
    <header className="bg-[#0d2140] text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-5">
        <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Image
            src="/ab3-activity-library-logo.png"
            alt="AB3 Activity Library"
            width={52}
            height={52}
            className="shrink-0 rounded-lg"
            priority
          />

          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight sm:text-2xl">
              AB3 Activity Library
            </h1>
            <p className="truncate text-xs text-slate-300 sm:text-sm">
              Organize, search, and manage soccer training activities
            </p>
          </div>
        </Link>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <nav className="grid grid-cols-2 gap-2 text-sm font-semibold sm:flex sm:flex-wrap sm:items-center lg:flex-nowrap">
            <Link
              href="/"
              className="rounded-lg bg-white/5 px-3 py-2 text-center text-slate-200 hover:bg-white/10 hover:text-white sm:bg-transparent"
            >
              Dashboard
            </Link>

            <Link
              href="/import"
              className="rounded-lg bg-white/5 px-3 py-2 text-center text-slate-200 hover:bg-white/10 hover:text-white sm:bg-transparent"
            >
              Import
            </Link>

            <Link
              href="/search"
              className="rounded-lg bg-white/5 px-3 py-2 text-center text-slate-200 hover:bg-white/10 hover:text-white sm:bg-transparent"
            >
              Search
            </Link>
          </nav>

          <div className="flex items-center justify-center gap-3 border-t border-white/10 pt-3 sm:justify-start lg:border-t-0 lg:pt-0">
            <AuthStatus />

            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.49 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-1.02 0-1.37.69-1.51 1Z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}