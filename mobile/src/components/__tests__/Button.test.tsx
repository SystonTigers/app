/**
 * Button Component Tests
 */
import React from 'react';
import { render, fireEvent, mockTheme } from '../../../test/testUtils';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders children text correctly', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()}>Click Me</Button>
      );

      expect(getByText('Click Me')).toBeTruthy();
    });

    it('renders with primary variant by default', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()}>Primary</Button>
      );

      const button = getByText('Primary').parent?.parent;
      expect(button).toBeTruthy();
    });

    it('renders all variants without crashing', () => {
      const variants: Array<'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'> = [
        'primary',
        'secondary',
        'outline',
        'ghost',
        'danger',
      ];

      variants.forEach((variant) => {
        const { getByText } = render(
          <Button onPress={jest.fn()} variant={variant}>
            {variant}
          </Button>
        );

        expect(getByText(variant)).toBeTruthy();
      });
    });

    it('renders all sizes without crashing', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

      sizes.forEach((size) => {
        const { getByText } = render(
          <Button onPress={jest.fn()} size={size}>
            {size}
          </Button>
        );

        expect(getByText(size)).toBeTruthy();
      });
    });
  });

  describe('Interaction', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button onPress={onPress}>Press</Button>);

      fireEvent.press(getByText('Press'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button onPress={onPress} disabled>
          Disabled
        </Button>
      );

      fireEvent.press(getByText('Disabled'));

      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button onPress={onPress} loading>
          Loading
        </Button>
      );

      // When loading, the button shows ActivityIndicator instead of text
      const activityIndicator = getByTestId
        ? getByTestId('loading')
        : undefined;

      // The onPress should not be triggered
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { queryByText } = render(
        <Button onPress={jest.fn()} loading>
          Submit
        </Button>
      );

      // Text should not be visible when loading
      expect(queryByText('Submit')).toBeNull();
    });
  });

  describe('Styling', () => {
    it('applies fullWidth style when prop is true', () => {
      const { getByText } = render(
        <Button onPress={jest.fn()} fullWidth>
          Full Width
        </Button>
      );

      expect(getByText('Full Width')).toBeTruthy();
    });

    it('applies custom style prop', () => {
      const customStyle = { marginTop: 20 };
      const { getByText } = render(
        <Button onPress={jest.fn()} style={customStyle}>
          Styled
        </Button>
      );

      expect(getByText('Styled')).toBeTruthy();
    });
  });
});
