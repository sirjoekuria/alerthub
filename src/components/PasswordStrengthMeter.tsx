import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
}

const checkPasswordStrength = (password: string): StrengthResult => {
  let score = 0;
  const suggestions: string[] = [];

  if (!password) {
    return { score: 0, label: "", color: "", suggestions: [] };
  }

  // Length checks
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Suggestions
  if (password.length < 8) suggestions.push("Use at least 8 characters");
  if (!/[A-Z]/.test(password)) suggestions.push("Add uppercase letters");
  if (!/[0-9]/.test(password)) suggestions.push("Add numbers");
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push("Add special characters");

  // Normalize score to 0-100
  const normalizedScore = Math.min((score / 7) * 100, 100);

  let label: string;
  let color: string;

  if (normalizedScore < 30) {
    label = "Weak";
    color = "bg-destructive";
  } else if (normalizedScore < 50) {
    label = "Fair";
    color = "bg-orange-500";
  } else if (normalizedScore < 70) {
    label = "Good";
    color = "bg-yellow-500";
  } else if (normalizedScore < 90) {
    label = "Strong";
    color = "bg-green-500";
  } else {
    label = "Very Strong";
    color = "bg-green-600";
  }

  return { score: normalizedScore, label, color, suggestions: suggestions.slice(0, 2) };
};

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const strength = useMemo(() => checkPasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn(
          "font-medium",
          strength.score < 30 && "text-destructive",
          strength.score >= 30 && strength.score < 50 && "text-orange-500",
          strength.score >= 50 && strength.score < 70 && "text-yellow-600",
          strength.score >= 70 && "text-green-600"
        )}>
          {strength.label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300", strength.color)}
          style={{ width: `${strength.score}%` }}
        />
      </div>
      {strength.suggestions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: {strength.suggestions.join(", ")}
        </p>
      )}
    </div>
  );
};
