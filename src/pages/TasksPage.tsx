import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FaTwitter, FaDiscord, FaTelegram, FaCheck, FaArrowRight } from "react-icons/fa"
import { useWallet } from "@/components/WalletConnection"
import Header from '@/components/Header';
import Footer from "@/components/Footer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom";
import axios from 'axios'

const tasks = [
  {
    id: "follow-x",
    label: "Follow us on X (Twitter)",
    description: "Get updates and earn 100 points for following @xorionchain.",
    icon: FaTwitter,
    link: "https://x.com/xorionchain",
    points: 100,
    handleLabel: "Twitter Username",
    handlePlaceholder: "e.g., yourusername",
    handleNote: "Don't include the @ symbol"
  },
  {
    id: "follow-huostarter",
    label: "Follow Huostarter on (Twitter)",
    description: "Get updates and earn 100 points for following @huostarter.",
    icon: FaTwitter,
    link: "https://x.com/Huostarter",
    points: 100,
    handleLabel: "Twitter Username",
    handlePlaceholder: "e.g., yourusername",
    handleNote: "Don't include the @ symbol"
  },
  {
    id: "follow-discord",
    label: "Join our Discord Server",
    description: "Join our community and earn 100 points for joining our Discord server.",
    icon: FaDiscord,
    link: "https://discord.gg/UycWE8wN",
    points: 100,
    handleLabel: "Discord Username",
    handlePlaceholder: "e.g., username#1234",
    handleNote: "Include your full Discord username with discriminator"
  },
  {
    id: "join-telegram",
    label: "Join our Telegram Group",
    description: "Join our Telegram community and earn 100 points.",
    icon: FaTelegram,
    link: "https://t.me/xorion_chain",
    points: 100,
    handleLabel: "Telegram User ID",
    handlePlaceholder: "e.g., 6817379249",
    handleNote: "Enter your Telegram User ID (a numeric ID, not your username). Find it via @userinfobot"
  },
  {
    id: "join-telegram-channel",
    label: "Join our Telegram Channel",
    description: "Join our Telegram community and earn 100 points.",
    icon: FaTelegram,
    link: "https://t.me/XorionChainChannel",
    points: 100,
    handleLabel: "Telegram User ID",
    handlePlaceholder: "e.g., 6817379249",
    handleNote: "Enter your Telegram User ID (a numeric ID, not your username). Find it via @userinfobot"
  },
]

