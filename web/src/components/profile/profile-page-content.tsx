"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface Stat {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

interface FavoriteItem {
  id: string;
  title: string;
  cover: string;
  progress: string;
  tags: string[];
  note?: string;
}

interface FavoriteCategory {
  title: string;
  accent: string;
  description: string;
  items: FavoriteItem[];
  layout?: "horizontal" | "vertical";
}

interface ActivityEntry {
  id: string;
  title: string;
  detail: string;
  time: string;
  tag: string;
}

interface ReadingGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  cadence: string;
}

interface TrackingEntry {
  id: string;
  title: string;
  progress: string;
  note: string;
}

interface Friend {
  id: string;
  name: string;
  avatar?: string;
  status: string;
  note: string;
}

const INITIAL_PROFILE = {
  name: "Yuzu",
  role: "Illustrator & narrative strategist",
  bio: "Stories about resilience, empathy, and strategy keep me hooked. If the villain steals the show, I am all in—recommend your sharpest reads.",
  focusAreas: ["Martial arts epics", "Found-family arcs", "Weekly simulpubs"],
  avatar: "/noprofile.jpg",
  metrics: [
    { label: "Member since", value: "2017" },
    { label: "Clubs joined", value: "32" },
    { label: "Notes published", value: "148" },
  ],
};

type Profile = typeof INITIAL_PROFILE;
type ProfileDraft = {
  name: string;
  role: string;
  bio: string;
  focusAreas: string;
  avatar: string;
};

const STATS: Stat[] = [
  { label: "Completed series", value: "128" },
  {
    label: "Active reading",
    value: "42"
  },
  { label: "Plan to read", value: "64"},
  {
    label: "Chapters logged",
    value: "4,387"
  },
];

