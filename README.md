# Deck of Cards - E-Ink Solitaire

This is a web-based classic card game suite, built with Next.js, React, and Tailwind CSS. It is designed with a clean, high-contrast aesthetic optimized for e-ink displays, reminiscent of classic Windows 95 Solitaire.

## Screenshots

![Game Board Screenshot](https://placehold.co/800x600.png?text=Solitaire+Game+Board)
*<p align="center">A view of the main game board during a game of Solitaire.</p>*

## Core Features

- **Multiple Game Modes:** Play classic Klondike Solitaire, Freecell, and Spider.
- **Customizable Rules:**
    - Solitaire: Choose between drawing 1 or 3 cards from the stock.
    - Spider: Play with 1, 2, or 4 suits for varying difficulty.
- **Modern & Responsive UI:** A clean, high-contrast interface that works on all screen sizes, from mobile to desktop.
- **Drag & Drop and Click-to-Move:** Move cards by dragging them or by simply clicking on them for faster play (can be toggled in settings).
- **Game Statistics:** Tracks wins, best scores, and best times for each game mode.
- **Undo Functionality:** Undo your last move if you make a mistake.
- **Persistent Settings:** Your preferred game type and settings are saved locally in your browser.

## To-Do List

Here is a list of known bugs and planned features for future development.

### Bugs
- [ ] **Cannot Move Last Stack:** When a stack of cards is the last item in a tableau pile (i.e., there are no face-down cards underneath), it cannot be moved to another pile.

### Future Features
- [ ] Implement Pyramid game mode.
- [ ] Add a "Hint" feature to suggest a possible move.
- [ ] Implement an extended Undo feature to revert up to 15 moves.
- [ ] Add a "New Game" confirmation to prevent accidental resets.