export default function TasksPage() {
  const [completed, setCompleted] = useState<string[]>([])
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTask, setCurrentTask] = useState<{ id: string, link: string, task: any } | null>(null)
  const [userHandle, setUserHandle] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const { selectedAccount } = useWallet()

  const { isLoading } = useQuery({
    queryKey: ['completedTasks', selectedAccount?.address],
    queryFn: async () => {
      if (!selectedAccount?.address) return { tasks: [] }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_TASK_API_BASE_URL}/api/tasks/`,
          {
            params: {
              walletAddress: selectedAccount.address
            }
          }
        )

        if (response.data.success) {
          setCompleted(response.data.tasks.map((task: any) => task.taskId))
          return response.data
        }
        return { tasks: [] }
      } catch (error) {
        console.error('Failed to fetch completed tasks:', error)
        throw new Error('Failed to fetch completed tasks')
      }
    },
    enabled: !!selectedAccount?.address,
    retry: 2,
  })

  const totalPoints = completed.reduce((sum, id) => sum + (tasks.find((t) => t.id === id)?.points || 0), 0)

  const initiateTask = (link: string) => {
    window.open(link, "_blank")
  }

  const initiateVerification = (taskId: string, link: string) => {
    if (!selectedAccount.address) {
      setError("Please connect your wallet first")
      return
    }
    const task = tasks.find(t => t.id === taskId)
    setCurrentTask({ id: taskId, link, task })
    setIsModalOpen(true)
    setError(null)
  }

  const handleComplete = async () => {
    if (!currentTask || !selectedAccount.address) return

    try {
      setIsVerifying(true)
      setError(null)
      setIsModalOpen(false)

      const response = await axios.post(
        `${import.meta.env.VITE_TASK_API_BASE_URL}/api/tasks/verify`,
        {
          walletAddress: selectedAccount.address,
          taskId: currentTask.id,
          userHandle: userHandle.trim()
        },
        {
          headers: {
            "Content-Type": "application/json",
          }
        }
      )

      if (response.data.success) {
        setCompleted((prev) => [...prev, currentTask.id])
      } else {
        throw new Error(response.data.error || response.data.message || "Task verification failed")
      }
    } catch (err) {
      console.error("Task verification error:", err)

      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED' || err.message === 'Network Error') {
          setError("Network error. Please check your connection and try again.")
        } else if (err.response) {
          // Server responded with error status
          const errorData = err.response.data
          setError(errorData.error || errorData.message || `Server error: ${err.response.status}`)
        } else {
          setError("Network error. Please check your connection and try again.")
        }
      } else {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      }
    } finally {
      setIsVerifying(false)
      setUserHandle("")
      setCurrentTask(null)
    }
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setIsModalOpen(false)
      setUserHandle("")
      setCurrentTask(null)
      setError(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f1419] to-[#1a0f2e]">
      <Header />
      <div className="max-w-md mx-auto py-6 px-4 sm:max-w-lg md:max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Earn Points by Completing Tasks
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">Complete tasks to earn points and unlock exclusive rewards</p>
          <Link to="/tasks/leaderboard">
            <Button className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-sm sm:text-base">
              View Leaderboard
            </Button>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-red-200 text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-4 p-3 sm:p-4 bg-blue-900/50 border border-blue-700/50 rounded-lg text-blue-200 text-sm sm:text-base">
            Loading completed tasks...
          </div>
        )}

        {/* Progress Card */}
        <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Progress Overview</h3>
                <p className="text-gray-400 text-sm sm:text-base">Track your completion status</p>
              </div>
              <div className="text-right mt-2 sm:mt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {totalPoints}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Total Points</div>
              </div>
            </div>
            <Progress value={(completed.length / tasks.length) * 100} className="h-2 sm:h-3 bg-slate-800" />
            <div className="flex justify-between text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">
              <span>{completed.length} of {tasks.length} completed</span>
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
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-3 sm:gap-4 w-full">
                      <div className={`p-2 sm:p-3 rounded-xl ${task.id === 'follow-discord'
                          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30'
                          : task.id === 'join-telegram'
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                            : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30'
                        }`}>
                        <task.icon className={`w-5 sm:w-6 h-5 sm:h-6 ${task.id === 'follow-discord' ? 'text-indigo-400' :
                            task.id === 'join-telegram' ? 'text-cyan-400' : 'text-blue-400'
                          }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-base sm:text-lg mb-1 group-hover:text-blue-300 transition-colors">
                          {task.label}
                        </h3>
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{task.description}</p>
                        <div className="flex items-center gap-2 mt-1 sm:mt-2">
                          <span className="text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/30">
                            +{task.points} points
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {isDone ? (
                        <Button
                          disabled
                          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-xl flex items-center gap-1 sm:gap-2 w-full sm:w-auto cursor-not-allowed opacity-75 text-sm sm:text-base"
                        >
                          <FaCheck className="w-3 sm:w-4 h-3 sm:h-4" />
                          Completed
                        </Button>
                      ) : (
                        <>
                          <Button
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl flex items-center gap-1 sm:gap-2 w-full sm:w-auto transition-all duration-300 shadow-lg hover:shadow-blue-500/25 text-sm sm:text-base"
                            onClick={() => initiateTask(task.link)}
                            disabled={isVerifying}
                          >
                            Do Task
                            <FaArrowRight className="w-3 sm:w-4 h-3 sm:h-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl flex items-center gap-1 sm:gap-2 w-full sm:w-auto transition-all duration-300 shadow-lg hover:shadow-purple-500/25 text-sm sm:text-base"
                            onClick={() => initiateVerification(task.id, task.link)}
                            disabled={isVerifying}
                          >
                            {isVerifying ? "Verifying..." : "Verify"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Stats Footer */}
        <div className="mt-6 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-400 mb-1">{completed.length}</div>
              <div className="text-xs sm:text-sm text-gray-400">Tasks Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-400 mb-1">{totalPoints}</div>
              <div className="text-xs sm:text-sm text-gray-400">Points Earned</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-pink-400 mb-1">{tasks.length - completed.length}</div>
              <div className="text-xs sm:text-sm text-gray-400">Tasks Remaining</div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />

      {/* Task Verification Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg sm:text-xl">
              Verify {currentTask?.task?.label || "Task"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm sm:text-base">
              {currentTask?.task?.id === 'follow-discord'
                ? "Please enter your Discord username to verify you've joined our server."
                : currentTask?.task?.id === 'join-telegram' || currentTask?.task?.id === 'join-telegram-channel'
                  ? "Please enter your Telegram User ID (not username) to verify you've joined our group. You can find your User ID using @userinfobot on Telegram."
                  : "Please enter your Twitter (X) username to verify you've followed us."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-handle" className="text-slate-300 text-sm sm:text-base">
                {currentTask?.task?.handleLabel || "Username"}
              </Label>
              <Input
                id="user-handle"
                placeholder={currentTask?.task?.handlePlaceholder || "e.g., username"}
                value={userHandle}
                onChange={(e) => setUserHandle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-sm sm:text-base"
              />
              <p className="text-xs sm:text-sm text-slate-500">
                {currentTask?.task?.handleNote || "Enter your username"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleModalClose(false)}
                className="border-slate-700 text-white hover:bg-slate-800 w-full sm:w-auto text-sm sm:text-base py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!userHandle.trim() || isVerifying}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 w-full sm:w-auto text-sm sm:text-base py-2"
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}