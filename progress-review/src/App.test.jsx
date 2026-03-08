import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App.jsx'

const mockDeckResponse = {
  success: true,
  deck_id: 'deck-123',
  remaining: 52,
}

const mockDrawResponse = (card, remaining = 51) => ({
  success: true,
  deck_id: 'deck-123',
  remaining,
  cards: [card],
})

const createFetchMock = (responses) =>
  vi.fn().mockImplementation(() => {
    const next = responses.shift()
    return Promise.resolve({
      json: () => Promise.resolve(next),
    })
  })

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes a deck on load', async () => {
    const fetchMock = createFetchMock([mockDeckResponse])
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(screen.getByText('Shuffling...')).toBeInTheDocument()

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1',
      )
    })

    expect(screen.getByTestId('remaining')).toHaveTextContent('52')
    expect(screen.getByTestId('status')).toHaveTextContent(
      'Deck ready. Draw the first card.',
    )
  })

  it('draws cards and keeps the previous card visible', async () => {
    const firstCard = {
      image: 'https://example.com/ace.png',
      value: 'ACE',
      suit: 'SPADES',
      code: 'AS',
    }
    const secondCard = {
      image: 'https://example.com/king.png',
      value: 'KING',
      suit: 'HEARTS',
      code: 'KH',
    }

    vi.stubGlobal(
      'fetch',
      createFetchMock([
        mockDeckResponse,
        mockDrawResponse(firstCard, 51),
        mockDrawResponse(secondCard, 50),
      ]),
    )

    render(<App />)

    const drawButton = await screen.findByRole('button', {
      name: 'Draw a card',
    })

    await userEvent.click(drawButton)

    expect(await screen.findByAltText('ACE of SPADES')).toBeInTheDocument()
    expect(screen.getAllByTestId('card-value')[1]).toHaveTextContent('ACE')

    await userEvent.click(drawButton)

    expect(await screen.findByAltText('KING of HEARTS')).toBeInTheDocument()
    expect(screen.getAllByTestId('card-value')[0]).toHaveTextContent('ACE')
    expect(screen.getAllByTestId('card-value')[1]).toHaveTextContent('KING')
  })

  it('shows a snap message when the suit matches', async () => {
    const firstCard = {
      image: 'https://example.com/queen.png',
      value: 'QUEEN',
      suit: 'CLUBS',
      code: 'QC',
    }
    const secondCard = {
      image: 'https://example.com/two.png',
      value: '2',
      suit: 'CLUBS',
      code: '2C',
    }

    vi.stubGlobal(
      'fetch',
      createFetchMock([
        mockDeckResponse,
        mockDrawResponse(firstCard, 51),
        mockDrawResponse(secondCard, 50),
      ]),
    )

    render(<App />)

    const drawButton = await screen.findByRole('button', {
      name: 'Draw a card',
    })

    await userEvent.click(drawButton)
    await userEvent.click(drawButton)

    expect(await screen.findByText('SNAP SUIT!')).toBeInTheDocument()
    expect(screen.getByTestId('suit-matches')).toHaveTextContent('1')
    expect(screen.getByTestId('value-matches')).toHaveTextContent('0')
  })

  it('shows final totals and disables draw when the deck is empty', async () => {
    const firstCard = {
      image: 'https://example.com/ace.png',
      value: 'ACE',
      suit: 'SPADES',
      code: 'AS',
    }
    const secondCard = {
      image: 'https://example.com/ace2.png',
      value: 'ACE',
      suit: 'HEARTS',
      code: 'AH',
    }

    vi.stubGlobal(
      'fetch',
      createFetchMock([
        mockDeckResponse,
        mockDrawResponse(firstCard, 1),
        mockDrawResponse(secondCard, 0),
      ]),
    )

    render(<App />)

    const drawButton = await screen.findByRole('button', {
      name: 'Draw a card',
    })

    await userEvent.click(drawButton)
    await userEvent.click(drawButton)

    expect(drawButton).toBeDisabled()
    expect(screen.getByTestId('final-results')).toBeInTheDocument()
    expect(screen.getByText('Value matches:')).toBeInTheDocument()
    expect(screen.getByText('Suit matches:')).toBeInTheDocument()
    expect(screen.getByTestId('value-matches')).toHaveTextContent('1')
    expect(screen.getByTestId('suit-matches')).toHaveTextContent('0')
  })
})
