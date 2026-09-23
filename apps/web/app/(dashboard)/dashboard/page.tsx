import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard root at /dashboard, rendered after successful authentication.
 *
 * Previously sat at (dashboard)/page.tsx, which resolves to "/" — the same
 * route as the landing page. That collision failed `next build` at prerender.
 *
 * The (dashboard) route group is retained for a shared authenticated layout.
 * Task 2.2 adds /dashboard/patient and /dashboard/clinician and the role-based
 * redirect in middleware; this page is the unauthenticated-role fallback and
 * the redirect target before those exist.
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top navigation bar */}
      <header className="border-b border-ink-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
              <span className="text-sm font-bold text-white">H</span>
            </div>
            <span className="text-lg font-semibold text-ink-900">
              Harmony Physio
            </span>
          </div>

          <nav aria-label="Primary navigation" className="hidden gap-6 md:flex">
            {["Dashboard", "Appointments", "Records", "Messages"].map(
              (item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm font-medium text-ink-600 hover:text-ink-900"
                >
                  {item}
                </a>
              )
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-ink-200" aria-hidden />
            <span className="sr-only">User menu</span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            Welcome back. Here&apos;s an overview of your activity.
          </p>
        </div>

        {/* Stat cards — populated in Sprint 2 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Upcoming appointments", value: "—" },
            { label: "Recent records", value: "—" },
            { label: "Unread messages", value: "—" },
            { label: "Invoices due", value: "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-ink-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
