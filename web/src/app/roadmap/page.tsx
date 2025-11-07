import type { Metadata } from "next";

const roadmapItems = [
  {
    description:
      "stabilize the core systems. fix session handling, password resets, and notifications so user data stays consistent across devices. improve reliability for everyday actions like login, list updates, and syncing.",
  },
  {
    description:
      "expand data coverage. integrate APIs like Jikan, Anilist, and MyDramaList to support anime and drama metadata. build internal caching, translation handling, and a unified schema that merges data from multiple sources cleanly.",
  },
  {
    description:
      "add multi-format support. include anime, live action, and potentially light novels alongside manga. make navigation and tracking seamless across different media types, with consistent layouts and shared progress tracking.",
  },
  {
    description:
      "improve the reading experience. add offline reading, chapter preloading, better progress recovery, and custom reader themes. make switching devices smooth without losing state.",
  },
  {
    description:
      "introduce collaborative features. shared reading lists, reactions, and simple comment threads. focus on lightweight interaction that enhances discovery without clutter or spam.",
  },
  {
    description:
      "open the platform. design a clean public API, release mobile clients, and document endpoints for third-party integrations. ensure strong authentication, caching, and rate limiting for stable performance.",
  },
  {
    description:
      "add smart utilities. generate story summaries, track reading patterns, and surface recommendations without pushing content. experiment with AI tagging for genres and multilingual summaries to make global content easier to access.",
  },
  {
    description:
      "finalize the platform layer. optimize for scale, implement CDN-backed asset delivery, improve database indexing, and add background jobs for metadata refreshes and image optimization. focus on speed, stability, and maintainability.",
  },
];



export default function RoadmapPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-10 pb-12 sm:px-6 lg:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Roadmap</h1>
        <small className="block text-sm text-white/60 pt-2">
          everything is built by me and only me, so it might take a bit... :&apos;)
        </small>
      </header>

      <ol className="mt-10 space-y-8">
        {roadmapItems.map((item, index) => (
          <li key={index} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{index + 1}</p>
            <p className="text-sm leading-relaxed text-white/65">{item.description}</p>
          </li>
        ))}
      </ol>
        <small className="block text-sm text-white/60 pt-10">
          reach me on x: <a href="https://x.com/s4lvaholic" className="text-blue-400">@s4lvaholic</a> if you have any questions or suggestions.
        </small>
    </main>
  );
}


export const metadata: Metadata = {
  title: "Roadmap",
};
