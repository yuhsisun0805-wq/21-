import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CardDisplay } from './components/CardDisplay';
import { SidePanel } from './components/SidePanel';
import { Card, GamePhase, CountingSystem, AIRule, CountingStrategy, RunResult } from './types';
import { createDecks, calculateHandValue, getSimpleCountDelta, getComplexCountDelta, determineAIBet, getBasicStrategyMove } from './utils';
import { RefreshCw, DollarSign, Shield, Hand as HandIcon, PlayCircle } from 'lucide-react';

const MIN_BET = 1000;
const MAX_BET = 1000000;
const NUM_DECKS = 2; // 2 Decks

const App: React.FC = () => {
  // State
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [wallet, setWallet] = useState<number>(0); 
  const [currentBet, setCurrentBet] = useState<number>(MIN_BET);
  const [counts, setCounts] = useState<CountingSystem>({ simple: 0, complex: 0 });
  const [message, setMessage] = useState<string>("Place your bet!");
  
  // Run / Shoe State
  const [shoeStartBalance, setShoeStartBalance] = useState<number>(0);
  const [runHistory, setRunHistory] = useState<RunResult[]>([]);
  const [targetRuns, setTargetRuns] = useState<number>(1);
  const [exitThreshold, setExitThreshold] = useState<number>(-100); // Default low to disable

  // AI State
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [activeStrategy, setActiveStrategy] = useState<CountingStrategy>('simple');
  const [aiRules, setAiRules] = useState<AIRule[]>([
    { id: '1', operator: '>=', threshold: 10, betAmount: 25000 },
    { id: '2', operator: '>=', threshold: 5, betAmount: 10000 },
    { id: '3', operator: '>=', threshold: 2, betAmount: 5000 },
    { id: '4', operator: '<', threshold: 2, betAmount: 1000 },
  ]);

  // Refs for AI loop to access latest state
  const stateRef = useRef({ 
    phase, playerHand, dealerHand, counts, aiRules, currentBet, wallet, activeStrategy, 
    deck, runHistory, targetRuns, shoeStartBalance, exitThreshold 
  });
  
  useEffect(() => {
    stateRef.current = { 
        phase, playerHand, dealerHand, counts, aiRules, currentBet, wallet, activeStrategy, 
        deck, runHistory, targetRuns, shoeStartBalance, exitThreshold 
    };
  }, [phase, playerHand, dealerHand, counts, aiRules, currentBet, wallet, activeStrategy, deck, runHistory, targetRuns, shoeStartBalance, exitThreshold]);

  // --- Initialization ---
  const hardResetGame = useCallback(() => {
    const newDeck = createDecks(NUM_DECKS);
    setDeck(newDeck);
    setCounts({ simple: 0, complex: 0 });
    setPlayerHand([]);
    setDealerHand([]);
    setPhase('betting');
    setMessage("Place your bet to start.");
    setWallet(0); 
    setShoeStartBalance(0);
    setRunHistory([]); // Clear history on hard reset
    setCurrentBet(1000);
  }, []);

  useEffect(() => {
    hardResetGame();
  }, [hardResetGame]);

  const startNewShoe = () => {
      const newDeck = createDecks(NUM_DECKS);
      setDeck(newDeck);
      setCounts({ simple: 0, complex: 0 });
      setPlayerHand([]);
      setDealerHand([]);
      setPhase('betting');
      setMessage(`Shoe #${runHistory.length + 1} Started`);
      setShoeStartBalance(wallet); // Snapshot wallet for new run
  };

  const finishShoe = (reason: string = "Shoe Completed") => {
    const profit = wallet - shoeStartBalance;
    const newRun: RunResult = {
        id: runHistory.length + 1,
        profit: profit,
        timestamp: new Date().toLocaleTimeString(),
        reason: reason
    };
    setRunHistory(prev => [...prev, newRun]);
    setPhase('shoeEnded');
    setMessage(reason || `Shoe Ended. Run Profit: ${profit > 0 ? '+' : ''}${profit}`);
  };

  // --- Counting Helpers ---
  const updateCounts = (cards: Card[]) => {
    setCounts(prev => {
      let newSimple = prev.simple;
      let newComplex = prev.complex;
      cards.forEach(c => {
        newSimple += getSimpleCountDelta(c);
        newComplex += getComplexCountDelta(c);
      });
      return { simple: newSimple, complex: newComplex };
    });
  };

  // --- Actions ---

  const dealGame = () => {
    // Check deck size - End shoe if low (approx 15 cards left for 2 decks)
    if (deck.length < 15) {
        finishShoe("Deck Depleted");
        return;
    }

    let currentDeck = [...deck];
    const pCard1 = currentDeck.pop()!;
    const dCard1 = currentDeck.pop()!;
    const pCard2 = currentDeck.pop()!;
    const dCard2 = currentDeck.pop()!; // Hidden

    setDeck(currentDeck);
    setPlayerHand([pCard1, pCard2]);
    setDealerHand([dCard1, dCard2]);
    setWallet(prev => prev - currentBet);
    setPhase('playing');
    setMessage("Player's Turn");

    // Update count ONLY for visible cards
    updateCounts([pCard1, pCard2, dCard1]);
    
    // Check Blackjack immediately
    const pVal = calculateHandValue([pCard1, pCard2]);
    const dVal = calculateHandValue([dCard1, dCard2]);

    if (pVal === 21) {
      if (dVal === 21) {
        handleBlackjackInstant(currentDeck, [dCard1, dCard2], [pCard1, pCard2], currentBet);
      } else {
         handleBlackjackInstant(currentDeck, [dCard1, dCard2], [pCard1, pCard2], currentBet);
      }
    }
  };

  const handleBlackjackInstant = (currentDeck: Card[], dHand: Card[], pHand: Card[], bet: number) => {
    updateCounts([dHand[1]]); 
    const pVal = calculateHandValue(pHand);
    const dVal = calculateHandValue(dHand);
    
    setPhase('gameOver');
    if (pVal === 21 && dVal === 21) {
        // Player wins on 21 tie
        setWallet(w => w + bet + (bet * 1.5)); 
        setMessage("Blackjack! You win (Tie 21)!");
    } else if (pVal === 21) {
        setWallet(w => w + bet + (bet * 1.5));
        setMessage("Blackjack! You win!");
    } else {
        setMessage("Dealer has Blackjack. You lose.");
    }
  }

  const hit = () => {
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    updateCounts([card]);

    if (calculateHandValue(newHand) > 21) {
      setPhase('gameOver');
      setMessage("Bust! You lose.");
      updateCounts([dealerHand[1]]); 
    }
  };

  const stand = () => {
    setPhase('dealerTurn');
    updateCounts([dealerHand[1]]); 
  };

  const doubleDown = () => {
    setWallet(prev => prev - currentBet);
    setCurrentBet(prev => prev * 2);

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    updateCounts([card]);

    const val = calculateHandValue(newHand);
    if (val > 21) {
        setPhase('gameOver');
        setMessage("Bust! You lose.");
        updateCounts([dealerHand[1]]); 
    } else {
        setPhase('dealerTurn');
        updateCounts([dealerHand[1]]); 
    }
  };

  // --- Dealer Logic ---
  useEffect(() => {
    if (phase === 'dealerTurn') {
      let currentDHand = [...dealerHand];
      let currentDeck = [...deck];
      let dVal = calculateHandValue(currentDHand);

      const playDealer = async () => {
        await new Promise(r => setTimeout(r, 400)); // Faster speed

        if (dVal < 17) {
          const newCard = currentDeck.pop()!;
          currentDHand = [...currentDHand, newCard];
          updateCounts([newCard]);
          setDealerHand(currentDHand);
          setDeck(currentDeck);
        } else {
          resolveGame(playerHand, currentDHand, currentBet);
        }
      };
      playDealer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dealerHand]); 

  const resolveGame = (pHand: Card[], dHand: Card[], bet: number) => {
    const pVal = calculateHandValue(pHand);
    const dVal = calculateHandValue(dHand);
    let winMsg = "";
    
    if (dVal > 21) {
        setWallet(w => w + (bet * 2));
        winMsg = "Dealer Busts! You Win!";
    } else if (pVal > dVal) {
        setWallet(w => w + (bet * 2));
        winMsg = `You Win! (${pVal} vs ${dVal})`;
    } else if (pVal === dVal) {
        // Tie logic: 21 wins, others PUSH (Money Back)
        if (pVal === 21) {
            setWallet(w => w + (bet * 2));
            winMsg = "You Win! (Tie at 21)";
        } else {
            setWallet(w => w + bet); // PUSH: Return original bet
            winMsg = `Push. (${dVal} vs ${pVal})`;
        }
    } else {
        winMsg = `Dealer Wins. (${dVal} vs ${pVal})`;
    }

    setPhase('gameOver');
    setMessage(winMsg);
  };

  // --- AI Loop ---
  // Using a separate effect for 'betting' phase to allow for the "Stop and Check" visualization
  useEffect(() => {
    if (!isAutoPlaying) return;

    let timer: any;

    const runAILogic = () => {
        const { phase, playerHand, dealerHand, counts, aiRules, currentBet, wallet, activeStrategy, runHistory, targetRuns, deck, exitThreshold } = stateRef.current;

        if (phase === 'shoeEnded') {
            if (runHistory.length < targetRuns) {
                timer = setTimeout(() => startNewShoe(), 500); 
            } else {
                setIsAutoPlaying(false);
                setMessage("AI Finished all requested runs.");
            }
        } 
        else if (phase === 'betting') {
            // SILENT WONGING CHECK WITH DELAY
            timer = setTimeout(() => {
                const { exitThreshold: latestThreshold } = stateRef.current;
                const decksRemaining = Math.max(0.5, deck.length / 52);
                const metric = counts[activeStrategy];
                const trueCount = metric / decksRemaining;

                if (trueCount < latestThreshold) {
                    setMessage(`Wonging Out...`);
                    timer = setTimeout(() => {
                        finishShoe(`Wong Out (TC: ${trueCount.toFixed(1)})`);
                    }, 800);
                } else {
                    // Update: Pass decksRemaining to use True Count for betting
                    const bet = determineAIBet(counts, decksRemaining, aiRules, activeStrategy);
                    const finalBet = Math.min(Math.max(bet, MIN_BET), MAX_BET);
                    setCurrentBet(finalBet);
                    dealGame();
                }
            }, 1000); // 1.0s delay for "checking"
        } 
        else if (phase === 'playing') {
             timer = setTimeout(() => {
                // Calculate True Count for Deviations
                const decksRemaining = Math.max(0.5, deck.length / 52);
                const trueCount = counts.simple / decksRemaining; 

                const move = getBasicStrategyMove(playerHand, dealerHand[0], trueCount);
                if (move === 'hit') hit();
                else if (move === 'stand') stand();
                else if (move === 'double') doubleDown();
             }, 400);
        } 
        else if (phase === 'gameOver') {
            timer = setTimeout(() => {
                setPhase('betting');
                setMessage("Next round...");
            }, 1000);
        }
    };

    // Trigger the logic
    runAILogic();

    return () => clearTimeout(timer);
  }, [isAutoPlaying, phase, playerHand.length, dealerHand.length, runHistory.length]);


  // --- Helper to change bet safely ---
  const handleBetChange = (amount: number) => {
    // Just clamp, do not force steps
    const newBet = Math.max(0, amount);
    setCurrentBet(newBet);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500">
      <div className="max-w-7xl mx-auto h-screen p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT: Game Area */}
        <div className="lg:col-span-8 flex flex-col bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden relative">
            
            {/* Header */}
            <div className="bg-gray-900/50 p-4 flex justify-between items-center backdrop-blur-sm border-b border-gray-700 h-20">
                <div className="flex items-center gap-6">
                    <div className="bg-gray-700 px-6 py-3 rounded-lg flex items-center gap-3 border border-gray-600">
                        <DollarSign className="text-yellow-400" size={24} />
                        <span className={`text-2xl font-bold font-mono ${wallet < 0 ? 'text-red-400' : 'text-yellow-50'}`}>
                            {wallet.toLocaleString()}
                        </span>
                    </div>
                    <div className="text-gray-400 text-lg hidden sm:block">
                        Bet: <span className="text-white font-bold">${currentBet}</span>
                    </div>
                </div>
                <button onClick={hardResetGame} className="p-3 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white" title="Hard Reset Game">
                    <RefreshCw size={24} />
                </button>
            </div>

            {/* Table Area */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 to-gray-900">
                {/* Dealer Hand */}
                <div className="mb-16 flex flex-col items-center">
                    <div className="text-gray-400 text-base mb-3 tracking-widest uppercase font-semibold">Dealer</div>
                    <div className="flex gap-[-4rem] justify-center" style={{ marginLeft: dealerHand.length * 20 }}>
                        {dealerHand.map((card, i) => (
                           <div key={card.id} className="transform transition-all duration-500" style={{ marginLeft: i > 0 ? '-3rem' : '0' }}>
                               <CardDisplay card={card} hidden={phase === 'playing' && i === 1} />
                           </div>
                        ))}
                        {dealerHand.length === 0 && <div className="h-28 w-20 border-2 border-dashed border-gray-600 rounded-lg"></div>}
                    </div>
                    {phase !== 'playing' && phase !== 'betting' && phase !== 'shoeEnded' && dealerHand.length > 0 && (
                        <div className="mt-3 text-2xl font-bold">{calculateHandValue(dealerHand)}</div>
                    )}
                </div>

                {/* Message Overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-full">
                    <div className={`text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-center transition-opacity duration-300 ${phase === 'playing' ? 'opacity-30' : 'opacity-100'} whitespace-nowrap`}>
                        {message}
                    </div>
                </div>

                {/* Player Hand */}
                <div className="mt-8 flex flex-col items-center">
                    <div className="text-gray-400 text-base mb-3 tracking-widest uppercase font-semibold">Player</div>
                     <div className="flex justify-center" style={{ marginLeft: playerHand.length * 20 }}>
                        {playerHand.map((card, i) => (
                           <div key={card.id} className="transform transition-all duration-500 hover:-translate-y-4" style={{ marginLeft: i > 0 ? '-3rem' : '0' }}>
                               <CardDisplay card={card} />
                           </div>
                        ))}
                        {playerHand.length === 0 && <div className="h-28 w-20 border-2 border-dashed border-gray-600 rounded-lg"></div>}
                    </div>
                    {playerHand.length > 0 && (
                        <div className="mt-3 text-2xl font-bold text-blue-300">{calculateHandValue(playerHand)}</div>
                    )}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-gray-900 p-6 border-t border-gray-700 h-28 flex items-center justify-center">
                {phase === 'betting' ? (
                    <div className="flex flex-col md:flex-row gap-6 justify-center items-center w-full">
                        <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-600">
                            {/* Improved Input without buttons */}
                            <input 
                                type="number" 
                                value={currentBet} 
                                onWheel={(e) => e.currentTarget.blur()} // Disable scroll wheel
                                onChange={(e) => handleBetChange(parseInt(e.target.value) || 0)}
                                className="w-40 bg-transparent text-center font-bold text-3xl outline-none placeholder-gray-600"
                                placeholder="Bet"
                            />
                        </div>
                        <button 
                            onClick={dealGame}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-10 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[4px] transition-all uppercase tracking-wider text-xl w-full md:w-auto"
                        >
                            Deal
                        </button>
                    </div>
                ) : phase === 'playing' ? (
                    <div className="flex gap-6 justify-center w-full">
                        <button onClick={hit} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl shadow-[0_4px_0_rgb(29,78,216)] active:shadow-none active:translate-y-[4px] transition-all flex items-center gap-3 text-xl">
                            <HandIcon size={24} /> HIT
                        </button>
                        <button onClick={stand} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-10 rounded-xl shadow-[0_4px_0_rgb(185,28,28)] active:shadow-none active:translate-y-[4px] transition-all flex items-center gap-3 text-xl">
                             <Shield size={24} /> STAND
                        </button>
                        {phase === 'playing' && playerHand.length === 2 && (
                             <button onClick={doubleDown} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 px-10 rounded-xl shadow-[0_4px_0_rgb(161,98,7)] active:shadow-none active:translate-y-[4px] transition-all text-xl">
                                DOUBLE
                            </button>
                        )}
                    </div>
                ) : phase === 'shoeEnded' ? (
                    <div className="flex justify-center w-full">
                        <button onClick={startNewShoe} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-16 rounded-xl transition-all animate-pulse flex items-center gap-3 text-xl">
                           <PlayCircle size={28}/> START NEW SHOE
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center w-full">
                        <button onClick={() => { setPhase('betting'); setMessage("Place your bet!"); }} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-16 rounded-xl transition-all animate-pulse text-xl">
                            Continue
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT: Stats & Config */}
        <div className="lg:col-span-4 h-full overflow-hidden">
            <SidePanel 
                counts={counts} 
                aiRules={aiRules} 
                setAiRules={setAiRules} 
                isAutoPlaying={isAutoPlaying} 
                setIsAutoPlaying={setIsAutoPlaying}
                cardsRemaining={deck.length}
                activeStrategy={activeStrategy}
                setActiveStrategy={setActiveStrategy}
                runHistory={runHistory}
                targetRuns={targetRuns}
                setTargetRuns={setTargetRuns}
                exitThreshold={exitThreshold}
                setExitThreshold={setExitThreshold}
            />
        </div>

      </div>
    </div>
  );
};

export default App;