# Blackjack Quest: Specification Document

## Overview
A single-player blackjack game with nautical aesthetic and optional real-time probability statistics. The game teaches probability and decision-making while providing authentic blackjack gameplay.

---

## Design Philosophy

### UI (User Interface)
- **Visual Design:** Nautical theme with weathered wood table, ocean blue accents, and aged gold elements
- **Layout:** Clean three-section design
  - Top: Dealer's cards and hand total
  - Middle: Player's cards and hand total
  - Bottom: Action buttons and toggleable statistics panel
- **Cards:** Standard suits and numbers with subtle parchment texture
- **Chips/Betting:** Gold coin aesthetic with clear numeric labels

### UX (User Experience)
- **Target User:** Average person who wants to learn blackjack and understand the math behind decisions
- **Core Goal:** Make probability accessible without overwhelming casual players
- **Information Hierarchy:** Game actions are primary; statistics are optional secondary information
- **Feedback:** Clear visual feedback for wins, losses, blackjacks, and busts

---

## Game Rules & Mechanics

### Standard Blackjack Rules
- **Deck:** Single deck (52 cards)
- **Dealer Behavior:** Hits on 16 or less, stands on 17 or higher
- **Blackjack Payout:** 3:2 (e.g., $10 bet pays $15 on natural blackjack)
- **Win Conditions:**
  - Player gets blackjack (dealer doesn't) → Win 1.5x bet
  - Player total > Dealer total (without busting) → Win 1x bet
  - Player total = Dealer total → Push (tie, bet returned)
  - Dealer busts and player doesn't → Win 1x bet
- **Loss Conditions:**
  - Player busts (exceeds 21) → Lose bet immediately
  - Dealer total > Player total (without busting) → Lose bet
- **Double Blackjack:** Both player and dealer get natural blackjack → Push

### Allowed Actions
1. **Hit:** Draw another card
2. **Stand:** Keep current hand and end turn
3. **Double Down:** Double bet, receive exactly one more card, then must stand
   - Only available on first two cards
4. **Place Bet:** Before cards are dealt, set wager amount

### Deck Management
- **Reshuffle Trigger:** When fewer than 13 cards remain in deck
- **Card Tracking:** All dealt cards are tracked for probability calculations
- **Shuffle Notification:** Visual indicator when deck reshuffles

---

## Soundness & Completeness

### Soundness (Prevents Unintended Behaviors)
- **Betting Constraints:**
  - Bet cannot be changed after cards are dealt
  - Bet amount must be ≥ $1 and ≤ player's current bankroll
  - Cannot start new hand with $0 balance
- **Action Constraints:**
  - "Double Down" only available on first two cards
  - No actions allowed after player stands or busts
  - Dealer plays automatically (no player input)
- **Card Dealing:**
  - Cards dealt in correct order: Player, Dealer, Player, Dealer (one hidden)
  - Dealer's hole card revealed only after player stands
  - No duplicate cards dealt from same deck state

### Completeness (Covers All Scenarios)
- **All Outcomes Defined:**
  - Player blackjack vs. dealer blackjack (push)
  - Player blackjack vs. dealer non-blackjack (3:2 payout)
  - Player bust (immediate loss)
  - Dealer bust (player wins if didn't bust)
  - Equal totals (push)
  - Player higher total (win)
  - Dealer higher total (loss)
- **Edge Cases:**
  - Starting bankroll = $100
  - Minimum bet = $1
  - Deck reshuffles before hand if <13 cards remain
  - Aces count as 11 or 1 (soft/hard total logic)
  - Game over state when player reaches $0

---

## Statistics Panel

### Toggle Functionality
- **Button Location:** Top-right corner or near betting area
- **Label:** "Statistics" (not "Coach Mode")
- **Default State:** Off (hidden)
- **Behavior:** Clicking toggles panel visibility

### Panel Design
- **Location:** Bottom of screen, below action buttons
- **Aesthetic:** Wooden panel matching nautical theme
- **Typography:** Clean, modern font on weathered background texture

### Statistics Displayed

#### 1. Bust Probability for Next Hit
- **Visual:** Horizontal progress bar (green → yellow → red gradient)
- **Label:** "Bust Risk if Hit"
- **Format:** Percentage (e.g., "23%")
- **Calculation:** Based on current hand total and remaining cards in deck
- **Example Logic:**
  - Player has 16
  - Cards that bust: 6, 7, 8, 9, 10, J, Q, K (8 ranks)
  - If 28 of those cards remain in 40-card deck → 70% bust risk

#### 2. Win Probability if Stand Now
- **Visual:** Horizontal progress bar (red → yellow → green gradient)
- **Label:** "Win Chance if Stand"
- **Format:** Percentage (e.g., "68%")
- **Calculation:** Estimated probability of beating dealer based on:
  - Dealer's upcard
  - Player's current total
  - Remaining deck composition
- **Simplified Approach:** Use dealer upcard + standard strategy tables for estimation

#### 3. Cards Remaining
- **Visual:** Small text indicator
- **Label:** "Cards in deck: 38 remaining"
- **Purpose:** Helps player understand deck penetration

### When Statistics Update
- After each card is dealt
- When player changes action (hover over Hit/Stand)
- Automatically hidden when hand ends (until toggled back on)

---

## Visual Design Specifications

### Color Palette
- **Primary Background:** Deep ocean blue (#1a3a52)
- **Table Surface:** Weathered wood (#8b7355)
- **Accents:** Aged gold (#d4af37)
- **Text:** White (#ffffff) and dark navy (#0d1b2a)
- **Card Background:** Off-white parchment (#f4e8d0)

### Typography
- **Headings:** Bold, clean sans-serif
- **Body Text:** Readable sans-serif (16px minimum)
- **Card Text:** Clear serif font for traditional look

### Decorative Elements
- Rope texture borders
- Subtle compass rose watermark in background
- Wood grain texture on table and panels
- Coin icons for betting interface

### Animations (Optional Enhancements)
- Card dealing animation (slide in from deck)
- Chip stacking animation when betting
- Statistics bar smooth transitions
- Win/loss celebration effects

---

## Technical Requirements

### File Structure
- **Single HTML file** containing all:
  - HTML structure
  - CSS styling
  - JavaScript game logic
- No external dependencies (all code self-contained)

### Core Functions Required
1. **Deck Management:**
   - `shuffleDeck()`: Creates and shuffles 52-card deck
   - `dealCard()`: Removes and returns top card from deck
   - `shouldReshuffle()`: Checks if <13 cards remain

2. **Game State:**
   - Track player hand, dealer hand, current bet, bankroll
   - Track all dealt cards for probability calculations
   - Manage game phase (betting, player turn, dealer turn, resolution)

3. **Probability Calculations:**
   - `calculateBustProbability(hand, remainingDeck)`
   - `calculateWinProbability(playerTotal, dealerUpcard, remainingDeck)`

4. **Hand Evaluation:**
   - `calculateHandValue(hand)`: Returns total (handles Ace as 11 or 1)
   - `isBlackjack(hand)`: Two cards totaling 21
   - `isBust(hand)`: Total exceeds 21

5. **UI Updates:**
   - `renderHands()`: Display cards visually
   - `updateStatistics()`: Refresh probability displays
   - `updateBankroll()`: Show current money

---

## Testing Requirements

### Required Validations (From Assignment)
1. **Natural Blackjack Payout:**
   - Player gets blackjack (A + 10-value card)
   - Dealer does not get blackjack
   - **Expected:** Player wins 1.5x bet amount

2. **Double Blackjack Push:**
   - Both player and dealer get natural blackjack
   - **Expected:** Bet is returned (no win, no loss)

### Additional Test Cases
1. **Player Bust:**
   - Player hits and exceeds 21
   - **Expected:** Immediate loss, dealer doesn't play

2. **Dealer Bust:**
   - Player stands, dealer draws and exceeds 21
   - **Expected:** Player wins 1x bet

3. **Push (Non-Blackjack):**
   - Player: 18, Dealer: 18
   - **Expected:** Bet returned

4. **Double Down:**
   - Player doubles on first two cards
   - Receives exactly one card
   - Bet is doubled
   - **Expected:** Cannot hit again after doubling

5. **Deck Reshuffle:**
   - Play hands until <13 cards remain
   - **Expected:** Deck reshuffles before next hand

6. **Statistics Accuracy:**
   - Manually verify bust probability calculation
   - Example: Player has 19 (only 2, 3, 4 won't bust)
   - **Expected:** Bust risk should be accurate based on remaining cards

7. **Bet Validation:**
   - Try to bet more than bankroll
   - Try to bet $0 or negative
   - **Expected:** Bet rejected or clamped to valid range

---

## Deployment

### GitHub Pages Setup
1. Create repository named `blackjack-quest`
2. Upload single HTML file as `index.html`
3. Enable GitHub Pages in repository settings
4. Submit URL: `https://[username].github.io/blackjack-quest`

### Browser Compatibility
- Target modern browsers (Chrome, Firefox, Safari, Edge)
- Use standard CSS/JS (no framework required)
- Responsive design optional but recommended

---

## Future Enhancements (Optional)

### Gameplay Features
- **Split Pairs:** When dealt two cards of same rank
- **Insurance:** When dealer shows Ace
- **Multiple Hands:** Play multiple hands simultaneously
- **Card Counting Display:** Show running count for educational purposes
- **Strategy Hints:** Suggest optimal play based on basic strategy

### Visual/Audio
- Sound effects for card dealing, wins, losses
- Background ocean wave audio (toggleable)
- Smooth animations for all actions
- Mobile-responsive layout

### Analytics
- Session performance graphs
- Export game history as CSV
- Heatmap of decisions vs. outcomes
- Achievement system (win streaks, profit milestones)

---

## Summary

This specification defines a **sound** (prevents invalid actions and bets) and **complete** (covers all blackjack outcomes) implementation of single-player blackjack with educational probability features. The nautical aesthetic creates visual interest while maintaining clean UX, and the toggleable statistics panel helps average users understand the math behind their decisions without overwhelming the core gameplay.

**Key Differentiation:** Real-time probability calculation based on actual deck composition, presented in accessible language for non-mathematicians.
