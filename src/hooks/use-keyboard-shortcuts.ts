
"use client";

import { useEffect } from 'react';

interface KeyboardShortcutProps {
    onNewGame: () => void;
    onUndo: () => void;
    onDraw: () => void;
    onOpenSettings: () => void;
}

export const useKeyboardShortcuts = ({ onNewGame, onUndo, onDraw, onOpenSettings }: KeyboardShortcutProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isModKey = e.metaKey || e.ctrlKey;

            if (isModKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                onNewGame();
            } else if (isModKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                onOpenSettings();
            } else if (isModKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                onUndo();
            } else if (!isModKey) {
                switch (e.key) {
                    case 'Enter':
                    case 'ArrowRight':
                    case ' ':
                    case 'Spacebar':
                        onDraw();
                        break;
                    case 'Backspace':
                    case 'Delete':
                    case 'ArrowLeft':
                        onUndo();
                        break;
                    default:
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onNewGame, onUndo, onDraw, onOpenSettings]);
};
