import React from 'react';
import { AIRule, CountingSystem, CountingStrategy, RunResult } from '../types';
import { Trash2, Plus, Play, Pause, History, Hash, LogOut } from 'lucide-react';

interface SidePanelProps {
  counts: CountingSystem;
  aiRules: AIRule[];
  setAiRules: (rules: AIRule[]) => void;
  isAutoPlaying: boolean;
  setIsAutoPlaying: (v: boolean) => void;
  cardsRemaining: number;
  activeStrategy: CountingStrategy;
  setActiveStrategy: (s: CountingStrategy) => void;
  runHistory: RunResult[];
  targetRuns: number;
  setTargetRuns: (n: number) => void;
  exitThreshold: number;
  setExitThreshold: (n: number) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  counts,
  aiRules,
  setAiRules,
  isAutoPlaying,
  setIsAutoPlaying,
  cardsRemaining,
  activeStrategy,
  setActiveStrategy,
  runHistory,
  targetRuns,
  setTargetRuns,
  exitThreshold,
  setExitThreshold
}) => {

  const addRule = () => {
    const newRule: AIRule = {
      id: Math.random().toString(),
      threshold: 0,
      operator: '>=',
      betAmount: 1000,
    };
    setAiRules([...aiRules, newRule]);
  };

  const removeRule = (id: string) => {
    setAiRules(aiRules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, field: keyof AIRule, value: any) => {
    setAiRules(aiRules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalProfit = runHistory.reduce((acc, curr) => acc + curr.profit, 0);
  
  // Calculate True Counts for display
  const decksRemaining = Math.max(0.5, cardsRemaining / 52);
  const tcSimple = counts.simple / decksRemaining;
  const tcComplex = counts.complex / decksRemaining;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top: Counting Stats */}
      <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 flex-none flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-yellow-400">Card Counting</h2>
            <div className="text-sm font-bold text-gray-400 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                {cardsRemaining} cards left
            </div>
        </div>
        
        {/* Active Strategy Selector */}
        <div className="bg-gray-900 p-3 rounded-lg flex justify-between items-center">
            <span className="text-base text-gray-300 font-medium">Strategy:</span>
            <div className="flex gap-2">
                <button 
                    onClick={() => setActiveStrategy('simple')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeStrategy === 'simple' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                    Simple
                </button>
                <button 
                    onClick={() => setActiveStrategy('complex')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeStrategy === 'complex' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                    Complex
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg text-center border-2 transition-all flex flex-col items-center justify-center ${activeStrategy === 'simple' ? 'bg-gray-700 border-blue-500' : 'bg-gray-700/50 border-transparent'}`}>
            <div className="text-gray-400 text-xs mb-1 font-medium tracking-wider uppercase">True Count</div>
            <div className={`text-4xl font-black mb-1 ${tcSimple > 0 ? 'text-green-400' : tcSimple < 0 ? 'text-red-400' : 'text-white'}`}>
              {tcSimple > 0 ? '+' : ''}{tcSimple.toFixed(1)}
            </div>
            <div className="text-xs font-mono text-gray-400 bg-gray-900/50 px-2 py-0.5 rounded">
                RC: {counts.simple > 0 ? '+' : ''}{counts.simple}
            </div>
          </div>
          <div className={`p-4 rounded-lg text-center border-2 transition-all flex flex-col items-center justify-center ${activeStrategy === 'complex' ? 'bg-gray-700 border-purple-500' : 'bg-gray-700/50 border-transparent'}`}>
            <div className="text-gray-400 text-xs mb-1 font-medium tracking-wider uppercase">True Count</div>
            <div className={`text-4xl font-black mb-1 ${tcComplex > 0 ? 'text-green-400' : tcComplex < 0 ? 'text-red-400' : 'text-white'}`}>
              {tcComplex > 0 ? '+' : ''}{tcComplex.toFixed(1)}
            </div>
            <div className="text-xs font-mono text-gray-400 bg-gray-900/50 px-2 py-0.5 rounded">
                RC: {counts.complex > 0 ? '+' : ''}{counts.complex.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Middle: AI Config */}
      <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 flex-1 flex flex-col min-h-[300px]">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-purple-400">AI Auto-Pilot</h2>
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold transition-colors text-sm ${isAutoPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            {isAutoPlaying ? <><Pause size={18} /> STOP</> : <><Play size={18} /> START</>}
          </button>
        </div>
        
        {/* Settings Row: Run Limit & Exit Threshold */}
        <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-600 justify-center">
                <Hash size={18} className="text-gray-400"/>
                <span className="text-sm text-gray-300 font-medium">Runs</span>
                <input 
                    type="number" 
                    value={targetRuns}
                    onChange={(e) => setTargetRuns(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-gray-800 text-center text-white border border-gray-600 rounded-md focus:border-blue-500 text-sm py-1"
                />
            </div>
            
            <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-600 justify-center" title="Wong Out Threshold (True Count)">
                <LogOut size={18} className="text-gray-400"/>
                <span className="text-sm text-gray-300 font-medium">Exit &lt;</span>
                <input 
                    type="number"
                    step="0.5"
                    value={exitThreshold}
                    onChange={(e) => setExitThreshold(parseFloat(e.target.value) || -100)}
                    className="w-16 bg-gray-800 text-center text-white border border-gray-600 rounded-md focus:border-red-500 text-sm py-1"
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2 custom-scrollbar">
            {aiRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700 text-sm">
                    <span className="text-gray-400 whitespace-nowrap font-medium w-6">TC</span>
                    <select 
                        value={rule.operator}
                        onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                        className="bg-gray-800 text-white rounded px-2 py-1 border border-gray-600 text-base font-mono"
                    >
                        <option value=">=">&ge;</option>
                        <option value="<=">&le;</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                    </select>
                    <input 
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => updateRule(rule.id, 'threshold', parseFloat(e.target.value))}
                        className="bg-gray-800 text-white w-16 rounded px-2 py-1 border border-gray-600 text-center text-base font-mono"
                    />
                    <span className="text-gray-400 font-medium">Bet</span>
                    <input 
                        type="number"
                        value={rule.betAmount}
                        onChange={(e) => updateRule(rule.id, 'betAmount', parseFloat(e.target.value))}
                        className="bg-gray-800 text-green-400 font-bold w-28 rounded px-2 py-1 border border-gray-600 text-center text-base"
                    />
                    <button onClick={() => removeRule(rule.id)} className="ml-auto text-gray-500 hover:text-red-400 p-1">
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
        </div>
        <button onClick={addRule} className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium border border-dashed border-gray-500 flex items-center justify-center gap-2 transition-colors">
            <Plus size={18} /> Add Rule
        </button>
      </div>

      {/* Bottom: Run History */}
      <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 flex-1 flex flex-col min-h-[200px]">
         <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <History size={20} /> Run History
            </h2>
            <div className={`text-lg font-mono font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Total: {totalProfit > 0 ? '+' : ''}{totalProfit}
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900 rounded-lg border border-gray-700">
             <table className="w-full text-left text-sm">
                 <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                     <tr>
                         <th className="p-3 font-semibold w-16">#</th>
                         <th className="p-3 font-semibold">Result</th>
                         <th className="p-3 text-right font-semibold">Profit</th>
                     </tr>
                 </thead>
                 <tbody>
                     {runHistory.length === 0 ? (
                         <tr><td colSpan={3} className="p-6 text-center text-gray-500 italic">No runs completed yet.</td></tr>
                     ) : (
                         runHistory.map((run) => (
                             <tr key={run.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                 <td className="p-3 text-gray-500">{run.id}</td>
                                 <td className="p-3 text-gray-300">
                                     {run.reason?.includes('Wong') ? (
                                         <span className="text-yellow-500 font-bold text-xs uppercase tracking-wide">{run.reason}</span>
                                     ) : (
                                         <span className="text-gray-400 text-xs">{run.reason || 'Completed'}</span>
                                     )}
                                 </td>
                                 <td className={`p-3 text-right font-mono font-bold ${run.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                     {run.profit > 0 ? '+' : ''}{run.profit}
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};