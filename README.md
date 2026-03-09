# Snap the Match

Single-page React app using the Deck of Cards API. Draw cards, compare with the previous card, track match totals, and see live probabilities for the next draw.

## Features
- Initialize and shuffle a deck on load
- Draw cards and display previous/current cards
- Match messages for value and suit
- Match counters (value and suit)
- Progress indicator (e.g., "Card 12 of 52")
- Live probability indicators based on remaining cards
- Deck completion summary
- Card flip + fade animations
- Optional draw sound toggle

## Tech Stack
- React + Vite
- CSS (custom styling)
- Vitest + Testing Library

## Getting Started
```bash
npm install
npm run dev
```

## Tests
```bash
npm test
```

## Performance Optimization Notes
This project applies `useMemo` and `useCallback` to avoid unnecessary re-renders:
- `useCallback` memoizes the draw handler so the memoized `DrawButton` does not re-render when unrelated state updates.
- `useMemo` memoizes the match messages and probability calculations so memoized UI components only update when card data changes.
- `memo` wraps presentational components (`DrawButton`, `MatchMessage`, `CardDisplay`) so they skip re-rendering when props are unchanged.

Without these, function and array references would be recreated on every render, preventing memoized children from skipping renders.

## API
Uses the Deck of Cards API:
- `https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1`
- `https://deckofcardsapi.com/api/deck/{deck_id}/draw/?count=1`