const FAVORITES: FavoriteCategory[] = [
  {
    title: "Manga spotlight",
    accent: "from-indigo-500/25 to-indigo-500/5",
    description: "Character-first stories with layered politics and hard-earned growth.",
    items: [
      {
        id: "vinland-saga",
        title: "Vinland Saga",
        cover:
          "https://uploads.mangadex.org/covers/5d1fc77e-706a-4fc5-bea8-486c9be0145d/7fa60f5d-285a-40c5-8a1d-9cf375eaf897.jpg.512.jpg",
        progress: "201 / 201 chapters",
        tags: ["Historical", "Seinen"],
        note: "Peak redemption arc energy with breathtaking battles.",
      },
      {
        id: "blue-period",
        title: "Blue Period",
        cover:
          "https://uploads.mangadex.org/covers/f8e294c0-7c11-4c66-bdd7-4e25df52bf69/2dbc77be-3ce0-4945-b234-e9e94b15d905.jpg.512.jpg",
        progress: "Continues weekly",
        tags: ["Drama", "Art"],
        note: "Keeps my sketchbook busy—raw, inspiring creative grind.",
      },
      {
        id: "oshi-no-ko",
        title: "Oshi no Ko",
        cover:
          "https://uploads.mangadex.org/covers/fa66c641-113f-4ae4-a83a-7dd77a7a10f8/b4b20a31-d0f5-4709-8d24-2aa7faa0e314.jpg.512.jpg",
        progress: "130 / 130 chapters",
        tags: ["Idol", "Mystery"],
        note: "Industry intrigue with razor-edged commentary.",
      },
      {
        id: "frieren",
        title: "Frieren: Beyond Journey’s End",
        cover:
          "https://uploads.mangadex.org/covers/b0b721ff-c388-4486-aa0f-c2b0bb321512/f6fb40bf-f4e5-4163-a2c7-f103200873c3.jpg.512.jpg",
        progress: "118 / 118 chapters",
        tags: ["Fantasy", "Slice of life"],
        note: "Quiet, reflective pacing that lands every emotional beat.",
      },
      {
        id: "kingdom",
        title: "Kingdom",
        cover:
          "https://uploads.mangadex.org/covers/1ef6ddce-7930-45ae-a335-9a45604b99f7/4269284c-7d26-41a8-86d5-48b64e17323d.jpg.512.jpg",
        progress: "780 / 780 chapters",
        tags: ["Strategy", "Epic"],
        note: "Tactical battles and political gambits done right.",
      },
    ],
  },
  {
    title: "Manhwa luminaries",
    accent: "from-cyan-500/25 to-cyan-500/5",
    description: "High-adrenaline series I watch weekly with friends’ commentary.",
    layout: "vertical",
    items: [
      {
        id: "omniscient-reader",
        title: "Omniscient Reader",
        cover:
          "https://uploads.mangadex.org/covers/9a414441-bbad-43f1-a3a7-dc262ca790a3/be18dc9a-7f1c-4ca5-b318-ffff2d7d58c3.jpg.512.jpg",
        progress: "176 / 176 chapters",
        tags: ["Apocalypse", "Game"],
        note: "Reader-as-protagonist meta done with heart.",
      },
      {
        id: "solo-leveling",
        title: "Solo Leveling",
        cover:
          "https://uploads.mangadex.org/covers/ade0306c-f4b6-4890-9edb-1ddf04df2039/fd49e2ad-69fc-416a-8deb-a71cc36b0b50.jpg.512.jpg",
        progress: "179 / 179 chapters",
        tags: ["Action", "Fantasy"],
        note: "Power fantasy comfort read—immaculate glow-ups.",
      },
      {
        id: "tower-of-god",
        title: "Tower of God",
        cover:
          "https://uploads.mangadex.org/covers/57e1d491-1dc9-4854-83bf-7a9379566fb2/5ed269d1-63af-45f8-8d67-4e8aa1e1b520.jpg.512.jpg",
        progress: "Season 3 ongoing",
        tags: ["Adventure", "Mystery"],
        note: "Layered rulesets and rivalries that never get old.",
      },
      {
        id: "the-breaker",
        title: "The Breaker",
        cover:
          "https://uploads.mangadex.org/covers/773c2211-750b-4fff-bd64-c914986e4637/cf60f76c-19fa-441f-b20d-9528180aaff7.jpg.512.jpg",
        progress: "200 / 200 chapters",
        tags: ["Martial arts"],
        note: "Classic master-student tension with slick pacing.",
      },
      {
        id: "lookism",
        title: "Lookism",
        cover:
          "https://uploads.mangadex.org/covers/596191eb-69ee-4401-983e-cc07e277fa17/6df15145-f15b-43f0-b87b-22fd3694eaca.jpg.512.jpg",
        progress: "469 / 469 chapters",
        tags: ["Drama", "Social"],
        note: "Social commentary disguised as high school chaos.",
      },
    ],
  },
  {
    title: "Manhua corner",
    accent: "from-amber-500/25 to-amber-500/5",
    description: "Curated for inventive worldbuilding and genre mashups.",
    items: [
      {
        id: "spare-me-great-lord",
        title: "Spare Me, Great Lord!",
        cover:
          "https://uploads.mangadex.org/covers/7de0a8d1-c7d8-4f34-a211-4f52955b8e52/5c8643ff-fd51-4c3c-9f01-928a817e47f2.jpg.512.jpg",
        progress: "270 / 270 chapters",
        tags: ["Comedy", "Cultivation"],
        note: "Chaotic energy with clever power-scaling gags.",
      },
      {
        id: "ravages-of-time",
        title: "The Ravages of Time",
        cover:
          "https://uploads.mangadex.org/covers/f6ce20ca-73c3-4fdd-9367-e2901fca780e/20321227-0fb4-41cc-89b3-49f4a042bdcb.jpg.512.jpg",
        progress: "Continues monthly",
        tags: ["Historical", "Strategy"],
        note: "Three Kingdoms intrigue with brutal honesty.",
      },
      {
        id: "kings-avatar",
        title: "The King’s Avatar",
        cover:
          "https://uploads.mangadex.org/covers/1930d635-b170-417f-b8a8-f84b881bcc7d/93865b68-e5b4-4b42-a93a-b455af659b5f.jpg.512.jpg",
        progress: "172 / 172 chapters",
        tags: ["Esports", "Drama"],
        note: "Peak comfort series for competitive gaming arcs.",
      },
      {
        id: "heaven-officials-blessing",
        title: "Heaven Official’s Blessing",
        cover:
          "https://uploads.mangadex.org/covers/322f11ba-7a9d-4a57-83f5-924b8f6319d6/03dc231d-6349-4cd1-9eeb-2ce99654496c.png.512.jpg",
        progress: "96 / 96 chapters",
        tags: ["Fantasy", "Romance"],
        note: "Poetic, slow-burn mythos with impeccable visuals.",
      },
      {
        id: "soul-land",
        title: "Soul Land",
        cover:
          "https://uploads.mangadex.org/covers/39d875a6-5df3-4323-a2da-3a0b50af429a/1ce4873a-7198-4452-9af5-b2f35c6df4ff.jpg.512.jpg",
        progress: "366 / 366 chapters",
        tags: ["Adventure", "Cultivation"],
        note: "OG cultivation saga that still delivers surprises.",
      },
    ],
  },
];

