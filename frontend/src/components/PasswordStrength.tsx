'use client';

import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (pwd: string) => {
    if (pwd.length === 0) return { score: 0, label: '', color: '' };

    let score = 0;

    // Length check
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;

    // Character variety checks
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    // Determine strength label and color
    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 5) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
    return { score: 4, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all ${
              level <= strength.score ? strength.color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${
        strength.score === 1 ? 'text-red-500' :
        strength.score === 2 ? 'text-orange-500' :
        strength.score === 3 ? 'text-yellow-500' :
        'text-green-500'
      }`}>
        Password strength: {strength.label}
      </p>
      {strength.score < 3 && (
        <p className="text-xs text-muted-foreground">
          Use 8+ characters with uppercase, lowercase, and numbers
        </p>
      )}
    </div>
  );
}
