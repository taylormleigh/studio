# Deck of Cards - E-Ink Solitaire

This is a web-based classic card game suite, built with Next.js, React, and Tailwind CSS. It is designed with a clean, high-contrast aesthetic optimized for e-ink displays. Used Google Firebase to develop.

## Screenshots
<img width="250" alt="Screenshot 2025-07-31 at 7 26 12 AM" src="https://github.com/user-attachments/assets/221885f0-b6ed-46cc-986d-9d583c001bd4" />
<br/><img width="250" alt="Screenshot 2025-07-31 at 7 20 08 AM" src="https://github.com/user-attachments/assets/f7124be2-4d0c-4a0f-85ed-22fa29fa65c5" />
<img width="250" alt="Screenshot 2025-07-31 at 7 21 29 AM" src="https://github.com/user-attachments/assets/20b628dc-3f80-42f6-b7ff-82a1079ad26d" />
<br/><img width="650" alt="Screenshot 2025-07-31 at 7 18 55 AM" src="https://github.com/user-attachments/assets/9dd88388-c884-42b9-9e5b-c69e07c06955" />
<br/><img width="650"alt="Screenshot 2025-07-31 at 7 18 23 AM" src="https://github.com/user-attachments/assets/a6cc2aa4-4b4b-48d2-b77a-3b4ab9e933c8" />
<br/><img width="650" alt="Screenshot 2025-07-31 at 7 25 32 AM" src="https://github.com/user-attachments/assets/c9217f88-e602-4b1b-bec8-8c607f1392f6" />

*<p align="center">A view of the main game board during a game of Solitaire.</p>*

## Core Features

- **Multiple Game Modes:** Play classic Klondike Solitaire, Freecell, and Spider.
- **Customizable Rules:**
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
- [ ] Implement three-card draw for Solitaire.
- [ ] Implement Pyramid game mode.
- [ ] Add a "Hint" feature to suggest a possible move.
- [ ] Implement an extended Undo feature to revert up to 15 moves.
- [ ] Add a "New Game" confirmation to prevent accidental resets.
