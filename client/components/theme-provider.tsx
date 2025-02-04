"use client"

import * as React from "react"
import { useEffect, useState } from 'react'
import { ThemeProvider as NextThemesProvider } from "next-themes"

export const useMounted = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const mounted = useMounted()
  return mounted && <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
