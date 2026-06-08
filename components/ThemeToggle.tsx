"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "sidebar" | "nav";
  className?: string;
}

export function ThemeToggle({ variant = "sidebar", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isNav = variant === "nav";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size={isNav ? "icon" : "sm"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        isNav
          ? "relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
          : "relative text-sidebar-foreground hover:bg-sidebar-accent h-7 w-full justify-start gap-2 px-2 text-[12px]",
        className
      )}
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      {!isNav && <span className="dark:ml-5">{mounted ? (theme === "dark" ? "Light" : "Dark") : "Theme"}</span>}
    </Button>
  );
}
