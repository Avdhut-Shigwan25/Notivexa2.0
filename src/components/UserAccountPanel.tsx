import React, { useState, useEffect } from "react";
import { User, signOut, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  Info, 
  Sparkles, 
  Clock, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  Trash2, 
  Download, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  X, 
  Settings, 
  Database, 
  Server, 
  Edit3, 
  Save,
  CheckCircle,
  HelpCircle,
  HardDrive
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserAccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isDarkMode: boolean;
  onSignOut?: () => void;
  initialTab?: "profile" | "security" | "about" | "logout";
}

export const UserAccountPanel: React.FC<UserAccountPanelProps> = ({
  isOpen,
  onClose,
  user,
  isDarkMode,
  onSignOut,
  initialTab = "profile",
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "about" | "logout">(initialTab);
  
  // Profile edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Security states
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // System Health states
  const [backendHealth, setBackendHealth] = useState<"checking" | "ok" | "error">("checking");
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Sync state when panel opens or user changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setDisplayName(user?.displayName || "");
      setProfileMessage(null);
      setSecurityMessage(null);
      setCacheCleared(false);
      checkBackendHealth();
    }
  }, [isOpen, initialTab, user]);

  const checkBackendHealth = async () => {
    setBackendHealth("checking");
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setBackendHealth("ok");
      } else {
        setBackendHealth("error");
      }
    } catch {
      setBackendHealth("error");
    }
  };

  // Handle Display Name Update
  const handleSaveDisplayName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (!displayName.trim()) {
      setProfileMessage({ type: "error", text: "Display name cannot be empty." });
      return;
    }
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setIsEditingName(false);
      setProfileMessage({ type: "success", text: "Display name updated successfully!" });
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message || "Failed to update profile name." });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Reset Email
  const handleSendPasswordReset = async () => {
    if (!user || !user.email) return;
    setResetEmailSending(true);
    setSecurityMessage(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSecurityMessage({
        type: "success",
        text: `Password reset instructions have been sent to ${user.email}. Check your inbox and spam folder.`,
      });
    } catch (err: any) {
      setSecurityMessage({
        type: "error",
        text: err.message || "Failed to dispatch password reset email.",
      });
    } finally {
      setResetEmailSending(false);
    }
  };

  // Handle Copy to clipboard
  const handleCopy = (text: string, type: "uid" | "email") => {
    navigator.clipboard.writeText(text);
    if (type === "uid") {
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Handle Clear Local Workspace Cache
  const handleClearCache = () => {
    try {
      // Clear non-critical local storage caches
      sessionStorage.clear();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      console.error("Failed to clear cache:", err);
    }
  };

  // Export User Profile metadata
  const handleExportDataSummary = () => {
    if (!user) return;
    const summaryData = {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
        providers: user.providerData.map((p) => p.providerId),
      },
      client: {
        platform: "Notivexa AI Web Portal v2.0",
        exportTimestamp: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Notivexa_Account_Data_${user.uid.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Logout
  const handleLogoutAction = async () => {
    try {
      if (onSignOut) {
        onSignOut();
      } else {
        await signOut(auth);
      }
      onClose();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (!isOpen) return null;

  const creationDate = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recent";

  const lastLoginDate = user?.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Current Session";

  const isGoogleUser = user?.providerData.some((p) => p.providerId === "google.com");

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-3xl rounded-[28px] border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
            isDarkMode 
              ? "bg-[#1E1E1B] border-[#383832] text-[#E0E0D5]" 
              : "bg-white border-slate-200/90 text-slate-800"
          }`}
        >
          {/* Header */}
          <div className={`p-6 pb-5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isDarkMode ? "border-[#33332D] bg-[#242420]" : "border-slate-100 bg-slate-50/80"
          }`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Avatar"}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
                    {user?.displayName
                      ? user.displayName.charAt(0).toUpperCase()
                      : user?.email
                      ? user.email.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#1E1E1B] rounded-full shadow-xs" title="Online" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-serif leading-tight">
                    {user?.displayName || "Student User"}
                  </h2>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isGoogleUser 
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {isGoogleUser ? "Google Auth" : "Email Account"}
                  </span>
                </div>
                <p className={`text-xs ${isDarkMode ? "text-[#9E9E8F]" : "text-slate-500"}`}>
                  {user?.email || "No email specified"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDarkMode 
                  ? "hover:bg-[#33332D] text-[#A1A194] hover:text-[#E0E0D5]" 
                  : "hover:bg-slate-200/70 text-slate-500 hover:text-slate-800"
              }`}
              title="Close Panel"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className={`px-6 pt-3 border-b flex gap-2 shrink-0 overflow-x-auto custom-scrollbar transition-colors ${
            isDarkMode ? "border-[#33332D] bg-[#22221F]" : "border-slate-100 bg-slate-50/50"
          }`}>
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "profile"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#8E8E80] dark:hover:text-[#E0E0D5]"
              }`}
            >
              <UserIcon size={15} />
              Account Profile
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "security"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#8E8E80] dark:hover:text-[#E0E0D5]"
              }`}
            >
              <ShieldCheck size={15} />
              Privacy & Security
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "about"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-[#8E8E80] dark:hover:text-[#E0E0D5]"
              }`}
            >
              <Info size={15} />
              About Notivexa
            </button>

            <button
              onClick={() => setActiveTab("logout")}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ml-auto ${
                activeTab === "logout"
                  ? "border-red-500 text-red-600 dark:border-red-400 dark:text-red-400 font-bold"
                  : "border-transparent text-red-500/80 hover:text-red-600 dark:text-red-400/80 dark:hover:text-red-400"
              }`}
            >
              <LogOut size={15} />
              Log Out
            </button>
          </div>

          {/* Modal Body / Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* TAB 1: PROFILE */}
            {activeTab === "profile" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {profileMessage && (
                  <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 font-medium border ${
                    profileMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  }`}>
                    {profileMessage.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                {/* Identity & Display Name Form */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A194] flex items-center gap-2">
                      <UserIcon size={14} className="text-indigo-500" />
                      User Identity
                    </h3>
                    {!isEditingName && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          isDarkMode 
                            ? "bg-[#33332D] hover:bg-[#3D3D36] text-[#E0E0D5]" 
                            : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs"
                        }`}
                      >
                        <Edit3 size={13} />
                        Edit Name
                      </button>
                    )}
                  </div>

                  {isEditingName ? (
                    <form onSubmit={handleSaveDisplayName} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                          Full / Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your display name"
                          disabled={profileSaving}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 ${
                            isDarkMode
                              ? "bg-[#1C1C19] border-[#4A4A3F] focus:border-indigo-400 text-[#F5F5F0]"
                              : "bg-white border-slate-300 focus:border-indigo-600 text-slate-900"
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Save size={13} />
                          {profileSaving ? "Saving..." : "Save Name"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDisplayName(user?.displayName || "");
                            setIsEditingName(false);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            isDarkMode ? "hover:bg-[#33332D] text-[#A1A194]" : "hover:bg-slate-200 text-slate-600"
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400">Display Name</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {user?.displayName || "Not set (Anonymous Student)"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400">Account Status</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} /> Active Student Account
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email & Unique User Identifier */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A194] flex items-center gap-2 mb-4">
                    <Mail size={14} className="text-indigo-500" />
                    Contact & Authentication IDs
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832]">
                      <div className="min-w-0 pr-2">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Registered Email
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-[#E0E0D5] truncate block">
                          {user?.email || "No email"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {user?.emailVerified ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            Standard
                          </span>
                        )}
                        <button
                          onClick={() => user?.email && handleCopy(user.email, "email")}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2D2D2A] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copy Email"
                        >
                          {copiedEmail ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832]">
                      <div className="min-w-0 pr-2">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Firebase User Identifier (UID)
                        </span>
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate block">
                          {user?.uid || "Anonymous"}
                        </span>
                      </div>
                      <button
                        onClick={() => user?.uid && handleCopy(user.uid, "uid")}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2D2D2A] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                        title="Copy UID"
                      >
                        {copiedUid ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Activity Timeline */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A194] flex items-center gap-2 mb-4">
                    <Clock size={14} className="text-indigo-500" />
                    Session & Timeline
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832] flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Member Since</span>
                        <span className="font-semibold text-slate-700 dark:text-[#E0E0D5]">{creationDate}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832] flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Clock size={16} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Last Sign In</span>
                        <span className="font-semibold text-slate-700 dark:text-[#E0E0D5]">{lastLoginDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: PRIVACY & SECURITY */}
            {activeTab === "security" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {securityMessage && (
                  <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 font-medium border ${
                    securityMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  }`}>
                    {securityMessage.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span>{securityMessage.text}</span>
                  </div>
                )}

                {/* Authentication Security Provider */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Account Protection
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-[#9E9E8F]">
                          {isGoogleUser
                            ? "Signed in via Google OAuth 2.0 with multi-factor authentication support"
                            : "Protected with email credentials and Firebase encrypted tokens"}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      Protected
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-[#33332D] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Password & Login Credentials
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isGoogleUser
                          ? "Password is managed directly by your Google Account security dashboard."
                          : "You can request a secure reset link to update your Notivexa password."}
                      </span>
                    </div>

                    {!isGoogleUser && user?.email && (
                      <button
                        onClick={handleSendPasswordReset}
                        disabled={resetEmailSending}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {resetEmailSending ? "Sending link..." : "Reset Password via Email"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Privacy & AI Safeguards */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A194] flex items-center gap-2 mb-4">
                    <Database size={14} className="text-indigo-500" />
                    Data Privacy & AI Processing
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832]">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <Lock size={14} className="text-emerald-500" />
                        Private Firestore Isolation
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        All your generated documents, question papers, slide notes, and book histories are stored strictly under your private account collection (<code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-[#2D2D2A] text-slate-800 dark:text-slate-200 font-mono">users/{user?.uid?.slice(0, 8)}...</code>). No other user or unauthorized third party has access.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832]">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <Sparkles size={14} className="text-sky-500" />
                        Zero Model Training Policy
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        API requests made to Google Gemini are executed through enterprise developer tokens with stateless retention. Uploaded textbooks, slides, and syllabus notes are never ingested to train public foundational AI models.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Storage & Privacy Controls */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A194] flex items-center gap-2 mb-4">
                    <HardDrive size={14} className="text-indigo-500" />
                    Storage & Privacy Controls
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832]">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Download Account Data Summary
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Export a readable JSON record of your account profile and session identifiers.
                        </span>
                      </div>
                      <button
                        onClick={handleExportDataSummary}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                          isDarkMode
                            ? "bg-[#2D2D2A] border-[#4A4A3F] hover:bg-[#383832] text-[#E0E0D5]"
                            : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs"
                        }`}
                      >
                        <Download size={13} /> Export JSON
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832]">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Clear Local Workspace Cache
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Purge temporary local web session data and reset cached client states.
                        </span>
                      </div>
                      <button
                        onClick={handleClearCache}
                        disabled={cacheCleared}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                          cacheCleared
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : isDarkMode
                            ? "bg-[#2D2D2A] border-[#4A4A3F] hover:bg-[#383832] text-[#E0E0D5]"
                            : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs"
                        }`}
                      >
                        {cacheCleared ? <Check size={13} /> : <Trash2 size={13} />}
                        {cacheCleared ? "Cache Cleared" : "Clear Cache"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: ABOUT */}
            {activeTab === "about" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Branding Hero */}
                <div className={`p-6 rounded-2xl border text-center transition-colors relative overflow-hidden ${
                  isDarkMode 
                    ? "bg-gradient-to-br from-[#252521] to-[#1E1E1B] border-[#383832]" 
                    : "bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 border-slate-200/80"
                }`}>
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-500/25 mb-3">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-[#F5F5F0]">
                    Notivexa <span className="italic font-extrabold bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-transparent">AI 2.0</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#9E9E8F] mt-1 max-w-md mx-auto">
                    Intelligent academic study companion, automated curriculum assessment generator, visual slide presentation creator, and lecture synthesizer.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Release v2.0.4
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      Gemini 2.5 Multimodal
                    </span>
                  </div>
                </div>

                {/* System Diagnostics & Backend Status */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A194] flex items-center gap-2">
                      <Server size={14} className="text-indigo-500" />
                      Live System Diagnostics
                    </h3>
                    <button
                      onClick={checkBackendHealth}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw size={11} className={backendHealth === "checking" ? "animate-spin" : ""} />
                      Check Health
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832] flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Backend Express API</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        {backendHealth === "ok" && (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Operational
                          </span>
                        )}
                        {backendHealth === "checking" && (
                          <span className="text-amber-500 flex items-center gap-1">Checking...</span>
                        )}
                        {backendHealth === "error" && (
                          <span className="text-rose-500 flex items-center gap-1">Offline</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832] flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">AI Model Engine</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Google Gemini 2.5</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832] flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Document Parsing</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">PDF, OCR, DOCX, PPTX</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/70 dark:bg-[#1C1C19] border border-slate-200/60 dark:border-[#383832] flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Database Layer</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Firebase Firestore</span>
                    </div>
                  </div>
                </div>

                {/* Core Modules Breakdown */}
                <div className={`p-5 rounded-2xl border transition-colors ${
                  isDarkMode ? "bg-[#252521] border-[#383832]" : "bg-slate-50/70 border-slate-200/80"
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A1A194] flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-indigo-500" />
                    Built-in Academic Tools
                  </h3>

                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                    <li><strong className="text-slate-800 dark:text-slate-200">Study Notes & Flashcards:</strong> Instant key concept extraction with markdown highlights and interactive flip cards.</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">University Exam Papers:</strong> Full question papers mapped to Course Outcomes (CO) and Bloom's Taxonomy (BT) levels.</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Slide Deck Synthesis:</strong> Direct export to Microsoft PowerPoint (.pptx) with structured headings and bullets.</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Smart Video Explainer:</strong> Slide-by-slide AI audio voiceover narration and playback.</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Contextual Tutor Chatbot:</strong> Ask natural questions grounded directly in your uploaded syllabus or e-library books.</li>
                  </ul>
                </div>

                <div className="text-center text-[11px] text-slate-400 dark:text-[#7A7A6D] pt-2">
                  Notivexa AI &bull; Released under MIT License &bull; Designed for students, researchers, and educators.
                </div>
              </motion.div>
            )}

            {/* TAB 4: LOG OUT */}
            {activeTab === "logout" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className={`p-6 rounded-2xl border text-center transition-colors ${
                  isDarkMode 
                    ? "bg-[#261E1E] border-rose-900/40 text-rose-200" 
                    : "bg-rose-50/70 border-rose-200 text-rose-900"
                }`}>
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-2xl shadow-sm mb-4">
                    <LogOut size={26} />
                  </div>

                  <h3 className="text-lg font-bold font-serif mb-1">
                    Sign Out of Notivexa?
                  </h3>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/80 max-w-md mx-auto mb-6">
                    You are currently signed in as <strong className="font-semibold">{user?.email || "this user"}</strong>. Signing out will end your current active session.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                    <button
                      onClick={handleLogoutAction}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut size={14} />
                      Yes, Sign Out Now
                    </button>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        isDarkMode 
                          ? "bg-[#252521] border-[#383832] text-[#E0E0D5] hover:bg-[#2F2F29]" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                      }`}
                    >
                      Stay Signed In
                    </button>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border text-xs text-slate-500 dark:text-slate-400 ${
                  isDarkMode ? "bg-[#20201D] border-[#33332D]" : "bg-slate-50 border-slate-200/70"
                }`}>
                  <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <Info size={14} className="text-indigo-500" />
                    Session Note
                  </div>
                  Your saved library books and generated question papers will remain safely stored under your account in Firestore and will be available immediately the next time you sign in.
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Bar */}
          <div className={`p-4 px-6 border-t flex items-center justify-between shrink-0 text-xs transition-colors ${
            isDarkMode ? "border-[#33332D] bg-[#242420] text-[#8E8E80]" : "border-slate-100 bg-slate-50/80 text-slate-500"
          }`}>
            <span>Connected: {user?.email || "Authenticated"}</span>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                isDarkMode 
                  ? "bg-[#33332D] hover:bg-[#3D3D36] text-[#E0E0D5]" 
                  : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs"
              }`}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
