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
  const [mode, setMode] = useState<ColorMode>(() => {
    // Check local storage or system preference
    const savedMode = localStorage.getItem('themeMode') as ColorMode | null;
    if (savedMode) return savedMode;
    return prefersDarkMode ? 'dark' : 'light';
  });

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
            }),
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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
