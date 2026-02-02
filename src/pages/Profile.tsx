import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      setEmail(user.email || "");
      loadProfile();
    }
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: base64String })
          .eq("id", user?.id);

        if (error) throw error;

        setAvatarUrl(base64String);
        toast.success("Avatar updated successfully!");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error((error as Error).message || "Failed to upload avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ email });

      if (error) throw error;

      toast.success("Email update initiated! Please check your new email for confirmation.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <ProfileSkeleton />;
  }

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 h-16 flex items-center justify-between max-w-lg mx-auto w-full">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="-ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Right side placeholder - maybe app logo or user avatar small */}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6 pb-12 text-gray-900">

        {/* Avatar Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-gray-50 shadow-sm">
              <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
              <AvatarFallback className="text-3xl bg-gray-100 text-gray-500">{initials || "U"}</AvatarFallback>
            </Avatar>
          </div>
          <div className="w-full">
            <Label htmlFor="avatar-upload" className="block w-full">
              <div className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-xl text-center cursor-pointer transition-colors shadow-sm hover:shadow active:scale-[0.99]">
                Upload New Avatar
              </div>
            </Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={loading}
            />
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-gray-900">
          <h3 className="font-bold text-lg mb-4">Personal Information</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Input
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all text-gray-900 placeholder:text-gray-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-sm hover:shadow transition-all"
            >
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </div>

        {/* Email Address */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-gray-900">
          <h3 className="font-bold text-lg mb-4">Email Address</h3>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="space-y-2">
              <Input
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all text-gray-900 placeholder:text-gray-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-sm hover:shadow transition-all"
            >
              {loading ? "Updating..." : "Update Email"}
            </Button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-gray-900">
          <h3 className="font-bold text-lg mb-4">Change Password</h3>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1">
              <Input
                type="password"
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all text-gray-900 placeholder:text-gray-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                minLength={6}
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all text-gray-900 placeholder:text-gray-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-sm hover:shadow transition-all"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;
