import React, { useState, useRef, useEffect } from "react";
import { User, signOut } from "firebase/auth";
import { 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Info, 
  ChevronDown, 
  Sparkles, 
  ExternalLink 
} from "lucide-react";
import { auth } from "../firebase";
import { UserAccountPanel } from "./UserAccountPanel";

interface UserProfileProps {
  user: User | null;
  isDarkMode: boolean;
  onSignOut?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  user, 
  isDarkMode,
  onSignOut 
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"profile" | "security" | "about" | "logout">("profile");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  if (!user) return null;

  const openPanel = (tab: "profile" | "security" | "about" | "logout") => {
    setPanelTab(tab);
    setAccountPanelOpen(true);
    setDropdownOpen(false);
  };

  const handleDirectSignOut = async () => {
    setDropdownOpen(false);
    if (onSignOut) {
      onSignOut();
    } else {
      await signOut(auth);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Profile Pill Trigger Button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-2.5 p-1.5 pr-3 rounded-full border transition-all cursor-pointer select-none group ${
            isDarkMode 
              ? "bg-[#22221F] border-[#383832] text-[#E0E0D5] hover:bg-[#2A2A26] hover:border-[#4A4A3F] shadow-[0_2px_12px_rgba(0,0,0,0.25)]" 
              : "bg-white/95 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
          }`}
          title="Account Settings, Privacy & Log Out"
        >
          {/* Avatar */}
          <div className="relative">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.displayName 
                  ? user.displayName.charAt(0).toUpperCase() 
                  : user.email 
                  ? user.email.charAt(0).toUpperCase() 
                  : <UserIcon size={14} />}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#22221F] rounded-full" />
          </div>

          {/* User Name */}
          <div className="text-left hidden sm:block">
            <span className={`text-xs font-bold block leading-tight max-w-[120px] truncate ${
              isDarkMode ? "text-[#E0E0D5] group-hover:text-white" : "text-slate-800 group-hover:text-indigo-900"
            }`}>
              {user.displayName || user.email?.split("@")[0] || "Student"}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#8E8E80] block leading-none">
              Account
            </span>
          </div>

          {/* Dropdown Chevron */}
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`} 
          />
        </button>

        {/* Quick Dropdown Menu */}
        {dropdownOpen && (
          <div 
            className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 transition-colors ${
              isDarkMode 
                ? "bg-[#22221F] border-[#383832] text-[#E0E0D5] shadow-[0_10px_35px_rgba(0,0,0,0.5)]" 
                : "bg-white border-slate-200 text-slate-800 shadow-xl"
            }`}
          >
            {/* User Mini Info */}
            <div className={`p-3 rounded-xl mb-1.5 border transition-colors ${
              isDarkMode ? "bg-[#282824] border-[#383832]" : "bg-slate-50 border-slate-100"
            }`}>
              <div className="font-bold text-xs text-slate-800 dark:text-[#F5F5F0] truncate">
                {user.displayName || "Student User"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-[#8E8E80] truncate mt-0.5">
                {user.email || "No email"}
              </div>
            </div>

            {/* Menu Options */}
            <div className="space-y-0.5 text-xs font-medium">
              <button
                onClick={() => openPanel("profile")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  isDarkMode ? "hover:bg-[#2D2D2A] text-[#E0E0D5]" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <UserIcon size={15} className="text-indigo-500" />
                <span>Account Profile</span>
              </button>

              <button
                onClick={() => openPanel("security")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  isDarkMode ? "hover:bg-[#2D2D2A] text-[#E0E0D5]" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <ShieldCheck size={15} className="text-emerald-500" />
                <span>Privacy & Security</span>
              </button>

              <button
                onClick={() => openPanel("about")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  isDarkMode ? "hover:bg-[#2D2D2A] text-[#E0E0D5]" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <Info size={15} className="text-sky-500" />
                <span>About Notivexa AI</span>
              </button>

              <div className={`my-1 border-t ${isDarkMode ? "border-[#33332D]" : "border-slate-100"}`} />

              <button
                onClick={() => openPanel("logout")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  isDarkMode 
                    ? "hover:bg-rose-950/40 text-rose-400" 
                    : "hover:bg-rose-50 text-rose-600"
                }`}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Modal Account Panel */}
      <UserAccountPanel
        isOpen={accountPanelOpen}
        onClose={() => setAccountPanelOpen(false)}
        user={user}
        isDarkMode={isDarkMode}
        onSignOut={onSignOut || handleDirectSignOut}
        initialTab={panelTab}
      />
    </>
  );
};
