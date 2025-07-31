### a deck of cards
# simple, ad free, offline-friendly app for mobile and browser
This is a web-based classic card game suite, built with Next.js, React, and Tailwind CSS. It is designed with a clean, high-contrast aesthetic optimized for e-ink displays. Used Google Firebase to develop.
<br/><img height="320" alt="Screenshot 2025-07-31 at 7 56 07 AM" src="https://github.com/user-attachments/assets/7074ac43-b4ea-4079-8673-af9fd8d4e7af" />

## Screenshots
### Browser
<img height="550" alt="Screenshot 2025-07-31 at 7 54 29 AM" src="https://github.com/user-attachments/assets/cc905f48-7622-49eb-9116-0393d84f13a7" />
<br/><img height="550" alt="Screenshot 2025-07-31 at 7 54 46 AM" src="https://github.com/user-attachments/assets/2ffef036-4a88-4323-970a-64e96373d86f" />
<br/><img height="550" alt="Screenshot 2025-07-31 at 7 55 28 AM" src="https://github.com/user-attachments/assets/4bce35f7-6b79-49ee-a541-6f620963ef4d" />

### Mobile
<img height="400" alt="Screenshot 2025-07-31 at 8 06 11 AM" src="https://github.com/user-attachments/assets/6c8181a0-bd7c-4cf8-a4d9-ece99c934369" />
<img height="400" alt="Screenshot 2025-07-31 at 8 05 24 AM" src="https://github.com/user-attachments/assets/ff72f867-3dea-42b8-a0ad-fc48d0929f02" />
<img height="400" alt="Screenshot 2025-07-31 at 8 00 21 AM" src="https://github.com/user-attachments/assets/75770426-735e-43b0-82ea-ffeff07334aa" />
<br/><img height="400" alt="Screenshot 2025-07-31 at 8 00 03 AM" src="https://github.com/user-attachments/assets/9a8ae30d-9e09-4dc9-9eee-645a8cdfff0d" />
<img height="400" alt="Screenshot 2025-07-31 at 8 00 46 AM" src="https://github.com/user-attachments/assets/5ff00e92-13fa-447f-afc9-8a1c70262d3e" />


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
- [ ] PWA
