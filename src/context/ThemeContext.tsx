import { createContext, useMemo, useState, useContext, type ReactNode, useEffect } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider, type Theme } from '@mui/material/styles';
import { CssBaseline, useMediaQuery } from '@mui/material';

type ColorMode = 'light' | 'dark';

interface ColorModeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  theme: Theme;
}

const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'light',
  toggleColorMode: () => { },
  theme: createTheme(), // Default theme
});

export const useColorMode = () => useContext(ColorModeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Initialize state from localStorage or system preference
  const [mode, setMode] = useState<ColorMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }
    return prefersDarkMode ? 'dark' : 'light';
  });

  // Persist mode changes to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
              // Light mode palette
              primary: {
                main: '#1976d2',
              },
              background: {
                default: '#f5f5f5',
                paper: '#ffffff',
              },
              text: {
                primary: 'rgba(0, 0, 0, 0.87)',
                secondary: 'rgba(0, 0, 0, 0.6)',
              },
            }
            : {
              // Dark mode palette
              primary: {
                main: '#90caf9',
              },
              background: {
                default: '#121212',
                paper: '#1e1e1e',
              },
              text: {
                primary: '#ffffff',
                secondary: 'rgba(255, 255, 255, 0.7)',
              },
            }),
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontSize: '2.5rem', fontWeight: 600 },
          h2: { fontSize: '2rem', fontWeight: 600 },
          h3: { fontSize: '1.75rem', fontWeight: 600 },
          h4: { fontSize: '1.5rem', fontWeight: 600 },
          h5: { fontSize: '1.25rem', fontWeight: 600 },
          h6: { fontSize: '1rem', fontWeight: 600 },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e1e1e',
                color: mode === 'light' ? '#333333' : '#ffffff',
                boxShadow: mode === 'light' ? '0px 1px 3px rgba(0,0,0,0.12)' : '0px 1px 3px rgba(0,0,0,0.5)',
              }
            }
          }
        }
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={{ ...colorMode, theme }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ColorModeContext.Provider>
  );
};
