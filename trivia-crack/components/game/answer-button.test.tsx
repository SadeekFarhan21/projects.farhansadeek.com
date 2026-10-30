import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnswerButton } from './answer-button';

describe('AnswerButton', () => {
  it('renders the answer button', () => {
    render(
      <AnswerButton
        text="My Answer"
        onClick={() => {}}
        isCorrect={true}
        isIncorrect={false}
        reveal={false}
      />
    );
    expect(screen.getByText('My Answer')).toBeInTheDocument();
  });
});
