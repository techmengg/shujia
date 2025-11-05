"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";

export interface SettingsUser {
  id: string;
  email: string;
  username: string | null;
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

type ProfileFormState = {
  name: string;
  username: string;
  bio: string;
  timezone: string;
  avatarUrl: string;
};

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

const inputClass =
  "rounded-lg border border-white/12 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-0 transition";
const textareaClass = `${inputClass} min-h-[120px] resize-vertical`;
const selectClass = inputClass;
const labelClass = "flex flex-col gap-2 text-sm font-medium text-white/70";
const helpTextClass = "text-xs text-white/45";
const checkboxClass = "h-4 w-4 accent-accent";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const neutralButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-red-400 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60";

function statusToneClass(status: Status): string {
  if (status === "error") return "text-red-300";
  if (status === "success") return "text-accent";
  return "text-white/60";
}

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

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: user.name ?? "",
    username: user.username ?? "",
    bio: user.bio ?? "",
    timezone: user.timezone ?? "UTC",
    avatarUrl: user.avatarUrl ?? "",
  });
  const [savedProfile, setSavedProfile] = useState<ProfileFormState>({
    name: user.name ?? "",
    username: user.username ?? "",
    bio: user.bio ?? "",
    timezone: user.timezone ?? "UTC",
    avatarUrl: user.avatarUrl ?? "",
  });
  const [profileStatus, setProfileStatus] = useState<Status>("idle");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<Status>("idle");
  const [avatarUploadMessage, setAvatarUploadMessage] =
    useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarFallbackInitial =
    profileForm.name?.trim()?.charAt(0) ||
    profileForm.username?.charAt(0) ||
    user.email.charAt(0) ||
    "S";

  const buildProfilePayload = (
    base: ProfileFormState,
    overrides: Partial<ProfileFormState> = {},
  ) => {
    const next = { ...base, ...overrides };
    const sanitized: ProfileFormState = {
      name: next.name.trim(),
      username: next.username.trim().toLowerCase(),
      bio: next.bio.trim(),
      timezone: next.timezone,
      avatarUrl: next.avatarUrl.trim(),
    };
    return sanitized;
  };

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

    const payload = buildProfilePayload(profileForm);

    if (!payload.username || payload.username.length < 3) {
      setProfileStatus("error");
      setProfileMessage("Choose a username that is at least 3 characters long.");
      return;
    }

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
      setSavedProfile(payload);
      setProfileForm(payload);
      router.refresh();
    } catch (error) {
      console.error(error);
      setProfileStatus("error");
      setProfileMessage("Unable to update profile. Please try again.");
    }
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarUploadStatus("saving");
    setAvatarUploadMessage("Uploading...");

    const formData = new FormData();
    formData.append("avatar", file);
    const previousAvatarUrl = profileForm.avatarUrl;

    try {
      const response = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || typeof result?.url !== "string") {
        setAvatarUploadStatus("error");
        setAvatarUploadMessage(
          typeof result?.message === "string"
            ? result.message
            : "Upload failed. Please try again.",
        );
        return;
      }

      const nextAvatarUrl = result.url;
      const payload = buildProfilePayload(savedProfile, {
        avatarUrl: nextAvatarUrl,
      });

      if (!payload.username || payload.username.length < 3) {
        setAvatarUploadStatus("error");
        setAvatarUploadMessage("Set a username before uploading an avatar.");
        return;
      }

      setProfileForm((prev) => ({ ...prev, avatarUrl: nextAvatarUrl }));
      setAvatarUploadStatus("saving");
      setAvatarUploadMessage("Saving to profile...");
      const profileResponse = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const profileResult = await profileResponse.json().catch(() => ({}));

      if (!profileResponse.ok) {
        setProfileForm((prev) => ({ ...prev, avatarUrl: previousAvatarUrl }));
        setAvatarUploadStatus("error");
        setAvatarUploadMessage(extractErrorMessage(profileResult));
        return;
      }

      setSavedProfile(payload);
      setProfileForm(payload);
      router.refresh();
      setAvatarUploadStatus("success");
      setAvatarUploadMessage("Avatar updated.");
    } catch (error) {
      console.error(error);
      setProfileForm((prev) => ({ ...prev, avatarUrl: previousAvatarUrl }));
      setAvatarUploadStatus("error");
      setAvatarUploadMessage("Upload failed. Please try again.");
    } finally {
      event.target.value = "";
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
    <div className="flex flex-col gap-12 md:gap-16">
      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-base font-semibold text-white">Profile</h2>
          <p className="text-sm text-white/60">
            Update your public profile information and how other readers see you.
          </p>
        </header>
        <form className="space-y-6" onSubmit={handleProfileSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <label className={labelClass}>
              <span>Display name</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className={inputClass}
                placeholder="A name for the community"
                maxLength={120}
              />
            </label>
            <label className={labelClass}>
              <span>Username</span>
              <input
                type="text"
                value={profileForm.username}
                onChange={(event) => {
                  const sanitized = event.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
                  setProfileForm((prev) => ({ ...prev, username: sanitized }));
                }}
                className={inputClass}
                placeholder="choose a handle"
                maxLength={32}
                required
              />
              <span className={helpTextClass}>
                Only letters, numbers, and underscores. This becomes your profile link.
              </span>
            </label>
          </div>
          <label className={labelClass}>
            <span>Timezone</span>
            <select
              value={profileForm.timezone}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, timezone: event.target.value }))
              }
              className={selectClass}
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-black">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            <span>Avatar</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-lg font-semibold uppercase text-white/50 sm:h-24 sm:w-24">
                {profileForm.avatarUrl ? (
                  <Image
                    src={profileForm.avatarUrl}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  avatarFallbackInitial.toUpperCase()
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className={neutralButtonClass}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploadStatus === "saving"}
                >
                  {avatarUploadStatus === "saving" ? "Working..." : "Upload PNG/JPG"}
                </button>
                <span className={helpTextClass}>
                  PNG or JPG up to 5MB. Uploading replaces your current avatar instantly.
                </span>
                {avatarUploadMessage ? (
                  <span className={`text-xs ${statusToneClass(avatarUploadStatus)}`}>
                    {avatarUploadMessage}
                  </span>
                ) : null}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="sr-only"
              onChange={handleAvatarFileChange}
            />
          </label>
          <label className={labelClass}>
            <span>Bio</span>
            <textarea
              value={profileForm.bio}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, bio: event.target.value }))
              }
              className={textareaClass}
              placeholder="Share a bit about your favourite series or genres."
              maxLength={500}
            />
            <span className={helpTextClass}>{profileForm.bio.length}/500 characters</span>
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {profileMessage ? (
              <p className={`text-sm ${statusToneClass(profileStatus)}`}>{profileMessage}</p>
            ) : null}
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={profileStatus === "saving"}
            >
              {profileStatus === "saving" ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-6 border-t border-white/10 pt-10 md:pt-12">
        <header className="space-y-2">
          <h2 className="text-base font-semibold text-white">Account</h2>
          <p className="text-sm text-white/60">Manage how you sign in to Shujia.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
          <span>Need to take a break? You can sign out of this device anytime.</span>
          <LogoutButton />
        </div>
        <form className="space-y-6" onSubmit={handleEmailSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <label className={labelClass}>
              <span>Email address</span>
              <input
                type="email"
                value={emailForm.email}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className={inputClass}
                autoComplete="email"
                required
              />
            </label>
            <label className={labelClass}>
              <span>Current password</span>
              <input
                type="password"
                value={emailForm.currentPassword}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className={inputClass}
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {emailMessage ? (
              <p className={`text-sm ${statusToneClass(emailStatus)}`}>{emailMessage}</p>
            ) : null}
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={emailStatus === "saving"}
            >
              {emailStatus === "saving" ? "Saving..." : "Update email"}
            </button>
          </div>
        </form>

        <form className="space-y-6" onSubmit={handlePasswordSubmit}>
          <div className="grid gap-6 md:grid-cols-3">
            <label className={`${labelClass} md:col-span-1`}>
              <span>Current password</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className={inputClass}
                autoComplete="current-password"
                required
              />
            </label>
            <label className={labelClass}>
              <span>New password</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                className={inputClass}
                autoComplete="new-password"
                required
              />
            </label>
            <label className={labelClass}>
              <span>Confirm new password</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className={inputClass}
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          {passwordMessage ? (
            <p className={`text-sm ${statusToneClass(passwordStatus)}`}>{passwordMessage}</p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={passwordStatus === "saving"}
            >
              {passwordStatus === "saving" ? "Updating..." : "Change password"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-6 border-t border-white/10 pt-10 md:pt-12">
        <header className="space-y-2">
          <h2 className="text-base font-semibold text-white">Notifications</h2>
          <p className="text-sm text-white/60">Choose what reaches your inbox.</p>
        </header>
        <form className="space-y-6" onSubmit={handleNotificationsSubmit}>
          <div className="space-y-5">
            <label className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <span className="text-sm font-medium text-white">Weekly digest</span>
                <p className={helpTextClass}>
                  Highlights of new chapters, curated picks, and community activity.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.weeklyDigestEmails}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, weeklyDigestEmails: event.target.checked }))
                }
                className={checkboxClass}
              />
            </label>
            <label className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <span className="text-sm font-medium text-white">Product updates</span>
                <p className={helpTextClass}>
                  Be the first to know about new features and roadmap wins.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.productUpdates}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, productUpdates: event.target.checked }))
                }
                className={checkboxClass}
              />
            </label>
            <label className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <span className="text-sm font-medium text-white">Announcements &amp; offers</span>
                <p className={helpTextClass}>
                  Occasional campaigns, creator collabs, and partner drops.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketingEmails}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, marketingEmails: event.target.checked }))
                }
                className={checkboxClass}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {preferencesMessage ? (
              <p className={`text-sm ${statusToneClass(preferencesStatus)}`}>
                {preferencesMessage}
              </p>
            ) : null}
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={preferencesStatus === "saving"}
            >
              {preferencesStatus === "saving" ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-6 border-t border-white/10 pt-10 md:pt-12">
        <header className="space-y-2">
          <h2 className="text-base font-semibold text-white">Sessions</h2>
          <p className="text-sm text-white/60">
            You are currently signed in on {activeSessionCount} device
            {activeSessionCount === 1 ? "" : "s"}.
          </p>
        </header>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {sessionsMessage ? (
            <p className={`text-sm ${statusToneClass(sessionsStatus)}`}>{sessionsMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={handleSignOutOtherSessions}
            className={neutralButtonClass}
            disabled={sessionsStatus === "saving"}
          >
            {sessionsStatus === "saving" ? "Revoking..." : "Sign out others"}
          </button>
        </div>
      </section>

      <section className="space-y-6 border-t border-red-500/30 pt-10 md:pt-12">
        <header className="space-y-2">
          <h2 className="text-base font-semibold text-red-200">Danger zone</h2>
          <p className="text-sm text-red-200/80">
            Deleting your account removes reading history, sessions, and preferences. This action is
            irreversible.
          </p>
        </header>
        <form className="space-y-6" onSubmit={handleDeleteAccount}>
          <label className="flex flex-col gap-2 text-sm font-medium text-red-200/90">
            <span>Confirm with password</span>
            <input
              type="password"
              value={dangerForm.password}
              onChange={(event) =>
                setDangerForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="rounded-lg border border-red-500/50 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-red-200/50 focus:border-red-300 focus:outline-none focus:ring-0"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-red-200/90">
            <span>Type DELETE to confirm</span>
            <input
              type="text"
              value={dangerForm.confirm}
              onChange={(event) =>
                setDangerForm((prev) => ({ ...prev, confirm: event.target.value }))
              }
              className="rounded-lg border border-red-500/50 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-red-200/50 focus:border-red-300 focus:outline-none focus:ring-0"
              placeholder="DELETE"
              required
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {dangerMessage ? (
              <p
                className={`text-sm ${
                  dangerStatus === "error" ? "text-red-300" : "text-red-100"
                }`}
              >
                {dangerMessage}
              </p>
            ) : null}
            <button
              type="submit"
              className={dangerButtonClass}
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
