import Image from "next/image";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";

export default function AppHeader() {
  return (
    <header className="bg-[#0d2140] text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-8 py-5">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-4">
          <Image
            src="/ab3-activity-library-logo.png"
            alt="AB3 Activity Library"
            width={56}
            height={56}
            className="rounded-lg"
            priority
          />

          <div className="min-w-0">
            <h1 className="whitespace-nowrap text-2xl font-bold leading-tight">
              AB3 Activity Library
            </h1>
            <p className="whitespace-nowrap text-sm text-slate-300">
              Organize, search, and manage soccer training activities
            </p>
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
          <nav className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/import"
              className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Import
            </Link>

            <Link
              href="/search"
              className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Search
            </Link>

            <Link
              href="/settings"
              className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Settings
            </Link>
          </nav>

          <div className="min-w-0 shrink">
            <AuthStatus />
          </div>
        </div>
      </div>
    </header>
  );
}