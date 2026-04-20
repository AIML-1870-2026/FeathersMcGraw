const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function getHandInfo(hand) {
  let total = 0, aces = 0;
  for (const card of hand) {
    if (card.faceDown) continue;
    if (card.rank === 'A') { total += 11; aces++; }
    else if (['J','Q','K'].includes(card.rank)) total += 10;
    else total += parseInt(card.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, isSoft: aces > 0 };
}

const game = {
  deck: [],
  playerHand: [],
  dealerHand: [],
  balance: 1000,
  bet: 0,
  state: 'IDLE',

  _createDeck() {
    const deck = [];
    for (const suit of SUITS)
      for (const rank of RANKS)
        deck.push({ suit, rank, faceDown: false });
    return deck;
  },

  _shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  },

  _dealCard(faceDown = false) {
    if (this.deck.length === 0) {
      this.deck = this._createDeck();
      this._shuffle(this.deck);
    }
    const card = { ...this.deck.pop() };
    card.faceDown = faceDown;
    return card;
  },

  init() {
    this.deck = this._createDeck();
    this._shuffle(this.deck);
    this.balance = 1000;
    this.state = 'IDLE';
  },

  startHand(bet) {
    if (bet <= 0 || bet > this.balance) return false;
    if (this.deck.length < 15) {
      this.deck = this._createDeck();
      this._shuffle(this.deck);
    }
    this.bet = bet;
    this.playerHand = [this._dealCard(), this._dealCard()];
    this.dealerHand = [this._dealCard(), this._dealCard(true)];
    this.state = 'PLAYER_TURN';
    return true;
  },

  isBlackjack(hand) {
    if (hand.length !== 2) return false;
    return getHandInfo(hand).total === 21;
  },

  hit() {
    if (this.state !== 'PLAYER_TURN') return null;
    const card = this._dealCard();
    this.playerHand.push(card);
    const { total } = getHandInfo(this.playerHand);
    if (total > 21) {
      this.revealDealer();
      this.state = 'HAND_DONE';
      return { bust: true, total };
    }
    return { bust: false, total };
  },

  stand() {
    if (this.state !== 'PLAYER_TURN') return;
    this.revealDealer();
    this._dealerPlay();
    this.state = 'HAND_DONE';
  },

  revealDealer() {
    for (const c of this.dealerHand) c.faceDown = false;
  },

  _dealerPlay() {
    while (true) {
      const { total } = getHandInfo(this.dealerHand);
      if (total >= 17) break;
      this.dealerHand.push(this._dealCard());
    }
  },

  resolveHand() {
    const { total: pt } = getHandInfo(this.playerHand);
    const { total: dt } = getHandInfo(this.dealerHand);
    const pBJ = this.isBlackjack(this.playerHand);
    const dBJ = this.isBlackjack(this.dealerHand);

    let result, payout;
    if (pt > 21)          { result = 'bust';      payout = -this.bet; }
    else if (pBJ && dBJ)  { result = 'push';      payout = 0; }
    else if (pBJ)         { result = 'blackjack'; payout = Math.floor(this.bet * 1.5); }
    else if (dBJ)         { result = 'loss';      payout = -this.bet; }
    else if (dt > 21)     { result = 'win';       payout = this.bet; }
    else if (pt > dt)     { result = 'win';       payout = this.bet; }
    else if (dt > pt)     { result = 'loss';      payout = -this.bet; }
    else                  { result = 'push';      payout = 0; }

    this.balance += payout;
    return { result, payout, playerTotal: pt, dealerTotal: dt };
  }
};
