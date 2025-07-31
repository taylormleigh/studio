
import { cn } from '@/lib/utils';
import type { Suit } from '@/lib/solitaire';

export const SuitIcon = ({ suit, className }: { suit: Suit, className?: string }) => {
    const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
    const colorClass = isRed ? 'text-[#dc2626]' : 'text-card-foreground';
  
    const icons = {
      SPADES: '♠',
      HEARTS: '♥',
      DIAMONDS: '♦',
      CLUBS: '♣',
    };
  
    return <span className={cn('select-none', colorClass, className)}>{icons[suit]}</span>;
}
