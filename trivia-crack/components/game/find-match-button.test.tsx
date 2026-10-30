import React from 'react';
import { render, screen } from '@testing-library/react';
import { FindMatchButton } from './find-match-button';

describe('FindMatchButton', () => {
  it('renders the find match button', () => {
    render(<FindMatchButton />);
    expect(screen.getByText('Find Match')).toBeInTheDocument();
  });
});
