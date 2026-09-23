import Link from "next/link";

const NAV = [
  { href: "/dashboard/clinician", label: "Caseload" },
  { href: "/dashboard/clinician/profile", label: "My profile" },
];

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav className="flex gap-6 border-b border-ink-100 py-3">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
