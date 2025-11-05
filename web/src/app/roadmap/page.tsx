const roadmapItems = [
  {
    title: "Stabilize",
    description:
      "Flesh out notifications, password resets, and other essentials the site still needs so everyday use feels reliable.",
  },
  {
    title: "Grow",
    description:
      "Layer in more APIs like Jikan and explore building a custom data pipeline that better serves manga, manhwa, and manhua fans.",
  },
  {
    title: "Expand",
    description:
      "Scale beyond comics into anime and live-action shows while keeping each media type feeling tailored and thoughtful.",
  },
  {
    title: "Polish",
    description:
      "Invest in better readers, richer chapter tracking, and offline-friendly queues so catching up feels smooth anywhere.",
  },
  {
    title: "Community",
    description:
      "Introduce collaborative lists, comments, and sharing tools that let friends discover and follow stories together without noise.",
  },
  {
    title: "Multi-platform",
    description:
      "Deliver native apps and an API surface for third-party clients, opening the door to integrations while keeping performance tight.",
  },
];

export default function RoadmapPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Roadmap</h1>
        <p className="text-sm text-white/65">
          A quick look at what&apos;s next for Shujia as it grows from a scrappy reader into a
          multi-platform library.
        </p>
      </header>

      <ol className="mt-10 space-y-8">
        {roadmapItems.map((item, index) => (
          <li key={item.title} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Phase {index + 1}</p>
            <h2 className="text-xl font-semibold text-white">{item.title}</h2>
            <p className="text-sm text-white/60">{item.description}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
