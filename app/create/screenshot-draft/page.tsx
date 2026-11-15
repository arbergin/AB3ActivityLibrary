import AppHeader from "@/components/AppHeader";
import ProtectedPage from "@/components/ProtectedPage";
import ScreenshotDraftCreator from "@/components/ScreenshotDraftCreator";

export default function ScreenshotDraftPage() {
  return <ProtectedPage>
    <main className="flex min-h-screen flex-col text-slate-900">
      <AppHeader />
      <div className="flex-1" style={{backgroundColor: "#e8eef7", backgroundImage: "linear-gradient(135deg, #c5d3e5 0%, #d9e3f0 42%, #f4f7fb 100%)"}}>
        <section className="mx-auto max-w-7xl px-4 py-1 sm:px-6 lg:px-8">
          <ScreenshotDraftCreator />
        </section>
      </div>
    </main>
  </ProtectedPage>;
}
