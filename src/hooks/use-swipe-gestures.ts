
"use client";

import { TouchEvent } from 'react';

interface SwipeGestureProps {}

export const useSwipeGestures = (props?: SwipeGestureProps) => {

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        // This is handled by the individual card now to capture card info
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        // No-op for now to simplify
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
