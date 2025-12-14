import React from 'react';
import { Card, Suit } from '../types';

interface CardDisplayProps {
  card: Card;
  hidden?: boolean;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({ card, hidden }) => {
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;

  if (hidden) {
    return (
      <div className="w-20 h-28 sm:w-24 sm:h-36 bg-blue-900 rounded-lg border-2 border-white shadow-lg flex items-center justify-center relative bg-opacity-90 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="w-16 h-24 border border-blue-400 rounded opacity-50"></div>
      </div>
    );
  }

  return (
    <div className={`w-20 h-28 sm:w-24 sm:h-36 bg-white rounded-lg shadow-xl flex flex-col justify-between p-2 relative select-none transform transition-transform hover:-translate-y-1`}>
      <div className={`text-lg font-bold ${isRed ? 'text-red-600' : 'text-gray-900'} leading-none`}>
        {card.rank}
        <div className="text-sm">{card.suit}</div>
      </div>
      
      <div className={`absolute inset-0 flex items-center justify-center text-4xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.suit}
      </div>

      <div className={`text-lg font-bold ${isRed ? 'text-red-600' : 'text-gray-900'} leading-none self-end rotate-180`}>
        {card.rank}
        <div className="text-sm">{card.suit}</div>
      </div>
    </div>
  );
};
