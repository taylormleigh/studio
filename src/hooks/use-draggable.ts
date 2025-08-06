
"use client";

import { useState, useEffect, useCallback, MouseEvent, TouchEvent } from 'react';
import { useSettings } from './use-settings';

interface DraggableOptions {
    initialPosition: { x: number, y: number };
    onDragEnd?: (position: { x: number, y: number }) => void;
}

export function useDraggable({ initialPosition, onDragEnd }: DraggableOptions) {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setPosition(initialPosition);
    }, [initialPosition.x, initialPosition.y]);

    const handleDragMove = useCallback((e: globalThis.MouseEvent | globalThis.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (!hasMoved) {
            // Check for a minimum movement threshold to distinguish a click from a drag
            const dx = clientX - (dragStart.x + position.x);
            const dy = clientY - (dragStart.y + position.y);
            if (Math.sqrt(dx * dx + dy * dy) > 5) {
                 setHasMoved(true);
            }
        }

        setPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y,
        });
    }, [isDragging, dragStart, hasMoved]);

    const handleDragEnd = useCallback(() => {
        if (onDragEnd && hasMoved) {
            onDragEnd(position);
        }
        setIsDragging(false);
        setHasMoved(false);
    }, [onDragEnd, position, hasMoved]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove);
            window.addEventListener('touchend', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        setIsDragging(true);
        setHasMoved(false);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }, [position]);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        setIsDragging(true);
        setHasMoved(false);
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }, [position]);

    return {
        position,
        hasMoved,
        handleMouseDown,
        handleTouchStart,
    };
}
