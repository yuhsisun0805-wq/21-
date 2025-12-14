import { Card, Suit, AIRule, CountingSystem, CountingStrategy } from './types';

// --- Deck Logic ---

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const createDecks = (numDecks: number = 2): Card[] => {
  const deck: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of Object.values(Suit)) {
      for (const rank of RANKS) {
        let value = parseInt(rank);
        if (isNaN(value)) {
          value = rank === 'A' ? 11 : 10;
        }
        deck.push({
          suit,
          rank,
          value,
          id: `${d}-${suit}-${rank}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    }
  }
  return shuffle(deck);
};

export const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const calculateHandValue = (hand: Card[]): number => {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    value += card.value;
    if (card.rank === 'A') aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
};

// --- Counting Logic ---

export const getSimpleCountDelta = (card: Card): number => {
  if (['2', '3', '4', '5', '6'].includes(card.rank)) return 1;
  if (['10', 'J', 'Q', 'K', 'A'].includes(card.rank)) return -1;
  return 0; // 7, 8, 9
};

export const getComplexCountDelta = (card: Card): number => {
  switch (card.rank) {
    case '2': return 0.4;
    case '3': return 0.5;
    case '4': return 0.6;
    case '5': return 0.7;
    case '6': return 0.6;
    case '7': return 0.3;
    case '8': return 0;
    case '9': return -0.2;
    case '10':
    case 'J':
    case 'Q':
    case 'K': return -0.6;
    case 'A': return -0.7;
    default: return 0;
  }
};

// --- AI Strategy ---

export const determineAIBet = (
  currentCount: CountingSystem, 
  decksRemaining: number,
  rules: AIRule[], 
  strategy: CountingStrategy, 
  defaultBet: number = 1000
): number => {
  const runningCount = currentCount[strategy];
  // Calculate True Count: Running Count / Decks Remaining
  const trueCount = runningCount / decksRemaining;

  for (const rule of rules) {
    let matches = false;
    switch (rule.operator) {
      case '>=': matches = trueCount >= rule.threshold; break;
      case '<=': matches = trueCount <= rule.threshold; break;
      case '>': matches = trueCount > rule.threshold; break;
      case '<': matches = trueCount < rule.threshold; break;
    }
    if (matches) return rule.betAmount;
  }
  return defaultBet;
};

export const getBasicStrategyMove = (playerHand: Card[], dealerUpCard: Card, trueCount: number = 0): 'hit' | 'stand' | 'double' => {
  const playerVal = calculateHandValue(playerHand);
  const dealerVal = dealerUpCard.value; 
  
  let rawSum = 0;
  let hasAce = false;
  playerHand.forEach(c => {
    rawSum += (c.rank === 'A' ? 11 : c.value);
    if(c.rank === 'A') hasAce = true;
  });
  const isSoft = hasAce && rawSum <= 21;

  // --- CARD COUNTING DEVIATIONS (Illustrious 18 Subset) ---
  // These override Basic Strategy when the True Count (EV) justifies it.

  if (!isSoft) {
    // 16 vs 10: Stand if TC >= 0
    if (playerVal === 16 && dealerVal === 10 && trueCount >= 0) return 'stand';
    
    // 15 vs 10: Stand if TC >= 4
    if (playerVal === 15 && dealerVal === 10 && trueCount >= 4) return 'stand';

    // 12 vs 3: Stand if TC >= 2
    if (playerVal === 12 && dealerVal === 3 && trueCount >= 2) return 'stand';

    // 12 vs 2: Stand if TC >= 3
    if (playerVal === 12 && dealerVal === 2 && trueCount >= 3) return 'stand';

    // 10 vs 10/A: Double if TC >= 4
    if (playerVal === 10 && (dealerVal === 10 || dealerVal === 11) && trueCount >= 4) return 'double';

    // 9 vs 2: Double if TC >= 1
    if (playerVal === 9 && dealerVal === 2 && trueCount >= 1) return 'double';
    
    // 9 vs 7: Double if TC >= 3
    if (playerVal === 9 && dealerVal === 7 && trueCount >= 3) return 'double';
  }

  // --- STANDARD BASIC STRATEGY ---

  if (!isSoft) {
    if (playerVal >= 17) return 'stand';
    
    if (playerVal >= 13) {
      return (dealerVal >= 2 && dealerVal <= 6) ? 'stand' : 'hit';
    }
    
    if (playerVal === 12) {
      return (dealerVal >= 4 && dealerVal <= 6) ? 'stand' : 'hit';
    }
    
    if (playerVal === 11) {
      return 'double';
    }
    
    if (playerVal === 10) {
      return (dealerVal >= 2 && dealerVal <= 9) ? 'double' : 'hit';
    }
    
    if (playerVal === 9) {
      return (dealerVal >= 3 && dealerVal <= 6) ? 'double' : 'hit';
    }
    
    if (playerVal <= 8) return 'hit';
  } 
  
  else {
    // Soft Hands
    if (playerVal >= 20) return 'stand';
    
    if (playerVal === 19) {
      // Soft 19: Double vs 6 if TC >= 0 (simple deviation), else Stand
      if (dealerVal === 6 && trueCount >= 0) return 'double'; 
      return 'stand';
    }
    
    if (playerVal === 18) {
      if (dealerVal >= 2 && dealerVal <= 6) return 'double';
      if (dealerVal === 7 || dealerVal === 8) return 'stand';
      return 'hit';
    }
    
    if (playerVal === 17) {
      return (dealerVal >= 3 && dealerVal <= 6) ? 'double' : 'hit';
    }
    
    if (playerVal === 15 || playerVal === 16) {
      return (dealerVal >= 4 && dealerVal <= 6) ? 'double' : 'hit';
    }
    
    if (playerVal === 13 || playerVal === 14) {
      return (dealerVal >= 5 && dealerVal <= 6) ? 'double' : 'hit';
    }
  }

  return 'hit';
};