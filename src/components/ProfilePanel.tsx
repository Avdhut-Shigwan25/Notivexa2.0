import React from "react";
import { User } from "firebase/auth";
import { UserProfile } from "./UserProfile";

export const ProfilePanel = ({ 
  user, 
  isDarkMode, 
  onSignOut 
}: { 
  user: User | null; 
  isDarkMode: boolean; 
  onSignOut?: () => void; 
}) => {
  return <UserProfile user={user} isDarkMode={isDarkMode} onSignOut={onSignOut} />;
};

export default ProfilePanel;
