"use client";

import { ExportSquare, Eye, Video, Book1 } from "iconsax-reactjs";

// Order matters: the 360° self-identification resource comes first.
const RESOURCES = [
  {
    title: "360° of Perspectives",
    description:
      "Like going to the eye doctor — you self-identify with the lens that feels clearest. Not right or wrong, just different.",
    href: "https://www.respectforpeople.com/360-of-perspectives",
    icon: <Eye size={20} color="#7c6cf0" variant="Bold" />,
  },
  {
    title: "Tour the Nine Types",
    description: "An interactive walk through all nine perspectives.",
    href: "https://www.narrativeenneagram.org/tour-the-nine-types/",
    icon: <Book1 size={20} color="#16a34a" variant="Bold" />,
  },
  {
    title: "Type Cast Videos",
    description: "Real people describing how they see the world, type by type.",
    href: "https://www.youtube.com/@TypeCast/videos",
    icon: <Video size={20} color="#ca8a04" variant="Bold" />,
  },
];

/** Shown to free-tier users on the dashboard. */
export function ResourcesSection() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <h2 className="font-serif text-lg font-semibold">Perspective Profile Resources</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Explore the framework and self-identify your own perspective.
      </p>

      <ul className="mt-4 space-y-3">
        {RESOURCES.map((r) => (
          <li key={r.href}>
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-2xl border border-[var(--color-line)] p-3.5 transition hover:border-[var(--color-graphite)]"
            >
              <span className="mt-0.5 shrink-0">{r.icon}</span>
              <span className="flex-1">
                <span className="flex items-center gap-1.5 font-medium">
                  {r.title}
                  <ExportSquare
                    size={14}
                    color="#3f3f46"
                    variant="Linear"
                    className="opacity-0 transition group-hover:opacity-100"
                  />
                </span>
                <span className="text-xs text-[var(--color-muted)]">{r.description}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
