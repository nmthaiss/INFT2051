import { useColorScheme } from 'react-native';

const lightColors = {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#172b4d',
    secondaryText: '#52606d',
    border: '#e6e9ed',
    pressed: '#f0f6ff',
    primary: '#006eff',
    error: '#b42318',
    icons: '#52606d',
};

const darkColors = {
    background: '#121212',
    surface: '#202124',
    text: '#f5f5f5',
    secondaryText: '#aab4c0',
    border: '#3c4043',
    pressed: '#303134',
    primary: '#4794ff',
    error: '#ffb4ab',
    icons: '#f0f6ff',
};

export function useAppTheme() {
    const theme =  useColorScheme() === 'dark' ? 'dark': 'light';
    const dark = theme === 'dark';

    return {
        theme,
        dark,
        colors: dark ? darkColors : lightColors,
    };
}