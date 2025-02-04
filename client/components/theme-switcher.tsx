"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Moon, SunMedium, Monitor } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const themes = [
  { name: "system", icon: Monitor },
  { name: "light", icon: SunMedium },
  { name: "dark", icon: Moon },
]

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(theme)

  console.log('current theme', theme)

  const handleThemeChange = (themeToSwitch: string) => {
    setSelectedTheme(themeToSwitch)
    setTheme(themeToSwitch)
  }

  return (
    <div className="inline-flex items-center bg-muted rounded-full relative border p-0.5">
      <div className="relative flex">
        {themes.map((theme) => {
          const Icon = theme.icon
          return (
            <button
              key={theme.name}
              className={cn(
                "relative z-10 rounded-full transition-colors duration-200",
                "w-7 h-7 flex items-center justify-center",
                selectedTheme === theme.name
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => handleThemeChange(theme.name)}
              aria-label={`Switch to ${theme.name} theme`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          )
        })}
        <motion.div
          className="absolute inset-0 w-7 h-7 bg-primary rounded-full"
          initial={false}
          animate={{
            x: selectedTheme === "system" ? 0 : selectedTheme === "light" ? 28 : 56,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
      </div>
    </div>
  )
}