"use client"

import { Snowflake, Thermometer, Wind } from "lucide-react"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

export default function Snowy() {
  return (
    <Card className="relative overflow-hidden group w-72 h-40 cursor-pointer transition-all hover:shadow-lg">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-900/30 dark:to-purple-900/20 opacity-50" />

      {/* Content Container */}
      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Top Section */}
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
            <Snowflake className="w-6 h-6 text-blue-500 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Snowy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Today&apos;s Forecast</p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Thermometer className="w-4 h-4" />
            <span className="text-sm">-2°C</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Wind className="w-4 h-4" />
            <span className="text-sm">10 km/h</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">5 cm</div>
        </div>

        {/* Animated Snowfall Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                left: `${i * 7}%`
              }}
              className="absolute w-3 h-3 text-blue-300 dark:text-blue-200/90 opacity-90"
              animate={{
                y: ["-10%", "110%"],
                x: [`${Math.sin(i) * 10}px`, `${Math.sin(i + 1) * -10}px`],
                rotate: [0, 180]
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.2,
                ease: "linear",
                rotate: {
                  duration: 3,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY
                }
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,0 L12,24 M6,6 L18,18 M18,6 L6,18 M0,12 L24,12" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </motion.div>
          ))}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`second-${i}`}
              style={{
                left: `${3.5 + (i * 7)}%`
              }}
              className="absolute w-3 h-3 text-blue-300 dark:text-blue-200/90 opacity-90"
              animate={{
                y: ["-10%", "110%"],
                x: [`${Math.sin(i) * 10}px`, `${Math.sin(i + 1) * -10}px`],
                rotate: [0, 180]
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                delay: 1.5 + (i * 0.2),
                ease: "linear",
                rotate: {
                  duration: 3,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY
                }
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,0 L12,24 M6,6 L18,18 M18,6 L6,18 M0,12 L24,12" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  )
}

