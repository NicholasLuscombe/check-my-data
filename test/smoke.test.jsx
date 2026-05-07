import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CheckMyData from '../src/App.jsx';

describe('CheckMyData', () => {
  it('renders without crashing', () => {
    render(<CheckMyData />);
    // The app should render its logo/title text
    expect(screen.getByText(/Check My Data/i)).toBeInTheDocument();
  });
});
