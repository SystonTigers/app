/**
 * Badge Component Tests
 */
import React from 'react';
import { render } from '../../../test/testUtils';
import { Badge } from '../Badge';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('renders children text correctly', () => {
      const { getByText } = render(<Badge>New</Badge>);

      expect(getByText('New')).toBeTruthy();
    });

    it('renders with default variant', () => {
      const { getByText } = render(<Badge>Default</Badge>);

      expect(getByText('Default')).toBeTruthy();
    });

    it('renders all variants without crashing', () => {
      const variants: Array<'default' | 'success' | 'warning' | 'error' | 'info'> = [
        'default',
        'success',
        'warning',
        'error',
        'info',
      ];

      variants.forEach((variant) => {
        const { getByText } = render(<Badge variant={variant}>{variant}</Badge>);

        expect(getByText(variant)).toBeTruthy();
      });
    });

    it('renders all sizes without crashing', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

      sizes.forEach((size) => {
        const { getByText } = render(<Badge size={size}>{size}</Badge>);

        expect(getByText(size)).toBeTruthy();
      });
    });
  });

  describe('Styling', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      const { getByText } = render(<Badge style={customStyle}>Styled</Badge>);

      expect(getByText('Styled')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('success badge renders correctly', () => {
      const { getByText } = render(<Badge variant="success">Success</Badge>);

      expect(getByText('Success')).toBeTruthy();
    });

    it('warning badge renders correctly', () => {
      const { getByText } = render(<Badge variant="warning">Warning</Badge>);

      expect(getByText('Warning')).toBeTruthy();
    });

    it('error badge renders correctly', () => {
      const { getByText } = render(<Badge variant="error">Error</Badge>);

      expect(getByText('Error')).toBeTruthy();
    });

    it('info badge renders correctly', () => {
      const { getByText } = render(<Badge variant="info">Info</Badge>);

      expect(getByText('Info')).toBeTruthy();
    });
  });
});
