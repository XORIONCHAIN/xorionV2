"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FaTwitter, FaCheck, FaArrowRight } from "react-icons/fa"
import Header from '@/components/Header';
import Footer from "@/components/Footer"

const tasks = [
  {
    id: "follow-x",
    label: "Follow us on X (Twitter)",
    description: "Get updates and earn 10 points for following @xorionchain.",
    icon: FaTwitter,
    link: "https://x.com/xorionchain?s=21",
    points: 10,
  },
]

export default function TasksPage() {
  const [completed, setCompleted] = useState<string[]>([])

  const totalPoints = completed.reduce((sum, id) => sum + (tasks.find((t) => t.id === id)?.points || 0), 0)

  const handleComplete = (taskId: string, link: string) => {
    window.open(link, "_blank")
    setCompleted((prev) => [...prev, taskId])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f1419] to-[#1a0f2e]">
      <Header />
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Earn Points by Completing Tasks
          </h1>
          <p className="text-gray-400 text-lg">Complete tasks to earn points and unlock exclusive rewards</p>
        </div>

        {/* Progress Card */}
        <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">Progress Overview</h3>
                <p className="text-gray-400">Track your completion status</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {totalPoints}
                </div>
                <div className="text-sm text-gray-400">Total Points</div>
              </div>
            </div>
            <Progress value={(completed.length / tasks.length) * 100} className="h-3 bg-slate-800" />
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>
                {completed.length} of {tasks.length} completed
              </span>
              <span>{Math.round((completed.length / tasks.length) * 100)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Grid */}
        <div className="space-y-4">
          {tasks.map((task) => {
            const isDone = completed.includes(task.id)
            return (
              <Card
                key={task.id}
                className="bg-gradient-to-r from-slate-900/60 to-slate-800/60 border border-slate-700/50 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300 group"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                        <task.icon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-blue-300 transition-colors">
                          {task.label}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/30">
                            +{task.points} points
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isDone ? (
                        <Button
                          disabled
                          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 cursor-not-allowed opacity-75"
                        >
                          <FaCheck className="w-4 h-4" />
                          Completed
                        </Button>
                      ) : (
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
                          onClick={() => handleComplete(task.id, task.link)}
                        >
                          Complete
                          <FaArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Stats Footer */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{completed.length}</div>
              <div className="text-sm text-gray-400">Tasks Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">{totalPoints}</div>
              <div className="text-sm text-gray-400">Points Earned</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-pink-400 mb-1">{tasks.length - completed.length}</div>
              <div className="text-sm text-gray-400">Tasks Remaining</div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
