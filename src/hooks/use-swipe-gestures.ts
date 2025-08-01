
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
    const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        // Use e.touches[0] for multi-touch support, although we only care about the first touch
        const touch = e.touches[0];
        setTouchStartX(touch.clientX);
        setTouchStartY(touch.clientY);
        setTouchCurrentX(touch.clientX); // Initialize current X
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY) {
            return;
        }

        const touch = e.touches[0];
        setTouchCurrentX(touch.clientX);
        const diffX = touch.clientX - touchStartX;
        const diffY = touch.clientY - touchStartY;

        // Prevent default only if the swipe is clearly horizontal
        // This stops page scroll during a swipe but allows vertical scroll and other gestures.
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
            e.preventDefault();
        }
    };

    const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY || !touchCurrentX) {
            return;
        }

        const diffX = touchCurrentX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;

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
        setTouchCurrentX(null);
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
};
