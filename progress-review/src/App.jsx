import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'https://deckofcardsapi.com/api/deck'

const TOTAL_CARDS = 52
const VALUE_ORDER = [
  'ACE',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'JACK',
  'QUEEN',
  'KING',
]
const SUIT_ORDER = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']

const placeholderCard = {
  image: '',
  value: 'N/A',
  suit: 'N/A',
  code: 'PLACEHOLDER',
}

const createValueCounts = () =>
  VALUE_ORDER.reduce((acc, value) => {
    acc[value] = 4
    return acc
  }, {})

const createSuitCounts = () =>
  SUIT_ORDER.reduce((acc, suit) => {
    acc[suit] = 13
    return acc
  }, {})

const buildMatchMessages = (previous, current) => {
  if (!previous || !current) return []
  const matches = []
  if (previous.value === current.value) {
    matches.push('SNAP VALUE!')
  }
  if (previous.suit === current.suit) {
    matches.push('SNAP SUIT!')
  }
  return matches
}

function App() {
  const [deckId, setDeckId] = useState(null)
  const [remaining, setRemaining] = useState(52)
  const [previousCard, setPreviousCard] = useState(null)
  const [currentCard, setCurrentCard] = useState(null)
  const [status, setStatus] = useState('Initializing deck...')
  const [isLoadingDeck, setIsLoadingDeck] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [valueMatches, setValueMatches] = useState(0)
  const [suitMatches, setSuitMatches] = useState(0)
  const [isDeckComplete, setIsDeckComplete] = useState(false)
  const [valueRemaining, setValueRemaining] = useState(createValueCounts)
  const [suitRemaining, setSuitRemaining] = useState(createSuitCounts)
  const [isSoundOn, setIsSoundOn] = useState(true)

  useEffect(() => {
    let isActive = true
    const initDeck = async () => {
      try {
        setIsLoadingDeck(true)
        const response = await fetch(`${API_BASE}/new/shuffle/?deck_count=1`)
        const data = await response.json()
        if (!isActive) return
        if (!data.success) {
          throw new Error('Unable to initialize deck.')
        }
        setDeckId(data.deck_id)
        setRemaining(data.remaining)
        setPreviousCard(null)
        setCurrentCard(null)
        setValueMatches(0)
        setSuitMatches(0)
        setIsDeckComplete(false)
        setValueRemaining(createValueCounts())
        setSuitRemaining(createSuitCounts())
        setStatus('Deck ready. Draw the first card.')
      } catch (error) {
        if (!isActive) return
        setStatus('Failed to initialize the deck. Please refresh.', error)
      } finally {
        if (isActive) setIsLoadingDeck(false)
      }
    }

    initDeck()
    return () => {
      isActive = false
    }
  }, [])

  const handleDraw = useCallback(async () => {
    if (!deckId || isDrawing || remaining === 0) return
    setIsDrawing(true)
    try {
      const response = await fetch(`${API_BASE}/${deckId}/draw/?count=1`)
      const data = await response.json()
      if (!data.success || !data.cards?.length) {
        throw new Error('No card drawn.')
      }
      const [nextCard] = data.cards
      const priorCard = currentCard
      setPreviousCard(priorCard)
      setCurrentCard(nextCard)
      setRemaining(data.remaining)
      setValueRemaining((prev) => ({
        ...prev,
        [nextCard.value]: Math.max(0, (prev[nextCard.value] ?? 0) - 1),
      }))
      setSuitRemaining((prev) => ({
        ...prev,
        [nextCard.suit]: Math.max(0, (prev[nextCard.suit] ?? 0) - 1),
      }))
      if (priorCard) {
        if (priorCard.value === nextCard.value) {
          setValueMatches((prev) => prev + 1)
        }
        if (priorCard.suit === nextCard.suit) {
          setSuitMatches((prev) => prev + 1)
        }
      }
      if (data.remaining === 0) {
        setStatus('Deck empty. Refresh to start again.')
        setIsDeckComplete(true)
      } else {
        setStatus('Card drawn. Go again!')
      }
      if (isSoundOn) {
        playDrawSound()
      }
    } catch (error) {
      setStatus('Draw failed. Try again.', error)
    } finally {
      setIsDrawing(false)
    }
  }, [currentCard, deckId, isDrawing, isSoundOn, remaining])

  const messages = useMemo(
    () => buildMatchMessages(previousCard, currentCard),
    [previousCard, currentCard],
  )

  const probabilities = useMemo(() => {
    if (!currentCard || remaining === 0) {
      return { value: 0, suit: 0 }
    }
    const valueCount = valueRemaining[currentCard.value] ?? 0
    const suitCount = suitRemaining[currentCard.suit] ?? 0
    return {
      value: valueCount / remaining,
      suit: suitCount / remaining,
    }
  }, [currentCard, remaining, suitRemaining, valueRemaining])

  const showPlaceholder = !previousCard
  const isDrawDisabled = isLoadingDeck || isDrawing || remaining === 0
  const drawnCount = TOTAL_CARDS - remaining
  const progressLabel =
    drawnCount > 0
      ? `Card ${drawnCount} of ${TOTAL_CARDS}`
      : 'No cards drawn yet'

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Deck of Cards Lab</p>
        <h1>Snap the Match</h1>
        <p className="subtitle">
          Draw cards and see whether the value or suit matches the previous card.
        </p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="label">Deck Status</p>
            <p className="status" data-testid="status">
              {status}
            </p>
            <p className="progress" data-testid="progress">
              {progressLabel}
            </p>
          </div>
          <div className="counter">
            <span className="label">Cards remaining</span>
            <span className="count" data-testid="remaining">
              {remaining}
            </span>
          </div>
        </div>

        <div className="draw-controls">
          <DrawButton
            isLoadingDeck={isLoadingDeck}
            isDrawing={isDrawing}
            isDrawDisabled={isDrawDisabled}
            onDraw={handleDraw}
          />
          <button
            className="sound-toggle"
            onClick={() => setIsSoundOn((prev) => !prev)}
            type="button"
          >
            Sound: {isSoundOn ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      <section className="panel counters">
        <div className="counter-block">
          <p className="label">Value matches</p>
          <p className="count" data-testid="value-matches">
            {valueMatches}
          </p>
        </div>
        <div className="counter-block">
          <p className="label">Suit matches</p>
          <p className="count" data-testid="suit-matches">
            {suitMatches}
          </p>
        </div>
        <div className="counter-block">
          <p className="label">Next value match</p>
          <p className="count" data-testid="value-probability">
            {formatProbability(probabilities.value)}
          </p>
        </div>
        <div className="counter-block">
          <p className="label">Next suit match</p>
          <p className="count" data-testid="suit-probability">
            {formatProbability(probabilities.suit)}
          </p>
        </div>
      </section>

      <section className="table">
        <div className="card-slot">
          <p className="slot-label">Previous card</p>
          <CardDisplay
            card={showPlaceholder ? placeholderCard : previousCard}
            isPlaceholder={showPlaceholder}
          />
        </div>
        <div className="card-slot">
          <p className="slot-label">Current card</p>
          <CardDisplay
            key={currentCard?.code ?? 'current-placeholder'}
            card={currentCard || placeholderCard}
            isPlaceholder={!currentCard}
            animate={!isDeckComplete && Boolean(currentCard)}
          />
        </div>
      </section>

      <MatchMessage messages={messages} />

      {isDeckComplete ? (
        <section className="panel final" data-testid="final-results">
          <h2>Final totals</h2>
          <p>
            Value matches: <strong>{valueMatches}</strong>
          </p>
          <p>
            Suit matches: <strong>{suitMatches}</strong>
          </p>
        </section>
      ) : null}
    </div>
  )
}

