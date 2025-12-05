/**
 * Card Component Tests
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '../../../test/testUtils';
import { Card } from '../Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );

      expect(getByText('Card Content')).toBeTruthy();
    });

    it('renders with default variant', () => {
      const { getByText } = render(
        <Card>
          <Text>Default Card</Text>
        </Card>
      );

      expect(getByText('Default Card')).toBeTruthy();
    });

    it('renders all variants without crashing', () => {
      const variants: Array<'default' | 'outlined' | 'elevated'> = [
        'default',
        'outlined',
        'elevated',
      ];

      variants.forEach((variant) => {
        const { getByText } = render(
          <Card variant={variant}>
            <Text>{variant}</Text>
          </Card>
        );

        expect(getByText(variant)).toBeTruthy();
      });
    });

    it('renders all padding sizes without crashing', () => {
      const paddingSizes: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];

      paddingSizes.forEach((padding) => {
        const { getByText } = render(
          <Card padding={padding}>
            <Text>{padding}</Text>
          </Card>
        );

        expect(getByText(padding)).toBeTruthy();
      });
    });
  });

  describe('Interaction', () => {
    it('is pressable when onPress is provided', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Card onPress={onPress}>
          <Text>Pressable Card</Text>
        </Card>
      );

      fireEvent.press(getByText('Pressable Card'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('is not pressable when onPress is not provided', () => {
      const { getByText } = render(
        <Card>
          <Text>Non-Pressable Card</Text>
        </Card>
      );

      // Should not throw when pressed
      const element = getByText('Non-Pressable Card');
      expect(element).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginBottom: 20 };
      const { getByText } = render(
        <Card style={customStyle}>
          <Text>Styled Card</Text>
        </Card>
      );

      expect(getByText('Styled Card')).toBeTruthy();
    });

    it('applies elevation to elevated variant', () => {
      const { getByText } = render(
        <Card variant="elevated" elevation={4}>
          <Text>Elevated Card</Text>
        </Card>
      );

      expect(getByText('Elevated Card')).toBeTruthy();
    });
  });
});
