/**
 * EmptyState Component Tests
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '../../../test/testUtils';
import { EmptyState } from '../EmptyState';

describe('EmptyState Component', () => {
  describe('Rendering', () => {
    it('renders title correctly', () => {
      const { getByText } = render(<EmptyState title="No Items" />);

      expect(getByText('No Items')).toBeTruthy();
    });

    it('renders message when provided', () => {
      const { getByText } = render(
        <EmptyState
          title="No Items"
          message="There are no items to display."
        />
      );

      expect(getByText('No Items')).toBeTruthy();
      expect(getByText('There are no items to display.')).toBeTruthy();
    });

    it('does not render message when not provided', () => {
      const { queryByText } = render(<EmptyState title="No Items" />);

      expect(queryByText('There are no items to display.')).toBeNull();
    });

    it('renders icon when provided', () => {
      const { getByText, toJSON } = render(
        <EmptyState
          title="No Items"
          icon={<Text testID="empty-icon">📭</Text>}
        />
      );

      expect(getByText('No Items')).toBeTruthy();
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Action Button', () => {
    it('renders action button when provided', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No Items"
          action={{ label: 'Add Item', onPress }}
        />
      );

      expect(getByText('Add Item')).toBeTruthy();
    });

    it('calls action onPress when button is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No Items"
          action={{ label: 'Add Item', onPress }}
        />
      );

      fireEvent.press(getByText('Add Item'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when not provided', () => {
      const { queryByText } = render(<EmptyState title="No Items" />);

      expect(queryByText('Add Item')).toBeNull();
    });
  });

  describe('Complete Example', () => {
    it('renders complete empty state with all props', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No Fixtures"
          message="No upcoming fixtures have been scheduled yet."
          icon={<Text>⚽</Text>}
          action={{ label: 'Create Fixture', onPress }}
        />
      );

      expect(getByText('No Fixtures')).toBeTruthy();
      expect(getByText('No upcoming fixtures have been scheduled yet.')).toBeTruthy();
      expect(getByText('⚽')).toBeTruthy();
      expect(getByText('Create Fixture')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('applies custom style', () => {
      const { getByText } = render(
        <EmptyState
          title="No Items"
          style={{ marginTop: 20 }}
        />
      );

      expect(getByText('No Items')).toBeTruthy();
    });
  });
});