function formatProbability(value) {
  if (!value || Number.isNaN(value)) return '0%'
  return `${Math.round(value * 100)}%`
}

function playDrawSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 520
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.22)
    oscillator.onended = () => audioContext.close()
  } catch (error) {
    console.error(error);
  }
}

const DrawButton = memo(function DrawButton({
  isLoadingDeck,
  isDrawing,
  isDrawDisabled,
  onDraw,
}) {
  return (
    <button
      className="draw-button"
      onClick={onDraw}
      disabled={isDrawDisabled}
      aria-disabled={isDrawDisabled}
    >
      {isLoadingDeck ? 'Shuffling...' : isDrawing ? 'Drawing...' : 'Draw a card'}
    </button>
  )
})

const MatchMessage = memo(function MatchMessage({ messages }) {
  return (
    <section className="result" aria-live="polite">
      {messages.length > 0 ? (
        <div className="message">
          {messages.map((message) => (
            <span key={message}>{message}</span>
          ))}
        </div>
      ) : (
        <p className="message muted" data-testid="no-match">
          Draw another card to check for a match.
        </p>
      )}
    </section>
  )
})

const CardDisplay = memo(function CardDisplay({ card, isPlaceholder, animate }) {
  const altText = isPlaceholder
    ? 'No card available'
    : `${card.value} of ${card.suit}`

  return (
    <div
      className={`card-display ${isPlaceholder ? 'placeholder' : ''} ${
        animate ? 'animate' : ''
      }`}
    >
      {card.image ? (
        <img className="card-img" src={card.image} alt={altText} />
      ) : (
        <div className="card-blank" aria-hidden="true">
          <span>{card.value}</span>
          <span>{card.suit}</span>
        </div>
      )}
      <div className="card-meta">
        <p className="card-value" data-testid="card-value">
          {card.value}
        </p>
        <p className="card-suit" data-testid="card-suit">
          {card.suit}
        </p>
      </div>
    </div>
  )
})

export default App