const RECENT_ACTIVITY: ActivityEntry[] = [
  {
    id: "activity-1",
    title: "Reviewed “Kingdom” vol. 68",
    detail: "Annotated key tactical shifts in the Koku You campaign.",
    time: "2 hours ago",
    tag: "Review",
  },
  {
    id: "activity-2",
    title: "Joined “Strategists Anonymous” club chat",
    detail: "Shared reading order for military epics x court dramas.",
    time: "Yesterday",
    tag: "Community",
  },
  {
    id: "activity-3",
    title: "Library refresh",
    detail: "Archived 12 backlog titles and reorganised custom shelves.",
    time: "3 days ago",
    tag: "Library",
  },
  {
    id: "activity-4",
    title: "Note drafted for “Frieren”",
    detail: "Comparative analysis on grief across immortal narratives.",
    time: "5 days ago",
    tag: "Notes",
  },
];

const TRACKING: TrackingEntry[] = [
  {
    id: "tracking-1",
    title: "Frieren: Beyond Journey’s End",
    progress: "Ch. 118",
    note: "Annotating Supreme Mage arc on Sunday afternoon.",
  },
  {
    id: "tracking-2",
    title: "Tower of God",
    progress: "Season 3 · Ep. 148",
    note: "Live reactions with friends every Thursday night.",
  },
  {
    id: "tracking-3",
    title: "Heaven Official’s Blessing",
    progress: "Ch. 96",
    note: "Re-reading ahead of donghua season two.",
  },
];

const READING_GOALS: ReadingGoal[] = [
  {
    id: "goal-1",
    title: "Finish five classics from the backlog",
    current: 3,
    target: 5,
    unit: "series",
    cadence: "Quarterly focus",
  },
  {
    id: "goal-2",
    title: "Log weekly chapter reflections",
    current: 8,
    target: 12,
    unit: "notes",
    cadence: "Monthly cadence",
  },
  {
    id: "goal-3",
    title: "Keep to simulpub schedule",
    current: 12,
    target: 16,
    unit: "series",
    cadence: "Seasonal challenge",
  },
];

const FRIENDS: Friend[] = [
  {
    id: "friend-lena",
    name: "Lena",
    avatar:
      "https://api.dicebear.com/7.x/lorelei/svg?seed=Lena&backgroundColor=0b1220,111827",
    status: "Drafting a new top 100 list tonight.",
    note: "Psychological mystery specialist.",
  },
  {
    id: "friend-kaz",
    name: "Kaz",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Kaz&backgroundColor=0b1220,111827",
    status: "Speed-running Solo Leveling side stories.",
    note: "Action curator & build optimist.",
  },
  {
    id: "friend-aya",
    name: "Aya",
    avatar:
      "https://api.dicebear.com/7.x/pixel-art/svg?seed=Aya&backgroundColor=0b1220,111827",
    status: "Taking recs for tender slice-of-life.",
    note: "Comfort reads librarian.",
  },
  {
    id: "friend-rin",
    name: "Rin",
    avatar:
      "https://api.dicebear.com/7.x/initials/svg?seed=Rin&backgroundColor=0b1220,111827",
    status: "Sketching commission queue during streams.",
    note: "Fan-art collab partner.",
  },
];

const DEFAULT_AVATAR = "/noprofile.jpg";

function trendClass(trend: Stat["trend"]) {
  if (trend === "up") return "text-emerald-300";
  if (trend === "down") return "text-rose-300";
  return "text-surface-subtle";
}

