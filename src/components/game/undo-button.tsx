
"use client";

import { useState, useEffect, MouseEvent, TouchEvent } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { MousePointer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoButtonProps {
  onUndo: () => void;
  canUndo: boolean;
}

const iconSize = 32;
const iconStrokeWidth = 1.85;

export function UndoButton({ onUndo, canUndo }: UndoButtonProps) {
  const { settings, setSettings } = useSettings();
  
  // Use a default position if none is set
  const defaultPosition = { x: window.innerWidth - 80, y: window.innerHeight - 150 };
  const [position, setPosition] = useState(settings.undoButtonPosition || defaultPosition);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setPosition(settings.undoButtonPosition || defaultPosition);
  }, [settings.undoButtonPosition]);


  const handleMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setSettings({ undoButtonPosition: position });
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLButtonElement>) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: globalThis.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      setSettings({ undoButtonPosition: position });
    }
  };

  // Add global event listeners for dragging outside the button
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart]);


  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Prevent firing onClick if it was a drag
    if (Math.abs(e.clientX - (dragStart.x + position.x)) < 5 && Math.abs(e.clientY - (dragStart.y + position.y)) < 5) {
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
        "undo-button fixed z-50 h-16 w-16 rounded-full shadow-lg flex flex-col items-center justify-center cursor-grab",
         isDragging && "cursor-grabbing"
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
