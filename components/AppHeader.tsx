import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="flex items-center justify-between bg-slate-900 px-8 py-4 text-white">
      <Link href="/" className="flex items-center gap-3">
        <img
          src="/ab3-activity-library-logo.png"
          alt="AB3 Activity Library Logo"
          className="h-12 w-12 rounded-lg object-contain"
        />

        <div>
          <h1 className="text-2xl font-bold">AB3 Activity Library</h1>
          <p className="text-sm text-slate-300">
            Store, tag, search, and download soccer activities.
          </p>
        </div>
      </Link>

      <nav className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900"
        >
          Home
        </Link>

        <Link
          href="/import-test"
          className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900"
        >
          Import
        </Link>

        <Link
          href="/search-test"
          className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900"
        >
          Search
        </Link>

        <Link
          href="/settings-test"
          className="rounded-lg border border-slate-500 px-4 py-2 font-semibold text-white"
        >
          Settings
        </Link>
      </nav>
    </header>
  );
}