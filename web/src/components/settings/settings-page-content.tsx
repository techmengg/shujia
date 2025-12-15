"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { THEME_OPTIONS, ThemeName } from "@/lib/theme/config";
import type { SettingsContentSection } from "@/types/settings";

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
  showMatureContent: boolean;
  showExplicitContent: boolean;
  showPornographicContent: boolean;
  twoFactorEnabled: boolean;
  theme: ThemeName;
}

interface SettingsPageContentProps {
  user: SettingsUser;
  sessionCount: number;
  sections?: SettingsContentSection[];
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

type AppearanceFormState = {
  theme: ThemeName;
};

const SECTION_ORDER: SettingsContentSection[] = [
  "profile",
  "account",
  "appearance",
  "security",
  "sessions",
  "danger",
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  // North America
  { value: "America/New_York", label: "UTC -05:00 (New York)" },
  { value: "America/Toronto", label: "UTC -05:00 (Toronto)" },
  { value: "America/Chicago", label: "UTC -06:00 (Chicago)" },
  { value: "America/Mexico_City", label: "UTC -06:00 (Mexico City)" },
  { value: "America/Vancouver", label: "UTC -08:00 (Vancouver)" },
  { value: "America/Los_Angeles", label: "UTC -08:00 (Los Angeles)" },
  { value: "America/Denver", label: "UTC -07:00 (Denver)" },
  { value: "America/Phoenix", label: "UTC -07:00 (Phoenix)" },
  { value: "America/Sao_Paulo", label: "UTC -03:00 (São Paulo)" },
  // Europe
  { value: "Europe/London", label: "UTC +00:00 (London)" },
  { value: "Europe/Paris", label: "UTC +01:00 (Paris)" },
  { value: "Europe/Berlin", label: "UTC +01:00 (Berlin)" },
  { value: "Europe/Madrid", label: "UTC +01:00 (Madrid)" },
  { value: "Europe/Istanbul", label: "UTC +03:00 (Istanbul)" },
  // Middle East / Africa
  { value: "Asia/Dubai", label: "UTC +04:00 (Dubai)" },
  // South Asia
  { value: "Asia/Kolkata", label: "UTC +05:30 (Kolkata)" },
  // East / Southeast Asia
  { value: "Asia/Hong_Kong", label: "UTC +08:00 (Hong Kong)" },
  { value: "Asia/Singapore", label: "UTC +08:00 (Singapore)" },
  { value: "Asia/Shanghai", label: "UTC +08:00 (Shanghai)" },
  { value: "Asia/Bangkok", label: "UTC +07:00 (Bangkok)" },
  { value: "Asia/Jakarta", label: "UTC +07:00 (Jakarta)" },
  { value: "Asia/Seoul", label: "UTC +09:00 (Seoul)" },
  { value: "Asia/Tokyo", label: "UTC +09:00 (Tokyo)" },
  // Oceania
  { value: "Australia/Sydney", label: "UTC +10:00 (Sydney)" },
  { value: "Australia/Melbourne", label: "UTC +10:00 (Melbourne)" },
  { value: "Australia/Perth", label: "UTC +08:00 (Perth)" },
  { value: "Pacific/Auckland", label: "UTC +12:00 (Auckland)" },
];

const inputClass =
  "rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-0 transition sm:px-3.5";
const textareaClass = `${inputClass} min-h-[120px] resize-vertical`;
const selectClass = inputClass;
const labelClass = "flex flex-col gap-1.5 text-[0.85rem] font-medium text-white/70 sm:text-sm";
const helpTextClass = "text-[0.7rem] text-white/45 sm:text-xs";
const primaryButtonClass =
  "primary-button inline-flex items-center justify-center rounded-lg border border-accent px-3.5 py-2 text-sm font-medium text-accent transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const neutralButtonClass =
  "neutral-button inline-flex items-center justify-center rounded-lg border border-white/20 px-3.5 py-2 text-sm font-medium text-white/80 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClass =
  "danger-button inline-flex items-center justify-center rounded-lg border border-red-400 px-3.5 py-2 text-sm font-medium text-red-200 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60";

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

export function SettingsPageContent({ user, sessionCount, sections }: SettingsPageContentProps) {
  const router = useRouter();
  const sectionsToRender =
    sections && sections.length > 0 ? sections : SECTION_ORDER;
  const firstVisibleSection =
    SECTION_ORDER.find((section) => sectionsToRender.includes(section)) ??
    sectionsToRender[0];
  const shouldRender = (section: SettingsContentSection) =>
    sectionsToRender.includes(section);
  const sectionClassName = (
    section: SettingsContentSection,
    baseClass = "space-y-6",
  ) => {
    if (!firstVisibleSection || section === firstVisibleSection) {
      return baseClass;
    }

    const borderColor = section === "danger" ? "border-red-500/30" : "border-white/10";
    return `${baseClass} border-t ${borderColor} pt-8 md:pt-10`;
  };

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
  const [twoFactorEnabledState, setTwoFactorEnabledState] = useState(
    user.twoFactorEnabled,
  );
  const [twoFactorStatus, setTwoFactorStatus] = useState<Status>("idle");
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorSetupVisible, setTwoFactorSetupVisible] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
    secret: string;
    otpauthUrl: string;
    qrCode: string | null;
  } | null>(null);
  const [twoFactorVerifyForm, setTwoFactorVerifyForm] = useState({
    code: "",
    currentPassword: "",
  });
  const [twoFactorDisableVisible, setTwoFactorDisableVisible] = useState(false);
  const [twoFactorDisableForm, setTwoFactorDisableForm] = useState({
    currentPassword: "",
    code: "",
    recoveryCode: "",
  });
  const [twoFactorRecoveryForm, setTwoFactorRecoveryForm] = useState({
    code: "",
  });
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<
    string[] | null
  >(null);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [showPasswordEditor, setShowPasswordEditor] = useState(false);
  const [matureContentEnabled, setMatureContentEnabled] = useState(user.showMatureContent);
  const [explicitContentEnabled, setExplicitContentEnabled] = useState(user.showExplicitContent);
  const [pornographicContentEnabled, setPornographicContentEnabled] = useState(user.showPornographicContent);
  const [contentStatus, setContentStatus] = useState<Status>("idle");
  const [contentMessage, setContentMessage] = useState<string | null>(null);
  const [appearanceForm, setAppearanceForm] = useState<AppearanceFormState>({
    theme: user.theme,
  });
  const [appearanceStatus, setAppearanceStatus] = useState<Status>("idle");
  const [appearanceMessage, setAppearanceMessage] = useState<string | null>(null);

  // Notifications removed

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

  // Shared update function for content preferences
  async function updateContentPreferences(
    showMatureContent: boolean, 
    showExplicitContent: boolean, 
    showPornographicContent: boolean
  ) {
    setContentStatus("saving");
    setContentMessage(null);

    try {
      const response = await fetch("/api/settings/content-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          showMatureContent,
          showExplicitContent,
          showPornographicContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      setContentStatus("success");
      setContentMessage("Content preferences updated");
      setTimeout(() => {
        setContentMessage(null);
        setContentStatus("idle");
      }, 3000);
      
      router.refresh();
    } catch (error) {
      console.error(error);
      // Revert on error
      setMatureContentEnabled(user.showMatureContent);
      setExplicitContentEnabled(user.showExplicitContent);
      setPornographicContentEnabled(user.showPornographicContent);
      setContentStatus("error");
      setContentMessage("Failed to update");
    }
  }

  const handleMatureContentToggle = async (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    
    // If turning OFF Level 1, turn off ALL levels
    if (!newValue) {
      setMatureContentEnabled(false);
      setExplicitContentEnabled(false);
      setPornographicContentEnabled(false);
      await updateContentPreferences(false, false, false);
    } else {
      setMatureContentEnabled(true);
      await updateContentPreferences(true, explicitContentEnabled, pornographicContentEnabled);
    }
  };

  const handleExplicitContentToggle = async (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    
    // If turning OFF Level 2, also turn off Level 3
    if (!newValue) {
      setExplicitContentEnabled(false);
      setPornographicContentEnabled(false);
      await updateContentPreferences(matureContentEnabled, false, false);
    } else {
      setExplicitContentEnabled(true);
      await updateContentPreferences(matureContentEnabled, true, pornographicContentEnabled);
    }
  };

  const handlePornographicContentToggle = async (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setPornographicContentEnabled(newValue);
    await updateContentPreferences(matureContentEnabled, explicitContentEnabled, newValue);
  };

  const startTwoFactorSetup = async () => {
    setTwoFactorStatus("saving");
    setTwoFactorMessage(null);
    setTwoFactorRecoveryCodes(null);
    setShowRecoveryForm(false);
    setTwoFactorDisableVisible(false);

    try {
      const response = await fetch("/api/settings/two-factor/setup", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setTwoFactorStatus("error");
        setTwoFactorMessage(extractErrorMessage(result));
        return;
      }

      const { secret, otpauthUrl } = result as {
        secret: string;
        otpauthUrl: string;
      };

      let qrCode: string | null = null;
      try {
        const QR = await import("qrcode");
        qrCode = await QR.toDataURL(otpauthUrl, {
          width: 220,
          margin: 1,
          color: {
            dark: "#ffffff",
            light: "#111827",
          },
        });
      } catch (error) {
        console.error("QR code generation failed", error);
      }

      setTwoFactorSetupData({
        secret,
        otpauthUrl,
        qrCode,
      });
      setTwoFactorVerifyForm({
        code: "",
        currentPassword: "",
      });
      setTwoFactorSetupVisible(true);
      setTwoFactorStatus("idle");
      setTwoFactorMessage(
        "Scan the QR code with your authenticator, then enter a code to confirm.",
      );
    } catch (error) {
      console.error("2FA setup error", error);
      setTwoFactorStatus("error");
      setTwoFactorMessage(
        "Unable to start two-factor setup. Please try again.",
      );
    }
  };

  const handleVerifyTwoFactor = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setTwoFactorStatus("saving");
    setTwoFactorMessage(null);
    setTwoFactorRecoveryCodes(null);

    try {
      const response = await fetch("/api/settings/two-factor/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(twoFactorVerifyForm),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setTwoFactorStatus("error");
        setTwoFactorMessage(extractErrorMessage(result));
        return;
      }

      const recoveryCodes = Array.isArray(result?.recoveryCodes)
        ? (result.recoveryCodes as string[])
        : [];

      setTwoFactorStatus("success");
      setTwoFactorMessage("Two-factor authentication is now enabled.");
      setTwoFactorEnabledState(true);
      setTwoFactorRecoveryCodes(recoveryCodes);
      setTwoFactorSetupVisible(false);
      setTwoFactorSetupData(null);
      setShowRecoveryForm(true);
      setTwoFactorVerifyForm({
        code: "",
        currentPassword: "",
      });
    } catch (error) {
      console.error("2FA verify error", error);
      setTwoFactorStatus("error");
      setTwoFactorMessage("Unable to verify your code. Please try again.");
    }
  };

  const handleDisableTwoFactor = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setTwoFactorStatus("saving");
    setTwoFactorMessage(null);

    try {
      const response = await fetch("/api/settings/two-factor/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(twoFactorDisableForm),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setTwoFactorStatus("error");
        setTwoFactorMessage(extractErrorMessage(result));
        return;
      }

      setTwoFactorStatus("success");
      setTwoFactorMessage("Two-factor authentication has been disabled.");
      setTwoFactorEnabledState(false);
      setTwoFactorDisableVisible(false);
      setTwoFactorSetupVisible(false);
      setTwoFactorSetupData(null);
      setTwoFactorRecoveryCodes(null);
      setShowRecoveryForm(false);
      setTwoFactorDisableForm({
        currentPassword: "",
        code: "",
        recoveryCode: "",
      });
    } catch (error) {
      console.error("2FA disable error", error);
      setTwoFactorStatus("error");
      setTwoFactorMessage("Unable to disable two-factor right now.");
    }
  };

  const handleRegenerateRecoveryCodes = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setTwoFactorStatus("saving");
    setTwoFactorMessage(null);

    try {
      const response = await fetch(
        "/api/settings/two-factor/recovery-codes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(twoFactorRecoveryForm),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setTwoFactorStatus("error");
        setTwoFactorMessage(extractErrorMessage(result));
        return;
      }

      const recoveryCodes = Array.isArray(result?.recoveryCodes)
        ? (result.recoveryCodes as string[])
        : [];

      setTwoFactorStatus("success");
      setTwoFactorMessage("Generated a fresh set of recovery codes.");
      setTwoFactorRecoveryCodes(recoveryCodes);
      setTwoFactorRecoveryForm({ code: "" });
      setShowRecoveryForm(true);
    } catch (error) {
      console.error("2FA recovery code error", error);
      setTwoFactorStatus("error");
      setTwoFactorMessage(
        "Unable to generate new recovery codes right now.",
      );
    }
  };

  const handleAppearanceSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAppearanceStatus("saving");
    setAppearanceMessage(null);

    try {
      const response = await fetch("/api/settings/appearance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appearanceForm),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAppearanceStatus("error");
        setAppearanceMessage(extractErrorMessage(payload));
        return;
      }

      const nextTheme = (payload?.data?.theme as ThemeName) ?? appearanceForm.theme;
      if (typeof document !== "undefined") {
        document.documentElement.dataset.theme = nextTheme;
      }

      setAppearanceStatus("success");
      setAppearanceMessage(payload?.message ?? "Appearance preferences updated.");
      router.refresh();
    } catch (error) {
      console.error("Appearance update error", error);
      setAppearanceStatus("error");
      setAppearanceMessage("Unable to save appearance preferences right now.");
    }
  };

  // Notifications removed

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
      {shouldRender("profile") ? (
        <section id="profile-section" className={sectionClassName("profile")}>
        <header className="space-y-2">
          <h2 className="text-[0.95rem] font-semibold text-white sm:text-base">Profile</h2>
          <p className="text-[0.8rem] text-white/60 sm:text-sm">
            Update your public profile information and how other readers see you.
          </p>
        </header>
        <form className="space-y-4 sm:space-y-5" onSubmit={handleProfileSubmit}>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
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
                <option key={option.value} value={option.value} className="bg-black text-sm">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            <span>Avatar</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-base font-semibold uppercase text-white/60 sm:h-20 sm:w-20">
                {profileForm.avatarUrl ? (
                  <Image
                    src={profileForm.avatarUrl}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                ) : (
                  avatarFallbackInitial.toUpperCase()
                )}
              </div>
              <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            {profileMessage ? (
              <p className={`text-sm ${statusToneClass(profileStatus)}`}>{profileMessage}</p>
            ) : null}
            <button
              type="submit"
              className={`${primaryButtonClass} w-full sm:w-auto`}
              disabled={profileStatus === "saving"}
            >
              {profileStatus === "saving" ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
        </section>
      ) : null}

      {shouldRender("account") ? (
        <section className={sectionClassName("account")}>
        <header className="space-y-2">
          <h2 className="text-[0.95rem] font-semibold text-white sm:text-base">Account</h2>
          <p className="text-[0.8rem] text-white/60 sm:text-sm">
            Manage how you sign in to Shujia.
            {shouldRender("profile") ? (
              <>
                {" "}
                Need to tune your public details instead?{" "}
                <a href="#profile-section" className="text-accent transition hover:text-white">
                  Jump to your profile
                </a>
                .
              </>
            ) : null}
          </p>
        </header>
        <div className="flex flex-col gap-2 border-b border-white/10 pb-4 text-[0.85rem] text-white/70 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <span>Signed in on this device.</span>
          <div className="flex justify-end sm:justify-start">
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[0.85rem] font-semibold text-white sm:text-sm">Primary email</p>
              <p className="text-base font-medium text-white sm:text-lg">{user.email}</p>
              <p className="text-[0.8rem] text-white/60 sm:text-sm">
                We’ll send security alerts, receipts, and verification links to this address.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-[0.8rem] text-white/60 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
              <span>Want to switch inboxes?</span>
              <button
                type="button"
                onClick={() => setShowEmailEditor((prev) => !prev)}
                className={neutralButtonClass}
              >
                {showEmailEditor ? "Close email editor" : "Change email"}
              </button>
            </div>
            {showEmailEditor ? (
              <form
                className="space-y-4 border-t border-white/10 pt-4 sm:space-y-5 sm:pt-5"
                onSubmit={handleEmailSubmit}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    <span>New email address</span>
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
                        setEmailForm((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
                      }
                      className={inputClass}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  {emailMessage ? (
                    <p className={`text-sm ${statusToneClass(emailStatus)}`}>{emailMessage}</p>
                  ) : null}
                  <button
                    type="submit"
                    className={`${primaryButtonClass} w-full sm:w-auto`}
                    disabled={emailStatus === "saving"}
                  >
                    {emailStatus === "saving" ? "Saving..." : "Update email"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[0.85rem] font-semibold text-white sm:text-sm">Password</p>
              <p className="text-[0.8rem] text-white/60 sm:text-sm">
                Choose a strong, unique password to keep your reading progress safe.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-[0.8rem] text-white/60 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
              <span>Haven’t updated it in a while?</span>
              <button
                type="button"
                onClick={() => setShowPasswordEditor((prev) => !prev)}
                className={neutralButtonClass}
              >
                {showPasswordEditor ? "Close password editor" : "Change password"}
              </button>
            </div>
            {showPasswordEditor ? (
              <form
                className="space-y-4 border-t border-white/10 pt-4 sm:space-y-5 sm:pt-5"
                onSubmit={handlePasswordSubmit}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className={`${labelClass} md:col-span-1`}>
                    <span>Current password</span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
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
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                        }))
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
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="submit"
                    className={`${primaryButtonClass} w-full sm:w-auto`}
                    disabled={passwordStatus === "saving"}
                  >
                    {passwordStatus === "saving" ? "Updating..." : "Change password"}
                  </button>
                  </div>
                </form>
              ) : null}
            </div>
        </div>

        {/* Content Filtering - 3 Tier System */}
        <div className="space-y-6 border-t border-white/10 pt-6">
          <div className="space-y-2">
            <p className="text-[0.85rem] font-semibold text-white sm:text-sm">
              Content Filtering
            </p>
            <p className="text-[0.8rem] text-white/60 sm:text-sm">
              Control the level of mature content displayed. Each level is hierarchical - enabling a higher level requires enabling the previous levels.
            </p>
          </div>
          
          {/* Level 1: Mature Content */}
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Level 1: Mature Content</p>
                <p className="text-xs text-white/60 mt-1">
                  Ecchi, romantic tension, mild nudity, suggestive situations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input 
                  type="checkbox"
                  checked={matureContentEnabled}
                  onChange={handleMatureContentToggle}
                  className="sr-only peer"
                  disabled={contentStatus === "saving"}
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-disabled:opacity-50"></div>
              </label>
            </div>
            <p className="text-xs text-white/50">
              📝 Examples: romantic tension, partial nudity, adult themes
            </p>
          </div>
          
          {/* Level 2: Explicit Content */}
          <div className={`space-y-3 rounded-lg border ${!matureContentEnabled ? 'border-white/5 bg-white/[0.02] opacity-60' : 'border-white/10 bg-white/5'} p-4 transition`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-sm font-medium ${!matureContentEnabled ? 'text-white/40' : 'text-white'}`}>
                  Level 2: Explicit Sexual Content
                </p>
                <p className={`text-xs ${!matureContentEnabled ? 'text-white/30' : 'text-white/60'} mt-1`}>
                  Frequent nudity, explicit intimacy scenes (18+)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input 
                  type="checkbox"
                  checked={explicitContentEnabled}
                  onChange={handleExplicitContentToggle}
                  className="sr-only peer"
                  disabled={!matureContentEnabled || contentStatus === "saving"}
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-disabled:opacity-50"></div>
              </label>
            </div>
            <p className={`text-xs ${!matureContentEnabled ? 'text-white/30' : 'text-white/50'}`}>
              ⚠️ You must be 18+ to enable this. Contains explicit sexual content.
            </p>
          </div>
          
          {/* Level 3: Pornographic */}
          <div className={`space-y-3 rounded-lg border ${!explicitContentEnabled ? 'border-white/5 bg-white/[0.02] opacity-60' : 'border-white/10 bg-white/5'} p-4 transition`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-sm font-medium ${!explicitContentEnabled ? 'text-white/40' : 'text-white'}`}>
                  Level 3: Pornographic Content
                </p>
                <p className={`text-xs ${!explicitContentEnabled ? 'text-white/30' : 'text-white/60'} mt-1`}>
                  Hentai, doujinshi - graphic sexual material (18+)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input 
                  type="checkbox"
                  checked={pornographicContentEnabled}
                  onChange={handlePornographicContentToggle}
                  className="sr-only peer"
                  disabled={!explicitContentEnabled || contentStatus === "saving"}
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-disabled:opacity-50"></div>
              </label>
            </div>
            <p className={`text-xs ${!explicitContentEnabled ? 'text-white/30' : 'text-white/50'}`}>
              🔞 18+ ONLY. Explicit pornographic content.
            </p>
          </div>
          
          {contentMessage && (
            <p className={`text-sm ${contentStatus === "success" ? "text-accent" : "text-red-400"}`}>
              {contentMessage}
            </p>
          )}
        </div>
      </section>
      ) : null}

      {/* Notifications section removed */}

      {shouldRender("security") ? (
        <section className={sectionClassName("security")}>
          <header className="space-y-2">
            <h2 className="text-[0.95rem] font-semibold text-white sm:text-base">Two-factor authentication</h2>
            <p className="text-[0.8rem] text-white/60 sm:text-sm">
              Lock down your account with a rotating code, and manage recovery options if you ever lose your device.
            </p>
          </header>
          <div className="space-y-4">
            {twoFactorMessage ? (
              <p className={`text-sm ${statusToneClass(twoFactorStatus)}`}>{twoFactorMessage}</p>
            ) : null}
            {!twoFactorEnabledState ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={startTwoFactorSetup}
                  className={primaryButtonClass}
                  disabled={twoFactorStatus === "saving" && !twoFactorSetupVisible}
                >
                  {twoFactorStatus === "saving" && !twoFactorSetupVisible
                    ? "Preparing..."
                    : "Set up authenticator"}
                </button>
                {twoFactorSetupVisible && twoFactorSetupData ? (
                  <div className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-4">
                    {twoFactorSetupData.qrCode ? (
                      <div className="flex justify-center">
                        <Image
                          src={twoFactorSetupData.qrCode}
                          alt="Scan this QR code with your authenticator app"
                          width={176}
                          height={176}
                          unoptimized
                          className="h-44 w-44 rounded-lg border border-white/10 bg-white/5 p-2 object-contain"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-2 text-sm text-white/70">
                      <p>Secret key (manual entry):</p>
                      <p className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-mono text-xs text-white">
                        {twoFactorSetupData.secret}
                      </p>
                    </div>
                    <form className="space-y-4" onSubmit={handleVerifyTwoFactor}>
                      <label className={labelClass}>
                        <span>6-digit code</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={twoFactorVerifyForm.code}
                          onChange={(event) =>
                            setTwoFactorVerifyForm((prev) => ({
                              ...prev,
                              code: event.target.value,
                            }))
                          }
                          className={inputClass}
                          placeholder="123 456"
                          required
                        />
                      </label>
                      <label className={labelClass}>
                        <span>Confirm with your password</span>
                        <input
                          type="password"
                          value={twoFactorVerifyForm.currentPassword}
                          onChange={(event) =>
                            setTwoFactorVerifyForm((prev) => ({
                              ...prev,
                              currentPassword: event.target.value,
                            }))
                          }
                          className={inputClass}
                          autoComplete="current-password"
                          required
                        />
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="submit"
                          className={`${primaryButtonClass} w-full sm:w-auto`}
                          disabled={twoFactorStatus === "saving"}
                        >
                          {twoFactorStatus === "saving" ? "Verifying..." : "Enable 2FA"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  <p>
                    Status:{" "}
                    <span className="font-semibold text-emerald-300">Enabled</span>
                  </p>
                  <p>Your authenticator will be required next time you sign in.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorDisableVisible((prev) => !prev);
                      setTwoFactorMessage(null);
                    }}
                    className={neutralButtonClass}
                  >
                    {twoFactorDisableVisible ? "Close disable form" : "Disable 2FA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryForm((prev) => !prev);
                      setTwoFactorMessage(null);
                    }}
                    className={neutralButtonClass}
                  >
                    {showRecoveryForm ? "Hide recovery options" : "Recovery codes"}
                  </button>
                </div>

                {twoFactorDisableVisible ? (
                  <form
                    className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-4"
                    onSubmit={handleDisableTwoFactor}
                  >
                    <label className={labelClass}>
                      <span>Current password</span>
                      <input
                        type="password"
                        value={twoFactorDisableForm.currentPassword}
                        onChange={(event) =>
                          setTwoFactorDisableForm((prev) => ({
                            ...prev,
                            currentPassword: event.target.value,
                          }))
                        }
                        className={inputClass}
                        autoComplete="current-password"
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      <span>Authenticator code</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={twoFactorDisableForm.code}
                        onChange={(event) =>
                          setTwoFactorDisableForm((prev) => ({
                            ...prev,
                            code: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="123 456"
                      />
                      <span className={helpTextClass}>
                        Or enter one of your recovery codes below.
                      </span>
                    </label>
                    <label className={labelClass}>
                      <span>Recovery code (optional)</span>
                      <input
                        type="text"
                        value={twoFactorDisableForm.recoveryCode}
                        onChange={(event) =>
                          setTwoFactorDisableForm((prev) => ({
                            ...prev,
                            recoveryCode: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="ABCD-EFGH"
                      />
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="submit"
                        className={`${dangerButtonClass} w-full sm:w-auto`}
                        disabled={twoFactorStatus === "saving"}
                      >
                        {twoFactorStatus === "saving" ? "Disabling..." : "Disable 2FA"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {showRecoveryForm ? (
                  <div className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="space-y-2 text-sm text-white/70">
                      <p>
                        Store these one-time recovery codes somewhere safe. Each code can only be used once.
                      </p>
                    </div>
                    {twoFactorRecoveryCodes ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {twoFactorRecoveryCodes.map((code) => (
                          <p
                            key={code}
                            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-mono text-sm tracking-widest text-white"
                          >
                            {code}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/60">
                        Generate a new set whenever you need to refresh them.
                      </p>
                    )}
                    <form
                      className="space-y-4 border-t border-white/10 pt-4"
                      onSubmit={handleRegenerateRecoveryCodes}
                    >
                      <label className={labelClass}>
                        <span>Authenticator code</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={twoFactorRecoveryForm.code}
                          onChange={(event) =>
                            setTwoFactorRecoveryForm({ code: event.target.value })
                          }
                          className={inputClass}
                          placeholder="123 456"
                          required
                        />
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="submit"
                          className={`${primaryButtonClass} w-full sm:w-auto`}
                          disabled={twoFactorStatus === "saving"}
                        >
                          {twoFactorStatus === "saving" ? "Generating..." : "Generate new codes"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {shouldRender("appearance") ? (
        <section className={sectionClassName("appearance")}>
          <header className="space-y-2">
            <h2 className="text-[0.95rem] font-semibold text-white sm:text-base">Appearance</h2>
            <p className="text-[0.8rem] text-white/60 sm:text-sm">
              Choose the theme that fits your workspace. Changes apply instantly across Shujia.
            </p>
          </header>

          <form className="space-y-5 sm:space-y-6" onSubmit={handleAppearanceSubmit}>
            <fieldset>
              <div className="grid grid-cols-3 gap-3 sm:gap-4 md:w-2/3">
                {THEME_OPTIONS.map((option) => {
                  const isSelected = appearanceForm.theme === option.value;
                  return (
                    <label
                      key={option.value}
                      className="group relative block cursor-pointer select-none"
                      aria-label={option.label}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={isSelected}
                        onChange={(event) =>
                          setAppearanceForm({ theme: event.target.value as ThemeName })
                        }
                        className="sr-only"
                      />
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-16 w-full rounded-xl border transition ${isSelected ? "border-accent ring-1 ring-accent/60" : "border-white/10 hover:border-white/30"}`}
                          style={{ backgroundColor: option.preview.from }}
                          aria-hidden
                        />
                        <span className="mt-1 text-center text-[0.7rem] text-white/70">
                          {option.label}
                        </span>
                      </div>
                      <span className="sr-only">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              {appearanceMessage ? (
                <p className={`text-sm ${statusToneClass(appearanceStatus)}`}>
                  {appearanceMessage}
                </p>
              ) : null}
              <button
                type="submit"
                className={`${primaryButtonClass} w-full sm:w-auto`}
                disabled={appearanceStatus === "saving"}
              >
                {appearanceStatus === "saving" ? "Saving..." : "Save appearance"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {shouldRender("sessions") ? (
        <section className={sectionClassName("sessions")}>
        <header className="space-y-2">
          <h2 className="text-[0.95rem] font-semibold text-white sm:text-base">Sessions</h2>
          <p className="text-[0.8rem] text-white/60 sm:text-sm">
            You are currently signed in on {activeSessionCount} device
            {activeSessionCount === 1 ? "" : "s"}.
          </p>
        </header>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          {sessionsMessage ? (
            <p className={`text-sm ${statusToneClass(sessionsStatus)}`}>{sessionsMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={handleSignOutOtherSessions}
            className={`${neutralButtonClass} w-full sm:w-auto`}
            disabled={sessionsStatus === "saving"}
          >
            {sessionsStatus === "saving" ? "Revoking..." : "Sign out others"}
          </button>
        </div>
        </section>
      ) : null}

      {shouldRender("danger") ? (
        <section className={sectionClassName("danger")}>
        <header className="space-y-2">
          <h2 className="text-[0.95rem] font-semibold text-red-200 sm:text-base">Danger zone</h2>
          <p className="text-[0.8rem] text-red-200/80 sm:text-sm">
            Deleting your account removes reading history, sessions, and preferences. This action is
            irreversible.
          </p>
        </header>
        <form className="space-y-5 sm:space-y-6" onSubmit={handleDeleteAccount}>
          <label className="flex flex-col gap-1.5 text-[0.85rem] font-medium text-red-200/90 sm:gap-2 sm:text-sm">
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
          <label className="flex flex-col gap-1.5 text-[0.85rem] font-medium text-red-200/90 sm:gap-2 sm:text-sm">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
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
              className={`${dangerButtonClass} w-full sm:w-auto`}
              disabled={dangerStatus === "saving"}
            >
              {dangerStatus === "saving" ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </form>
        </section>
      ) : null}
    </div>
  );
}
