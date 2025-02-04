"use client"

import { Cloud, Droplets, Wind } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function Cloudy() {
  return (
    <Card className="relative overflow-hidden group w-72 h-40 cursor-pointer transition-all hover:shadow-lg">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900/40 dark:via-gray-800/30 dark:to-gray-700/20 opacity-50" />

      {/* Content Container */}
      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Top Section */}
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-gray-200 dark:bg-gray-800/60 rounded-full group-hover:bg-gray-300 dark:group-hover:bg-gray-700/80 transition-colors">
            <Cloud className="w-6 h-6 text-gray-600 dark:text-gray-200" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Cloudy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Today&apos;s Forecast</p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Droplets className="w-4 h-4" />
            <span className="text-sm">60%</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Wind className="w-4 h-4" />
            <span className="text-sm">15 km/h</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">22°C</div>
        </div>
      </div>
    </Card>
  )
}

