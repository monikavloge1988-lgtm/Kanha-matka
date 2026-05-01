import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { placeBet, deposit, withdraw, getGameState, getUserProfile, getGameHistory, getUserBets } from '../lib/api';
import { cn } from '../lib/utils';
import { LogOut, Coins, Clock, History, AlertCircle, Plus, Minus, X } from 'lucide-react';
import { logout, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function GameDashboard() {
  const [gameState, setGameState] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isBetting, setIsBetting] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const p = await getUserProfile();
      setUserProfile(p);
    } catch(e) {}
  };

  const fetchHistory = async () => {
    try {
      const h = await getGameHistory();
      setHistory(h);
    } catch (e) {}
  }

  // Poll Game State and Timer
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Initial fetches
    fetchProfile();
    fetchHistory();

    const interval = setInterval(async () => {
      try {
        const state = await getGameState();
        setGameState(state);
        
        if (state) {
          const remaining = Math.max(0, Math.floor((state.roundEndTime - Date.now()) / 1000));
          setTimeRemaining(remaining);
        }
      } catch (e) {
        console.error("Game state fetch error", e);
      }
    }, 1000); // 1 second poll

    return () => clearInterval(interval);
  }, []);

  // Fetch history and profile again when round changes or status changes
  useEffect(() => {
    if (gameState?.status === 'result') {
      fetchHistory();
      fetchProfile();
    }
  }, [gameState?.status, gameState?.roundId]);


  const handlePlaceBet = async () => {
    if (selectedNumber === null) {
      setErrorInfo("Select a number first!");
      return;
    }
    if (betAmount <= 0 || betAmount > (userProfile?.balance || 0)) {
      setErrorInfo("Invalid bet amount or insufficient balance.");
      return;
    }

    setIsBetting(true);
    setErrorInfo(null);
    try {
      await placeBet(betAmount, selectedNumber);
      await fetchProfile(); // Update balance
    } catch (e: any) {
      setErrorInfo(e.message || "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  const handleDeposit = async () => {
    if (walletAmount <= 0) return;
    setWalletLoading(true);
    setWalletError(null);
    try {
      await deposit(walletAmount);
      await fetchProfile();
      setIsDepositModalOpen(false);
      setWalletAmount(0);
    } catch (e: any) {
      setWalletError(e.message);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (walletAmount <= 0) return;
    setWalletLoading(true);
    setWalletError(null);
    try {
      await withdraw(walletAmount);
      await fetchProfile();
      setIsWithdrawModalOpen(false);
      setWalletAmount(0);
    } catch (e: any) {
      setWalletError(e.message);
    } finally {
      setWalletLoading(false);
    }
  };

  const currentResultNumber = gameState?.status === 'result' ? gameState.resultNumber : '?';

  // Calculate specific timer features based on 30s cycle (20s betting, 10s spinning)
  const timerMax = gameState?.status === 'betting' ? 20 : 10;
  const currentTimerDisplay = gameState?.status === 'betting' ? Math.max(timeRemaining - 10, 0) : timeRemaining;
  const timerPercentage = Math.max(0, Math.min(100, (currentTimerDisplay / timerMax) * 100));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center mb-8 pb-4 border-b border-zinc-800 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
          GoldSpinner
        </h1>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col text-right">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Wallet</span>
            <span className="text-xl md:text-2xl font-bold text-yellow-400 flex items-center justify-end gap-1 mb-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              {userProfile ? userProfile.balance.toLocaleString() : '---'}
            </span>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setIsDepositModalOpen(true)}
                className="text-xs flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded hover:bg-green-500/30 transition border border-green-500/30"
              >
                <Plus className="w-3 h-3" /> Deposit
              </button>
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="text-xs flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 transition border border-red-500/30"
              >
                <Minus className="w-3 h-3" /> Withdraw
              </button>
            </div>
          </div>
          <button onClick={logout} className="p-2 hover:bg-zinc-800 rounded-full transition-colors" title="Logout">
            <LogOut className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="grid lg:grid-cols-[1fr_350px] gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Col: Game Area */}
        <div className="flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center relative overflow-hidden shadow-2xl">
            {/* Status Overlays */}
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <span className={cn("w-3 h-3 rounded-full animate-pulse", gameState?.status === 'betting' ? "bg-green-500" : "bg-yellow-500")}></span>
              <span className="font-mono text-sm tracking-widest uppercase text-zinc-400">
                Round {gameState?.roundId || '---'}
              </span>
            </div>
            
            <div className="mt-8 mb-6 relative flex items-center justify-center">
              {/* Arrow */}
              <div className="absolute -top-4 md:-top-6 z-20 drop-shadow-[0_0_10px_rgba(239,68,68,1)]">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-red-500"></div>
              </div>

              {/* Timer SVG Ring */}
              <svg className="absolute w-56 h-56 md:w-72 md:h-72 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-zinc-800"
                />
                <circle
                  cx="50" cy="50" r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="301.59"
                  strokeDashoffset={301.59 - (301.59 * timerPercentage) / 100}
                  className={cn(
                    "transition-all duration-500 ease-linear",
                    gameState?.status === 'betting' ? "text-green-500" :
                    gameState?.status === 'spinning' ? "text-yellow-500" : "text-zinc-600"
                  )}
                />
              </svg>

              <div className={cn(
                "w-48 h-48 md:w-64 md:h-64 rounded-full border-4 flex items-center justify-center transition-all duration-1000 z-10 bg-zinc-950 overflow-hidden",
                gameState?.status === 'betting' ? "border-zinc-700" : 
                gameState?.status === 'spinning' ? "border-yellow-500 shadow-[0_0_50px_rgba(250,204,21,0.2)]" :
                "border-yellow-400 bg-zinc-900 ring-4 ring-yellow-400/50 shadow-[0_0_80px_rgba(250,204,21,0.4)]"
              )}>
                {/* The spinning ring with numbers */}
                <div 
                  className={cn(
                    "absolute w-full h-full rounded-full flex items-center justify-center",
                    gameState?.status === 'spinning' ? "animate-[spin_0.3s_linear_infinite]" : "transition-transform duration-1000 ease-out"
                  )}
                  style={{
                    transform: gameState?.status === 'result' ? `rotate(-${(gameState?.resultNumber || 0) * 36}deg)` : 'rotate(0deg)'
                  }}
                >
                  <div className="absolute inset-2 rounded-full border-[16px] md:border-[24px] border-zinc-900"></div>
                  {[0,1,2,3,4,5,6,7,8,9].map((n, i) => (
                    <div 
                      key={n} 
                      className="absolute w-full h-full flex justify-center pt-2 md:pt-3 text-lg md:text-2xl font-black text-yellow-500 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]"
                      style={{ transform: `rotate(${i * 36}deg)` }}
                    >
                      {n}
                    </div>
                  ))}
                  {/* Wheel lines */}
                  {[0,1,2,3,4,5,6,7,8,9].map((n, i) => (
                    <div 
                      key={`line-${n}`} 
                      className="absolute w-1 h-full bg-zinc-800/50"
                      style={{ transform: `rotate(${i * 36 + 18}deg)` }}
                    />
                  ))}
                </div>

                {/* Big center circle */}
                {gameState?.status !== 'spinning' && (
                  <div className="absolute z-20 flex items-center justify-center w-28 h-28 md:w-36 md:h-36 rounded-full bg-zinc-950 border-4 border-zinc-800 shadow-2xl">
                    <span className="text-6xl md:text-7xl font-black text-zinc-100 font-mono tracking-tighter">
                      {currentResultNumber}
                    </span>
                  </div>
                )}
                {gameState?.status === 'spinning' && (
                  <div className="absolute z-20 flex items-center justify-center w-28 h-28 md:w-36 md:h-36 rounded-full bg-zinc-950/80 border-4 border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-2 text-center">
              {gameState?.status === 'betting' && "Place your bets!"}
              {gameState?.status === 'spinning' && "PLEASE WAIT FOR RESULT"}
              {gameState?.status === 'result' && `Result is ${gameState?.resultNumber}!`}
            </h2>
            
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span>
                {gameState?.status === 'betting' ? `${Math.max(timeRemaining - 10, 0)}s left to bet` :
                 gameState?.status === 'spinning' ? `${timeRemaining}s spinning...` : `Next round soon...`}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-zinc-100">Select Number</h3>
            
            <div className="grid grid-cols-5 gap-3 sm:gap-4 mb-6">
              {[0,1,2,3,4,5,6,7,8,9].map(num => (
                <button
                  key={num}
                  disabled={gameState?.status !== 'betting'}
                  onClick={() => setSelectedNumber(num)}
                  className={cn(
                    "h-14 sm:h-16 rounded-xl font-bold text-xl sm:text-2xl transition-all font-mono flex items-center justify-center",
                    selectedNumber === num 
                      ? "bg-yellow-500 text-zinc-950 shadow-[0_0_20px_rgba(234,179,8,0.4)] scale-105" 
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                    gameState?.status !== 'betting' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex bg-zinc-800 rounded-xl overflow-hidden shadow-inner w-full sm:w-auto h-14">
                <button onClick={() => setBetAmount(a => Math.max(10, a - 50))} className="px-4 font-bold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition">-</button>
                <input 
                  type="number"
                  disabled={gameState?.status !== 'betting'}
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                  className="w-24 text-center bg-transparent border-none text-xl font-bold font-mono focus:outline-none"
                />
                <button onClick={() => setBetAmount(a => a + 50)} className="px-4 font-bold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition">+</button>
              </div>

              <div className="flex gap-2">
                {[100, 500, 1000].map(amt => (
                  <button 
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    disabled={gameState?.status !== 'betting'}
                    className="h-14 px-4 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 hidden sm:block font-bold transition">
                    +{amt}
                  </button>
                ))}
              </div>

              <button 
                onClick={handlePlaceBet}
                disabled={gameState?.status !== 'betting' || isBetting || selectedNumber === null}
                className={cn(
                  "flex-1 h-14 rounded-xl font-bold text-lg transition-all text-zinc-950 shadow-lg w-full",
                  gameState?.status === 'betting' && selectedNumber !== null
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:brightness-110 active:scale-[0.98]" 
                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed shadow-none"
                )}
              >
                {isBetting ? "Wait..." : "Place Bet"}
              </button>
            </div>
            
            {errorInfo && (
              <div className="mt-4 p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorInfo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: History */}
        <div className="flex flex-col gap-4 w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col h-[500px] lg:h-[800px]">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-yellow-500" />
              Recent Results
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <AnimatePresence>
                {[...history].reverse().map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    key={item.roundId} 
                    className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800"
                  >
                    <span className="text-zinc-500 font-mono text-sm uppercase">#{item.roundId}</span>
                    <span className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-lg",
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" : "bg-zinc-800 text-zinc-300"
                    )}>
                      {item.resultNumber}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {history.length === 0 && (
                <div className="text-center text-zinc-500 py-8">Waiting for history...</div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Deposit Modal */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl mx-auto"
            >
              <button onClick={() => setIsDepositModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus className="text-green-500" /> Deposit Funds</h3>
              
              <div className="mb-4">
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Amount</label>
                <input 
                  type="number"
                  value={walletAmount}
                  onChange={e => setWalletAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-green-500/50 text-xl font-mono text-zinc-100"
                  placeholder="0.00"
                />
              </div>

              {walletError && <div className="mb-4 text-red-500 text-sm bg-red-500/10 p-2 rounded">{walletError}</div>}

              <button 
                onClick={handleDeposit}
                disabled={walletLoading || walletAmount <= 0}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-xl transition"
              >
                {walletLoading ? "Processing..." : "Confirm Deposit"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl mx-auto"
            >
              <button onClick={() => setIsWithdrawModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Minus className="text-red-500" /> Withdraw Funds</h3>
              
              <div className="mb-4">
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Amount</label>
                <input 
                  type="number"
                  value={walletAmount}
                  onChange={e => setWalletAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-red-500/50 text-xl font-mono text-zinc-100"
                  placeholder="0.00"
                />
              </div>

              {walletError && <div className="mb-4 text-red-500 text-sm bg-red-500/10 p-2 rounded">{walletError}</div>}

              <button 
                onClick={handleWithdraw}
                disabled={walletLoading || walletAmount <= 0}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-xl transition"
              >
                {walletLoading ? "Processing..." : "Confirm Withdraw"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
