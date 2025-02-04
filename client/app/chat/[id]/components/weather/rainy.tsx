"use client"

import { Cloud, Droplets, Wind } from "lucide-react"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

export default function Rainy() {
  return (
    <Card className="relative overflow-hidden group w-72 h-40 cursor-pointer transition-all hover:shadow-lg">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-blue-950/40 dark:via-blue-900/30 dark:to-blue-800/20 opacity-50" />

      {/* Content Container */}
      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Top Section */}
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
            <Cloud className="w-6 h-6 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Rainy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Today&apos;s Forecast</p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Droplets className="w-4 h-4" />
            <span className="text-sm">75%</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Wind className="w-4 h-4" />
            <span className="text-sm">12 km/h</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">18°C</div>
        </div>

        {/* Animated Rain Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                left: `${i * 10}%`
              }}
              className="absolute w-[2px] h-[10px] bg-blue-400/50 dark:bg-blue-200/60 rounded-full"
              animate={{
                y: ["-10%", "110%"],
              }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.1,
                ease: "linear",
              }}
            />
          ))}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={`second-${i}`}
              style={{
                left: `${5 + (i * 10)}%`
              }}
              className="absolute w-[2px] h-[10px] bg-blue-400/50 dark:bg-blue-200/60 rounded-full"
              animate={{
                y: ["-10%", "110%"],
              }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                delay: 0.5 + (i * 0.1),
                ease: "linear",
              }}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

