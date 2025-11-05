"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";

export interface SettingsUser {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string;
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigestEmails: boolean;
}

interface SettingsPageContentProps {
  user: SettingsUser;
  sessionCount: number;
}

type Status = "idle" | "saving" | "success" | "error";

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "UTC -05:00 (New York)" },
  { value: "America/Los_Angeles", label: "UTC -08:00 (Los Angeles)" },
  { value: "Europe/London", label: "UTC +00:00 (London)" },
  { value: "Europe/Paris", label: "UTC +01:00 (Paris)" },
  { value: "Asia/Tokyo", label: "UTC +09:00 (Tokyo)" },
  { value: "Asia/Singapore", label: "UTC +08:00 (Singapore)" },
  { value: "Australia/Sydney", label: "UTC +10:00 (Sydney)" },
];

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Something went wrong. Please try again.";
  }

  const { message, errors } = payload as ApiError;

  if (errors && typeof errors === "object") {
    const firstEntry = Object.values(errors)[0];
    if (Array.isArray(firstEntry) && firstEntry.length > 0) {
      return firstEntry[0];
    }
  }

  if (message && typeof message === "string") {
    return message;
  }

  return "Something went wrong. Please try again.";
}

export function SettingsPageContent({ user, sessionCount }: SettingsPageContentProps) {
  const router = useRouter();

  const [profileForm, setProfileForm] = useState({
    name: user.name ?? "",
    bio: user.bio ?? "",
    timezone: user.timezone ?? "UTC",
    avatarUrl: user.avatarUrl ?? "",
  });
  const [profileStatus, setProfileStatus] = useState<Status>("idle");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [emailForm, setEmailForm] = useState({
    email: user.email,
    currentPassword: "",
  });
  const [emailStatus, setEmailStatus] = useState<Status>("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState<Status>("idle");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [preferences, setPreferences] = useState({
    marketingEmails: user.marketingEmails,
    productUpdates: user.productUpdates,
    weeklyDigestEmails: user.weeklyDigestEmails,
  });
  const [preferencesStatus, setPreferencesStatus] = useState<Status>("idle");
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);

  const [sessionsStatus, setSessionsStatus] = useState<Status>("idle");
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);
  const [activeSessionCount, setActiveSessionCount] = useState<number>(sessionCount);

  const [dangerForm, setDangerForm] = useState({
    password: "",
    confirm: "",
  });
  const [dangerStatus, setDangerStatus] = useState<Status>("idle");
  const [dangerMessage, setDangerMessage] = useState<string | null>(null);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileStatus("saving");
    setProfileMessage(null);

    const payload = {
      name: profileForm.name.trim(),
      bio: profileForm.bio.trim(),
      timezone: profileForm.timezone,
      avatarUrl: profileForm.avatarUrl.trim(),
    };

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setProfileStatus("error");
        setProfileMessage(extractErrorMessage(result));
        return;
      }

      setProfileStatus("success");
      setProfileMessage(result?.message ?? "Profile updated.");
    } catch (error) {
      console.error(error);
      setProfileStatus("error");
      setProfileMessage("Unable to update profile. Please try again.");
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailStatus("saving");
    setEmailMessage(null);

    try {
      const response = await fetch("/api/settings/email", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailForm),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEmailStatus("error");
        setEmailMessage(extractErrorMessage(result));
        return;
      }

      setEmailStatus("success");
      setEmailMessage(result?.message ?? "Email updated.");
      setEmailForm((prev) => ({ ...prev, currentPassword: "" }));
    } catch (error) {
      console.error(error);
      setEmailStatus("error");
      setEmailMessage("Unable to update email right now.");
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus("error");
      setPasswordMessage("Your new passwords do not match.");
      return;
    }

    setPasswordStatus("saving");
    setPasswordMessage(null);

    try {
      const response = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPasswordStatus("error");
        setPasswordMessage(extractErrorMessage(result));
        return;
      }

      setPasswordStatus("success");
      setPasswordMessage(result?.message ?? "Password updated.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error(error);
      setPasswordStatus("error");
      setPasswordMessage("Unable to update password right now.");
    }
  };

  const handleNotificationsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPreferencesStatus("saving");
    setPreferencesMessage(null);

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPreferencesStatus("error");
        setPreferencesMessage(extractErrorMessage(result));
        return;
      }

      setPreferencesStatus("success");
      setPreferencesMessage(result?.message ?? "Preferences saved.");
    } catch (error) {
      console.error(error);
      setPreferencesStatus("error");
      setPreferencesMessage("Unable to update preferences right now.");
    }
  };

  const handleSignOutOtherSessions = async () => {
    setSessionsStatus("saving");
    setSessionsMessage(null);

    try {
      const response = await fetch("/api/settings/sessions", {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSessionsStatus("error");
        setSessionsMessage(extractErrorMessage(result));
        return;
      }

      setSessionsStatus("success");
      setSessionsMessage(result?.message ?? "Sessions updated.");
      const revoked = typeof result?.data?.revoked === "number" ? result.data.revoked : 0;
      setActiveSessionCount((count) => Math.max(1, count - revoked));
    } catch (error) {
      console.error(error);
      setSessionsStatus("error");
      setSessionsMessage("Unable to manage sessions right now.");
    }
  };

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDangerStatus("saving");
    setDangerMessage(null);

    try {
      const response = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dangerForm),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDangerStatus("error");
        setDangerMessage(extractErrorMessage(result));
        return;
      }

      setDangerStatus("success");
      setDangerMessage(result?.message ?? "Account deleted.");
      setTimeout(() => {
        router.replace("/register");
      }, 1200);
    } catch (error) {
      console.error(error);
      setDangerStatus("error");
      setDangerMessage("Unable to delete account right now.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Profile</h2>
          <p className="text-xs text-white/60">
            Update your public profile information and how other readers see you.
          </p>
        </header>
        <form className="mt-4 space-y-4" onSubmit={handleProfileSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
              Display name
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                placeholder="A name for the community"
                maxLength={120}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
              Timezone
              <select
                value={profileForm.timezone}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, timezone: event.target.value }))
                }
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
              >
                {TIMEZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-black">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
            Avatar URL
            <input
              type="url"
              value={profileForm.avatarUrl}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, avatarUrl: event.target.value }))
              }
              className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
              placeholder="https://example.com/avatar.jpg"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
            Bio
            <textarea
              value={profileForm.bio}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, bio: event.target.value }))
              }
              className="min-h-[120px] rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
              placeholder="Tell readers about your favorite series, genres, or current obsessions."
              maxLength={500}
            />
            <span className="text-[0.6rem] text-white/40">
              {profileForm.bio.length}/500 characters
            </span>
          </label>
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/50" />
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={profileStatus === "saving"}
            >
              {profileStatus === "saving" ? "Saving..." : "Save profile"}
            </button>
          </div>
          {profileMessage ? (
            <p
              className={	ext-xs }
            >
              {profileMessage}
            </p>
          ) : null}
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Account</h2>
          <p className="text-xs text-white/60">Manage how you sign in to Shujia.</p>
        </header>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-xs text-white/55">
            Need to take a break? You can sign out of this device anytime.
          </div>
          <LogoutButton />
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleEmailSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
              Email address
              <input
                type="email"
                value={emailForm.email}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                autoComplete="email"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
              Current password
              <input
                type="password"
                value={emailForm.currentPassword}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/50">
              {emailMessage}
            </div>
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={emailStatus === "saving"}
            >
              {emailStatus === "saving" ? "Saving..." : "Update email"}
            </button>
          </div>
        </form>

        <div className="mt-6 h-px bg-white/10" />

        <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60 md:col-span-1">
              Current password
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
              New password
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/60">
              Confirm new password
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          {passwordMessage ? (
            <p
              className={	ext-xs }
            >
              {passwordMessage}
            </p>
          ) : null}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={passwordStatus === "saving"}
            >
              {passwordStatus === "saving" ? "Updating..." : "Change password"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Notifications</h2>
          <p className="text-xs text-white/60">Choose what hits your inbox.</p>
        </header>
        <form className="mt-4 space-y-4" onSubmit={handleNotificationsSubmit}>
          <label className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-white">Weekly digest</span>
              <p className="text-xs text-white/50">
                Highlights of new chapters, curated picks, and community activity.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.weeklyDigestEmails}
              onChange={(event) =>
                setPreferences((prev) => ({ ...prev, weeklyDigestEmails: event.target.checked }))
              }
              className="h-4 w-4 accent-accent"
            />
          </label>
          <label className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-white">Product updates</span>
              <p className="text-xs text-white/50">
                Be the first to know about new features and roadmap wins.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.productUpdates}
              onChange={(event) =>
                setPreferences((prev) => ({ ...prev, productUpdates: event.target.checked }))
              }
              className="h-4 w-4 accent-accent"
            />
          </label>
          <label className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-white">Announcements & offers</span>
              <p className="text-xs text-white/50">
                Occasional campaigns, creator collabs, and partner drops.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.marketingEmails}
              onChange={(event) =>
                setPreferences((prev) => ({ ...prev, marketingEmails: event.target.checked }))
              }
              className="h-4 w-4 accent-accent"
            />
          </label>
          {preferencesMessage ? (
            <p
              className={	ext-xs }
            >
              {preferencesMessage}
            </p>
          ) : null}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={preferencesStatus === "saving"}
            >
              {preferencesStatus === "saving" ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Sessions</h2>
            <p className="text-xs text-white/60">
              You are currently signed in on {activeSessionCount} device{activeSessionCount === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOutOtherSessions}
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={sessionsStatus === "saving"}
          >
            {sessionsStatus === "saving" ? "Revoking..." : "Sign out others"}
          </button>
        </header>
        {sessionsMessage ? (
          <p
            className={`mt-4 text-xs ${sessionsStatus === "error" ? "text-red-300" : "text-accent"}`}
          >
            {sessionsMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-red-200">Danger zone</h2>
          <p className="text-xs text-red-200/80">
            Deleting your account removes reading history, sessions, and preferences. This action is irreversible.
          </p>
        </header>
        <form className="mt-4 space-y-4" onSubmit={handleDeleteAccount}>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-red-200/80">
            Confirm with password
            <input
              type="password"
              value={dangerForm.password}
              onChange={(event) =>
                setDangerForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="rounded-2xl border border-red-500/50 bg-black/40 px-3 py-2 text-sm text-white focus:border-red-400 focus:outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-red-200/80">
            Type DELETE to confirm
            <input
              type="text"
              value={dangerForm.confirm}
              onChange={(event) =>
                setDangerForm((prev) => ({ ...prev, confirm: event.target.value }))
              }
              className="rounded-2xl border border-red-500/50 bg-black/40 px-3 py-2 text-sm text-white focus:border-red-400 focus:outline-none"
              placeholder="DELETE"
              required
            />
          </label>
          {dangerMessage ? (
            <p
              className={`text-xs ${dangerStatus === "error" ? "text-red-200" : "text-red-100"}`}
            >
              {dangerMessage}
            </p>
          ) : null}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-red-200 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={dangerStatus === "saving"}
            >
              {dangerStatus === "saving" ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
