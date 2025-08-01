
### a deck of cards
## simple, ad free, offline-friendly game for mobile and browser
A deck of cards is a web-based classic card game suite, built with Next.js, React, and Tailwind CSS. It is designed with a clean, high-contrast aesthetic optimized for e-ink displays. Used Google Firebase to develop. No trackers, no database, no ads, just a deck of cards to play games with on your phone.

- [Core Features](#core-features)
- [Screenshots](#screenshots)
  - [Browser](#browser)
  - [Mobile](#mobile)
- [To-Do List](#to-do-list)
  - [Bugs](#bugs)
  - [Future Features](#future-features)

## Core Features
- **Multiple Game Modes:** Play classic Klondike Solitaire, Freecell, and Spider.
- **Customizable Rules:**
    - Spider: Play with 1, 2, or 4 suits for varying difficulty.
    - Solitaire: Play one card or three card draw.
- **Modern & Responsive UI:** A clean, high-contrast interface that works on all screen sizes, from mobile to desktop. Includes a light and dark theme.
- **Intuitive Controls:**
    - **Drag & Drop:** Move cards by dragging them to valid piles.
    - **Click to Move:** Enable this mode in settings to automatically move cards to a valid destination with a single click.
    - **Keyboard Shortcuts:** Use `Enter` to draw, `Ctrl/Cmd+Z` to undo, `Ctrl/Cmd+N` for a new game, and more.
    - **Swipe Gestures:** On touch devices, swipe right to undo your last move.
- **Game Statistics:** Tracks wins, best scores, and best times for each game.
- **Undo Functionality:** Undo up to 100 of your most recent moves.
- **Persistent Settings:** Your preferred game type, scores, and settings are saved locally in your browser for your next visit.

## Screenshots
### Browser
<img height="550" alt="Screenshot 2025-07-31 at 7 54 29 AM" src="https://github.com/user-attachments/assets/cc905f48-7622-49eb-9116-0393d84f13a7" />
<br/><img height="550" alt="Screenshot 2025-07-31 at 7 54 46 AM" src="https://github.com/user-attachments/assets/2ffef036-4a88-4323-970a-64e96373d86f" />
<br/><img height="55_0" alt="Screenshot 2025-07-31 at 7 55 28 AM" src="https://github.com/user-attachments/assets/4bce35f7-6b79-49ee-a541-6f620963ef4d" />

### Mobile
<img height="400" alt="Screenshot 2025-07-31 at 8 06 11 AM" src="https://github.com/user-attachments/assets/6c8181a0-bd7c-4cf8-a4d9-ece99c934369" />
<img height="400" alt="Screenshot 2025-07-31 at 8 05 24 AM" src="https://github.com/user-attachments/assets/ff72f867-3dea-42b8-a0ad-fc48d0929f02" />
<img height="400" alt="Screenshot 2025-07-31 at 8 00 21 AM" src="https://github.com/user-attachments/assets/75770426-735e-43b0-82ea-ffeff07334aa" />
<br/><img height="400" alt="Screenshot 2025-07-31 at 8 00 03 AM" src="https://github.com/user-attachments/assets/9a8ae30d-9e09-4dc9-9eee-645a8cdfff0d" />
<img height="400" alt="Screenshot 2025-07-31 at 8 00 46 AM" src="https://github.com/user-attachments/assets/5ff00e92-13fa-447f-afc9-8a1c70262d3e" />

<br/>
# To-Do List
## Bugs
- [ ] **Cannot Move Last Stack:** When a stack of cards is the last item in a tableau pile (i.e., there are no face-down cards underneath), it cannot be moved to another pile.
- [ ] **Freecell Test Suite:** The simulation helper for moving cards in `freecell.test.ts` has a minor flaw related to calculating movable card counts when moving to an empty pile, causing some tests to fail. The core game logic is correct, but the test simulation needs to be fixed.

## Future Features
### More card games
- [ ] Three-card draw for Solitaire.
- [X] ~~Freecell~~
- [ ] Spider
  - [ ] 1 suite
  - [ ] 2 suite
  - [ ] 4 suite
- [ ] Pyramid
### Gameplay options
- [X] ~~Implement an extended Undo feature to revert more than 15 moves.~~
- [ ] Implement a "reset" button (doesn't start a new game; restarts the current game)
### View options
- [ ] Add custom card color options in settings.
- [X] ~~Dark mode and light mode~~
- [X] ~~Color mode and greyscale mode~~
### Other
- [ ] PWA

<br/>
<p align="center">
    <img src="public/favicon.svg" width="64" height="64" alt="appicon" />
</p>
