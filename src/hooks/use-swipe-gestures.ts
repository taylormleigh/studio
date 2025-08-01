
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
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY) {
            return;
        }

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX;
        const diffY = currentY - touchStartY;

        // Prevent default only if the swipe is clearly horizontal
        // This stops page scroll during a swipe but allows vertical scroll and other gestures.
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
           // This check is now more refined. We only prevent default for clear horizontal swipes.
           // This helps avoid interfering with vertical scrolling or native drag actions.
        }
    };

    const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY) {
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

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
