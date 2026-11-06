"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  variant?: "button" | "icon" | "sidebar";
}

export function ThemeToggle({ className = "", variant = "button" }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(hasDarkClass);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        // ignore
      }
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {
        // ignore
      }
    }
  };

  if (!mounted) {
    // Render placeholder with same dimensions to avoid layout shift
    if (variant === "icon") {
      return (
        <div className={`h-8 w-8 rounded-lg border border-border/60 ${className}`} />
      );
    }
    return (
      <div className={`h-9 w-full rounded-xl border border-border/60 ${className}`} />
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-bg-surface text-fg transition-all hover:border-accent hover:text-accent active:scale-95 ${className}`}
      >
        {isDark ? (
          <Sun size={16} className="text-amber-400 transition-transform duration-200 rotate-0" />
        ) : (
          <Moon size={16} className="text-slate-600 transition-transform duration-200" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`group flex w-full items-center justify-between rounded-xl border border-border/70 bg-bg-surface/80 px-3 py-2 text-xs font-semibold text-fg transition-all hover:border-border-strong hover:bg-bg-raised active:scale-[0.99] ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
            isDark ? "bg-amber-400/15 text-amber-400" : "bg-blue-600/10 text-blue-600"
          }`}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </div>
        <span className="truncate">{isDark ? "Tema Oscuro" : "Tema Claro"}</span>
      </div>

      {/* Switch visual */}
      <div
        className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
          isDark ? "bg-accent" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-xs transition-transform duration-200 ${
            isDark ? "left-3.5" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}
