import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Components/Landing';

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
