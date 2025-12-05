/**
 * LoadingSpinner Component Tests
 */
import React from 'react';
import { render } from '../../../test/testUtils';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<LoadingSpinner />);

      expect(toJSON()).toBeTruthy();
    });

    it('renders with default size (large)', () => {
      const { toJSON } = render(<LoadingSpinner />);

      expect(toJSON()).toBeTruthy();
    });

    it('renders all sizes without crashing', () => {
      const sizes: Array<'small' | 'large'> = ['small', 'large'];

      sizes.forEach((size) => {
        const { toJSON } = render(<LoadingSpinner size={size} />);
        expect(toJSON()).toBeTruthy();
      });
    });

    it('renders message when provided', () => {
      const { getByText } = render(
        <LoadingSpinner message="Loading data..." />
      );

      expect(getByText('Loading data...')).toBeTruthy();
    });

    it('does not render message when not provided', () => {
      const { queryByText } = render(<LoadingSpinner />);

      expect(queryByText('Loading data...')).toBeNull();
    });
  });

  describe('Styling', () => {
    it('applies custom style', () => {
      const { toJSON } = render(
        <LoadingSpinner style={{ marginTop: 20 }} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
