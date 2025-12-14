export enum Suit {
  Hearts = '♥',
  Diamonds = '♦',
  Clubs = '♣',
  Spades = '♠',
}

export interface Card {
  suit: Suit;
  rank: string; // '2', '3', ..., '10', 'J', 'Q', 'K', 'A'
  value: number; // 2-10, 10 for faces, 11 for A (handled dynamically usually, but base value helps)
  id: string; // Unique ID for React keys
}

export type GamePhase = 'betting' | 'playing' | 'dealerTurn' | 'gameOver' | 'shoeEnded';

export type CountingStrategy = 'simple' | 'complex';

export interface CountingSystem {
  simple: number;
  complex: number;
}

export interface AIRule {
  id: string;
  threshold: number;
  operator: '>=' | '<=' | '>' | '<';
  betAmount: number;
}

export interface RunResult {
  id: number;
  profit: number;
  timestamp: string;
  reason?: string; // Added reason field
}

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: GamePhase;
  wallet: number;
  currentBet: number;
  counts: CountingSystem;
  message: string;
  cardsRemaining: number;
}