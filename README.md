<p align="center">
    <img src="public/favicon.svg" width="64" height="64" alt="appicon" />
</p>

### a deck of cards
### simple, ad free, offline-friendly game for mobile and browser ([Demo](https://deckofcards.vercel.app/))
A deck of cards is a web-based classic card game suite, built with Next.js, React, and Tailwind CSS. It is designed with a clean, high-contrast aesthetic optimized for e-ink displays. Used Google Firebase to develop. No trackers, no database, no ads, just a deck of cards to play games with on your phone.

- [Core Features](#core-features)
- [Screenshots](#screenshots)
- [Style Guide](#style-guide)
- [To-Do List](#to-do-list)
  - [Bugs](#bugs)
  - [Future Features](#future-features)

## Core Features
- **Multiple Games:** Play classic Klondike Solitaire, Freecell, and Spider.
- **Customizable Rules:**
    - Spider: Play with 1, 2, or 4 suits for varying difficulty.
    - Solitaire: Play one card or three card draw.
- **Modern & Responsive UI:** A clean, high-contrast interface that works on all screen sizes, from mobile to desktop.
- **Customized Views:** App includes a light and dark mode, color mode (full color or greyscale), and the option to display the tableau left-hand oriented or right-hand oriented. These options can be changed at any time and will not end the game. 
- **Intuitive Controls:**
    - **Drag & Drop:** Move cards by dragging them to valid piles.
    - **Click to Move:** Enable this mode in settings to automatically move cards to a valid destination with a single click.
    - **Keyboard Shortcuts:** Use `Enter` to draw, `Ctrl/Cmd+Z` to undo, `Ctrl/Cmd+N` for a new game, and more.
    - **Swipe Gestures:** On touch devices, swipe right to undo your last move.
- **Game Statistics:** Tracks wins, best scores, and best times for each game.
- **Persistent Settings:** Your preferred game type, scores, and settings are saved locally in your browser for your next visit. This app functions fully offline.

## Screenshots
### Browser
<br/><img width="600" src="https://github.com/user-attachments/assets/cd7b260e-6b0b-43d1-af3b-98c175093d30" />
<br/><img width="300" alt="Screenshot 2025-08-01 at 1 07 11 AM" src="https://github.com/user-attachments/assets/6666322d-e757-4f46-a162-487c86c57654" />
<img width="300" alt="Screenshot 2025-08-01 at 1 08 23 AM" src="https://github.com/user-attachments/assets/a72de738-bf13-4f2d-9f6f-ca67dc78774e" />
<br/><img width="600" alt="Screenshot 2025-08-01 at 1 09 18 AM" src="https://github.com/user-attachments/assets/dea18213-a79e-44e9-b4a6-bbd398ee9570" />

### Mobile
<br/><img width="150" src="https://github.com/user-attachments/assets/24d8fe78-108f-45b6-a194-254aaadf9e72" />
<img width="150" src="https://github.com/user-attachments/assets/15e43f9e-c50a-4553-aeea-02f13444cb28" />
<img width="150" src="https://github.com/user-attachments/assets/0787c33e-0fd2-4c44-9f52-ed5fb155aec2" />
<img width="150" src="https://github.com/user-attachments/assets/62b2f0c2-2a45-488a-b610-0bd14b38bf01" />
<br/><img width="200" src="https://github.com/user-attachments/assets/8ee2511b-32ae-4ca2-b9d7-93846e626951" />
<img width="200" src="https://github.com/user-attachments/assets/78e83afc-b6cb-4fd9-9391-1dfb6286abca" />
<img width="200" src="https://github.com/user-attachments/assets/92b03e0b-f80d-45a9-8c3a-f45804aa5d8b" />


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

