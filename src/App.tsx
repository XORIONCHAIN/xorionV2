import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ThemeProvider } from "next-themes";
import { WalletProvider } from "./components/WalletConnection";
import BackToTop from "./components/BackToTop";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./components/BridgeLockForm";

const queryClient = new QueryClient();
import CustomLoader from "./components/ui/CustomLoader";

// LAZY LOADED COMPONENTS
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExplorerPage = lazy(() => import("./pages/ExplorerPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const LeaderboardPage = lazy(() => import("./pages/TasksLeaderboardPage"));

const Load = () => {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <CustomLoader></CustomLoader>
    </div>
  );
};

const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <WalletProvider>
            <BrowserRouter>
              <Suspense fallback={<Load />}>
                <div className="text-white">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/explorer" element={<Index />} />
{/*
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route
                    path="/tasks/leaderboard"
                    element={<LeaderboardPage />}
                    />
*/}
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                    <BackToTop />
                    </div>
                    </Suspense>
                    </BrowserRouter>
                    </WalletProvider>
                    </TooltipProvider>
                    </ThemeProvider>
                    </QueryClientProvider>
                    </WagmiProvider>
);

export default App;
