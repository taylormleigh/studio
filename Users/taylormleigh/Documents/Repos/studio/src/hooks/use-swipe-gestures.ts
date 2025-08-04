
"use client";

import { useState, TouchEvent } from 'react';

interface SwipeGestureProps {
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
    onDrag?: (x: number, y: number) => void;
}

const MIN_SWIPE_DISTANCE = 75; // Minimum pixels for a swipe gesture

export const useSwipeGestures = ({ onSwipeRight, onSwipeLeft, onDrag }: SwipeGestureProps) => {
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        setTouchStartX(touch.clientX);
        setTouchStartY(touch.clientY);
        setIsDragging(false); // Reset dragging state on new touch
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        
        // If a drag handler is provided, we prioritize it.
        if (onDrag) {
            onDrag(currentX, currentY);
            if (!isDragging) setIsDragging(true); // Mark as dragging on first move
            return;
        }

        // Fallback to simple swipe logic if no onDrag handler is present
        const diffX = currentX - touchStartX;
        if (!isDragging && Math.abs(diffX) > 10) { // Simple drag detection for swipe
            setIsDragging(true);
        }
    };

    const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        // If it was a drag gesture, we don't process it as a swipe.
        // The component using the hook will handle the drop logic via its own onTouchEnd.
        if (isDragging) {
            setTouchStartX(null);
            setTouchStartY(null);
            setIsDragging(false);
            return;
        }

        // Process as a swipe if it wasn't a drag.
        if (!touchStartX || !touchStartY) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY)) { // Horizontal swipe
            if (diffX > MIN_SWIPE_DISTANCE && onSwipeRight) {
                onSwipeRight();
            }
            if (diffX < -MIN_SWIPE_DISTANCE && onSwipeLeft) {
                onSwipeLeft();
            }
        }

        setTouchStartX(null);
        setTouchStartY(null);
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
};