function goalProgress(goal: ReadingGoal) {
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

export function ProfilePageContent() {
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    name: INITIAL_PROFILE.name,
    role: INITIAL_PROFILE.role,
    bio: INITIAL_PROFILE.bio,
    focusAreas: INITIAL_PROFILE.focusAreas.join(", "),
    avatar: INITIAL_PROFILE.avatar,
  });

  const openEditor = () => {
    setProfileDraft({
      name: profile.name,
      role: profile.role,
      bio: profile.bio,
      focusAreas: profile.focusAreas.join(", "),
      avatar: profile.avatar,
    });
    setIsEditing(true);
  };

  const handleDraftChange = <Field extends keyof ProfileDraft>(
    field: Field,
    value: ProfileDraft[Field],
  ) => {
    setProfileDraft((draft) => ({
      ...draft,
      [field]: value,
    }));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = () => {
    const focusAreas = profileDraft.focusAreas
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    setProfile((current) => ({
      ...current,
      name: profileDraft.name.trim() || current.name,
      role: profileDraft.role.trim() || current.role,
      bio: profileDraft.bio.trim() || current.bio,
      focusAreas: focusAreas.length > 0 ? focusAreas : current.focusAreas,
      avatar: profileDraft.avatar.trim() || current.avatar,
    }));

    setIsEditing(false);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-14 pt-8 sm:px-6 lg:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#05070d] px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-24 right-[-80px] h-56 w-56 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-80px] h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl" />

        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:gap-7">
          <article className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-6 shadow-[0_25px_60px_rgba(8,11,24,0.45)] sm:px-8 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-3xl border border-white/10 shadow-[0_20px_40px_rgba(15,23,42,0.45)] lg:mx-0">
                <span className="absolute inset-0 rounded-3xl border border-accent/40 opacity-40 blur-sm" />
                <Image
                  src={profile.avatar}
                  alt={`${profile.name} avatar`}
                  fill
                  className="object-cover"
                  sizes="128px"
                  priority
                />
              </div>
              <div className="flex-1 space-y-3.5 text-center lg:text-left">
                <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <h1 className="text-3xl font-semibold text-white sm:text-[2rem]">
                      {profile.name}
                    </h1>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                      Curator tier
                    </span>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-white/70">
                    Last online
                  </span>
                </div>
                <p className="text-sm text-white/75">{profile.role}</p>
                <p className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-white/65 lg:mx-0">
                  {profile.bio}
                </p>
                <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                  {profile.focusAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {profile.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-white/80"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent/60 bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent/30 hover:text-white"
              >
                Update status
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white/80 transition hover:border-accent hover:text-white"
              >
                Share profile
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm font-semibold text-white/75 transition hover:border-accent hover:text-white"
                onClick={openEditor}
              >
                Edit profile
              </button>
            </div>
          </article>

          <aside className="rounded-3xl border border-white/10 bg-black/35 p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
              Quick stats
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white/80"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                    {stat.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-white">
                      {stat.value}
                    </span>
                    {stat.change ? (
                      <span className={`text-xs font-medium ${trendClass(stat.trend)}`}>
                        {stat.change}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {isEditing ? (
        <section className="rounded-3xl border border-white/10 bg-black/35 p-6 sm:p-8">
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveProfile();
            }}
          >
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Customize profile
              </h2>
              <p className="mt-1 text-sm text-white/65">
                Update your public details, bio, avatar, and highlight tags. Changes
                save instantly for this session.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Display name
                </span>
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={(event) => handleDraftChange("name", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Enter your display name"
                />
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Tagline
                </span>
                <input
                  type="text"
                  value={profileDraft.role}
                  onChange={(event) => handleDraftChange("role", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Share what you do or collect"
                />
              </label>

              <label className="flex flex-col gap-2 sm:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Avatar URL
                </span>
                <input
                  type="url"
                  value={profileDraft.avatar}
                  onChange={(event) => handleDraftChange("avatar", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="https://example.com/avatar.png"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Bio
              </span>
              <textarea
                value={profileDraft.bio}
                onChange={(event) => handleDraftChange("bio", event.target.value)}
                rows={4}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                placeholder="Tell the community about your reading vibe"
              />
            </label>

            <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Focus tags
              </span>
              <textarea
                value={profileDraft.focusAreas}
                onChange={(event) =>
                  handleDraftChange("focusAreas", event.target.value)
                }
                rows={2}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                placeholder="Separate tags with commas, e.g. Seinen epics, Slice-of-life"
              />
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
                Used to populate the badges below your bio
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-white/70 transition hover:border-white/30"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-accent/60 bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent/30 hover:text-white"
              >
                Save changes
              </button>
            </div>
          </form>
        </section>
      ) : null}


      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Favorites spotlight
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Three rotating columns—up to 10 favorites per shelf, scroll for the
              latest obsessions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/reading-list"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80 transition hover:border-accent hover:text-white"
            >
              View entire reading list
              <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {FAVORITES.map((category) => {
            const isVertical = category.layout !== "horizontal";
            return (
              <div
                key={category.title}
                className={`flex min-h-[22rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b ${category.accent}`}
              >
                <div className="border-b border-white/10 px-5 pb-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {category.title}
                      </h3>
                      <p className="mt-1 text-xs text-white/65">
                        {category.description}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.65rem] font-medium text-white/70">
                      {Math.min(category.items.length, 10)} / 10
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ul
                    className={
                      isVertical
                        ? "flex snap-y snap-mandatory flex-col gap-4 overflow-y-auto px-5 pb-5 pt-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                        : "flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-5 pt-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                    }
                  >
                    {category.items.slice(0, 10).map((item) => {
                      const articleWidth = isVertical ? "w-full" : "w-[260px]";
                      return (
                        <li
                          key={item.id}
                          className="snap-start"
                        >
                          <article
                            className={`flex ${articleWidth} min-w-0 gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-accent/40`}
                          >
                            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-accent-soft via-surface-muted to-surface shadow-[0_12px_30px_rgba(15,23,42,0.35)]">
                              <Image
                                src={item.cover}
                                alt={item.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 120px, 160px"
                              />
                            </div>
                            <div className="flex min-w-0 flex-col gap-2">
                              <div>
                                <p className="line-clamp-2 text-sm font-semibold text-white">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-xs text-white/60">
                                  {item.progress}
                                </p>
                              </div>
                              {item.note ? (
                                <p className="line-clamp-3 text-xs text-white/55">
                                  {item.note}
                                </p>
                              ) : null}
                              <div className="mt-auto flex flex-wrap gap-1">
                                {item.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/60"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white sm:text-xl">
                  Recent activity
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Highlights from the last week across reviews, clubs, and the
                  library.
                </p>
              </div>
              <button
                type="button"
                className="hidden rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-accent hover:text-white sm:inline-flex"
              >
                View full timeline
              </button>
            </div>
            <ul className="mt-5 space-y-5">
              {RECENT_ACTIVITY.map((entry) => (
                <li
                  key={entry.id}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-accent/40"
                >
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-white">
                        {entry.title}
                      </p>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-white/60">
                        {entry.tag}
                      </span>
                    </div>
                    <p className="text-sm text-white/65">{entry.detail}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                      {entry.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Currently tracking
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Sessions pencilled in for the next few evenings.
                </p>
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                Updated daily
              </span>
            </div>
            <ul className="mt-4 space-y-4">
              {TRACKING.map((series) => (
                <li
                  key={series.id}
                  className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 transition hover:border-accent/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {series.title}
                    </p>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-white/60">
                      {series.progress}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/65">{series.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white">Reading goals</h3>
            <p className="mt-1 text-sm text-white/60">
              Small steps logged each week—progress resets every quarter.
            </p>
            <ul className="mt-5 space-y-4">
              {READING_GOALS.map((goal) => {
                const progress = goalProgress(goal);
                return (
                  <li
                    key={goal.id}
                    className="rounded-2xl border border-white/10 bg-black/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {goal.title}
                        </p>
                        <p className="text-xs text-white/60">{goal.cadence}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                        {goal.current}/{goal.target} {goal.unit}
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Friend radar</h3>
              <Link
                href="/"
                className="text-xs font-medium uppercase tracking-[0.2em] text-accent transition hover:text-white"
              >
                See all
              </Link>
            </div>
            <ul className="mt-4 space-y-4">
              {FRIENDS.map((friend) => (
                <li
                  key={friend.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 transition hover:border-accent/40"
                >
                  <Image
                    src={friend.avatar ?? DEFAULT_AVATAR}
                    alt={friend.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 object-cover"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      {friend.name}
                    </p>
                    <p className="text-xs text-white/65">{friend.status}</p>
                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/40">
                      {friend.note}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
