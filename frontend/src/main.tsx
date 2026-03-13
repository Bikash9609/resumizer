import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import './index.css';
import App from './App';

const theme = createTheme({
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  primaryColor: 'violet',
  primaryShade: 5,
  defaultRadius: 'md',
  colors: {
    violet: [
      '#f3f0ff', '#e5dbff', '#d0bfff', '#b197fc',
      '#9775fa', '#845ef7', '#7950f2', '#7048e8',
      '#6741d9', '#5f3dc4',
    ],
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </StrictMode>,
);
