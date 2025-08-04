
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
        setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX;
        const diffY = currentY - touchStartY;

        if (!isDragging) {
            // Determine if it's a drag or a swipe based on the initial movement
            if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
                 setIsDragging(true);
            }
        }
        
        if (isDragging && onDrag) {
            onDrag(currentX, currentY);
        }
    };

    const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY || isDragging) {
             // If it was a drag, let the component's onTouchEnd handle it
             if (isDragging) {
                // The component-level onTouchEnd will be called, which handles the drop logic.
             }
             setTouchStartX(null);
             setTouchStartY(null);
             setIsDragging(false);
             return;
        }

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
