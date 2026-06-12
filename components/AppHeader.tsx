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

            <Link
              href="/settings"
              className="rounded-lg bg-white/5 px-3 py-2 text-center text-slate-200 hover:bg-white/10 hover:text-white sm:bg-transparent"
            >
              Settings
            </Link>
          </nav>

          <div className="flex justify-center border-t border-white/10 pt-3 sm:justify-start lg:border-t-0 lg:pt-0">
            <AuthStatus />
          </div>
        </div>
      </div>
    </header>
  );
}