
"use client";

import { useState, TouchEvent } from 'react';

interface SwipeGestureProps {
    onDrag?: (x: number, y: number) => void;
}

export const useSwipeGestures = ({ onDrag }: SwipeGestureProps) => {
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        setTouchStartX(touch.clientX);
        setTouchStartY(touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!touchStartX || !touchStartY || !onDrag) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        onDrag(currentX, currentY);
    };

    const handleTouchEnd = () => {
        setTouchStartX(null);
        setTouchStartY(null);
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
};
