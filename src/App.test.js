import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Components/Landing';
import { getRecommendedItemName } from './Components/orderUtils';

test('renders an APK download button on the home page', () => {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );

  const downloadLink = screen.getByRole('link', { name: /download app/i });
  expect(downloadLink).toHaveAttribute('href', '/app-release.apk');
  expect(downloadLink).toHaveAttribute('download', 'app-release.apk');
});

test('prefers the users most ordered item before falling back to the global favourite', () => {
  const userOrders = [
    { order_items: [{ item_name: 'Lemon Tea', qty: 2 }, { item_name: 'Burger', qty: 1 }] },
    { order_items: [{ item_name: 'Lemon Tea', qty: 3 }, { item_name: 'Burger', qty: 1 }] },
    { order_items: [{ item_name: 'Burger', qty: 2 }] }
  ];

  expect(getRecommendedItemName(userOrders)).toBe('Lemon Tea');
  expect(getRecommendedItemName([], 'Burger')).toBe('Burger');
});
