
import { cn } from '@/lib/utils';
import type { Suit } from '@/lib/solitaire';

export const SuitIcon = ({ suit, className, style }: { suit: Suit, className?: string, style?: React.CSSProperties }) => {
    const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
    const colorClass = isRed ? 'text-[#ff5555]' : 'text-[#000000]';
  
    const icons = {
      SPADES: '♠',
      HEARTS: '♥',
      DIAMONDS: '♦',
      CLUBS: '♣',
    };
  
    return <span className={cn('select-none', colorClass, className)} style={style}>{icons[suit]}</span>;
}
