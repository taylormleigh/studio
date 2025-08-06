
"use client";

import { TouchEvent } from 'react';

interface SwipeGestureProps {
    onDrag: (x: number, y: number) => void;
}

export const useSwipeGestures = ({ onDrag }: SwipeGestureProps) => {

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        // This is handled by the individual card now to capture card info
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        onDrag(currentX, currentY);
    };

    const handleTouchEnd = () => {
       // This is handled by the main GameBoard component now
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
};
