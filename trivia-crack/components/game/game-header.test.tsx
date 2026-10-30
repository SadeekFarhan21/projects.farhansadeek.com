import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameHeader } from './game-header';

describe('GameHeader', () => {
  it('renders the game header', () => {
    render(
      <GameHeader
        currentRound={1}
        totalRounds={5}
        myInfo={{ id: '1', username: 'Player 1', elo: 1200 }}
        opponentInfo={{ id: '2', username: 'Player 2', elo: 1200 }}
        myScore={0}
        opponentScore={0}
        timeLeft={15}
        opponentAnswered={false}
      />
    );
    expect(screen.getByText('Round 1/5')).toBeInTheDocument();
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });
});
