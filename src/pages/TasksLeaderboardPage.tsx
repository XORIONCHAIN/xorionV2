import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FaCopy } from "react-icons/fa"
import Header from '@/components/Header'
import Footer from "@/components/Footer"

interface LeaderboardUser {
  _id: string
  walletAddress: string
  points: number
}

export default function LeaderboardPage() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  // Fetch leaderboard data using TanStack Query
  const { data, isLoading, error } = useQuery<{
    success: boolean
    topUsers: LeaderboardUser[]
  }>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_TASK_API_BASE_URL}/api/tasks/leaderboard`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      return response.json()
    },
    retry: 2,
  })

  // Function to shorten wallet address for display
  const shortenAddress = (address: string) => {
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Function to copy wallet address to clipboard
  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000) // Reset after 2 seconds
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f1419] to-[#1a0f2e]">
      <Header />
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Tasks Leaderboard
          </h1>
          <p className="text-gray-400 text-lg">See who’s leading the way in earning points!</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg text-red-200">
            {error instanceof Error ? error.message : "An error occurred while fetching the leaderboard"}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-6 p-4 bg-blue-900/50 border border-blue-700/50 rounded-lg text-blue-200">
            Loading leaderboard...
          </div>
        )}

        {/* Leaderboard List */}
        {!isLoading && data?.success && (
          <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                {data.topUsers.map((user, index) => (
                  <div
                    key={user._id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
                      selectedAccount?.address?.toLowerCase() === user.walletAddress.toLowerCase()
                        ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-blue-500/50'
                        : 'bg-gradient-to-r from-slate-900/60 to-slate-800/60 border-slate-700/50 hover:border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <span className={`text-lg font-bold ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-gray-300' :
                          index === 2 ? 'text-amber-600' :
                          'text-gray-400'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-lg">
                          {shortenAddress(user.walletAddress)}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-blue-400 p-1"
                          onClick={() => copyToClipboard(user.walletAddress)}
                          title="Copy wallet address"
                        >
                          <FaCopy className="w-4 h-4" />
                        </Button>
                        {copiedAddress === user.walletAddress && (
                          <span className="text-xs text-green-400">Copied!</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/30">
                        {user.points} points
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  )
}