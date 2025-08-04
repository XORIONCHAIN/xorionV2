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

const tasks = [
  {
    id: "follow-x",
    label: "Follow us on X (Twitter)",
    description: "Get updates and earn 10 points for following @xorionchain.",
    icon: FaTwitter,
    link: "https://x.com/xorionchain",
    points: 10,
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
]

export default function TasksPage() {
  const [completed, setCompleted] = useState<string[]>([])
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTask, setCurrentTask] = useState<{id: string, link: string, task: any} | null>(null)
  const [userHandle, setUserHandle] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const {selectedAccount} = useWallet()

  // Fetch completed tasks using TanStack Query
  const { isLoading } = useQuery({
    queryKey: ['completedTasks', selectedAccount?.address],
    queryFn: async () => {
      if (!selectedAccount?.address) return { tasks: [] }
      
      const response = await fetch(
        `${import.meta.env.VITE_TASK_API_BASE_URL}/api/tasks/?walletAddress=${selectedAccount.address}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch completed tasks')
      }
      
      const data = await response.json()
      if (data.success) {
        setCompleted(data.tasks.map((task: any) => task.taskId))
        return data
      }
      return { tasks: [] }
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
      
      // Verify task completion with backend
      const response = await fetch(`${import.meta.env.VITE_TASK_API_BASE_URL}/api/tasks/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: selectedAccount.address,
          taskId: currentTask.id,
          userHandle: userHandle.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`)
      }

      const result = await response.json()
      
      // Only mark as completed if verification was successful
      if (result.success) {
        setCompleted((prev) => [...prev, currentTask.id])
      } else {
        throw new Error(result.error || result.message || "Task verification failed")
      }
    } catch (err) {
      console.error("Task verification error:", err)
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("Network error. Please check your connection and try again.")
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
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Earn Points by Completing Tasks
          </h1>
          <p className="text-gray-400 text-lg">Complete tasks to earn points and unlock exclusive rewards</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-6 p-4 bg-blue-900/50 border border-blue-700/50 rounded-lg text-blue-200">
            Loading completed tasks...
          </div>
        )}

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
                      <div className={`p-3 rounded-xl ${
                        task.id === 'follow-discord' 
                          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30' 
                          : task.id === 'join-telegram'
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                          : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30'
                      }`}>
                        <task.icon className={`w-6 h-6 ${
                          task.id === 'follow-discord' ? 'text-indigo-400' : 
                          task.id === 'join-telegram' ? 'text-cyan-400' : 'text-blue-400'
                        }`} />
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

                    <div className="flex-shrink-0 flex gap-2">
                      {isDone ? (
                        <Button
                          disabled
                          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 cursor-not-allowed opacity-75"
                        >
                          <FaCheck className="w-4 h-4" />
                          Completed
                        </Button>
                      ) : (
                        <>
                          <Button
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
                            onClick={() => initiateTask(task.link)}
                            disabled={isVerifying}
                          >
                            Do Task
                            <FaArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
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

      {/* Task Verification Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {currentTask?.task?.id === 'follow-discord' ? 'Verify Discord Join' : 
               currentTask?.task?.id === 'join-telegram' ? 'Verify Telegram Join' : 
               'Verify Twitter Follow'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {currentTask?.task?.id === 'follow-discord' 
                ? "Please enter your Discord username to verify you've joined our server."
                : currentTask?.task?.id === 'join-telegram'
                ? "Please enter your Telegram User ID (not username) to verify you've joined our group. You can find your User ID using @userinfobot on Telegram."
                : "Please enter your Twitter (X) username to verify you've followed us."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-handle" className="text-slate-300">
                {currentTask?.task?.handleLabel || "Username"}
              </Label>
              <Input
                id="user-handle"
                placeholder={currentTask?.task?.handlePlaceholder || "e.g., username"}
                value={userHandle}
                onChange={(e) => setUserHandle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-sm text-slate-500">
                {currentTask?.task?.handleNote || "Enter your username"}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleModalClose(false)}
                className="border-slate-700 text-white hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!userHandle.trim() || isVerifying}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
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