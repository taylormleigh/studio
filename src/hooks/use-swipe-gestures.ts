
"use client";

import { useState, TouchEvent } from 'react';

interface SwipeGestureProps {
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
}

const MIN_SWIPE_DISTANCE = 75; // Minimum pixels for a swipe gesture

export const useSwipeGestures = ({ onSwipeRight, onSwipeLeft }: SwipeGestureProps) => {
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        // Use e.touches[0] for multi-touch support, although we only care about the first touch
        const touch = e.touches[0];
        setTouchStartX(touch.clientX);
        setTouchStartY(touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        // Prevent default browser actions like pull-to-refresh or page navigation during a swipe
        if (!touchStartX || !touchStartY) {
            return;
        }
        const touch = e.touches[0];
        const diffX = touch.clientX - touchStartX;

        // If the swipe is primarily horizontal, prevent default actions
        if (Math.abs(diffX) > 10) {
            e.preventDefault();
        }
    };

    const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY) {
            return;
        }

        const touch = e.changedTouches[0];
        const diffX = touch.clientX - touchStartX;
        const diffY = touch.clientY - touchStartY;

        // Check if the horizontal swipe distance is greater than the vertical swipe distance
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Right swipe
            if (diffX > MIN_SWIPE_DISTANCE && onSwipeRight) {
                onSwipeRight();
            }
            // Left swipe
            if (diffX < -MIN_SWIPE_DISTANCE && onSwipeLeft) {
                onSwipeLeft();
            }
        }

        // Reset touch start coordinates for the next gesture
        setTouchStartX(null);
        setTouchStartY(null);
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
};
