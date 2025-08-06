
"use client";

import { MouseEvent } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useDraggable } from '@/hooks/use-draggable';
import { Button } from '@/components/ui/button';
import { MousePointer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoButtonProps {
  onUndo: () => void;
  canUndo: boolean;
}

const iconSize = 28;
const iconStrokeWidth = 2;

export function UndoButton({ onUndo, canUndo }: UndoButtonProps) {
  const { settings, setSettings } = useSettings();
  
  // Use a default position if none is set
  const defaultPosition = { x: window.innerWidth - 80, y: window.innerHeight - 150 };
  const initialPosition = settings.undoButtonPosition || defaultPosition;

  const { position, hasMoved, handleMouseDown, handleTouchStart } = useDraggable({
    initialPosition,
    onDragEnd: (newPosition) => {
      setSettings({ undoButtonPosition: newPosition });
    }
  });

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Prevent firing onClick if it was a drag
    if (!hasMoved) {
      onUndo();
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      aria-label="Undo"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={cn(
        "undo-button gap-1 fixed z-50 h-20 w-20 rounded-full shadow-lg flex flex-col items-center justify-center cursor-grab",
        hasMoved && "cursor-grabbing"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <MousePointer size={iconSize} strokeWidth={iconStrokeWidth} fill="#ffffff" />
      <span className="text-xs">
        undo
      </span>
    </Button>
  );
}
