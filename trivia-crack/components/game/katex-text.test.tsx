import React from 'react';
import { render, screen } from '@testing-library/react';
import { KaTeXText } from './katex-text';

describe('KatexText', () => {
  it('renders the katex text', () => {
    render(<KaTeXText text="some text" />);
    expect(screen.getByText('some text')).toBeInTheDocument();
  });
});
