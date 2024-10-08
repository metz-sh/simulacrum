import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme } from './themes/theme.interface';
import ThemeManager from './theme-manager';

interface ThemeStore {
	currentTheme: Theme;
	switchTheme: (themeSlug: string) => void;
}

const useThemeStore = create<ThemeStore>()(
	persist(
		(set) => ({
			currentTheme: ThemeManager.getTheme('dark-theme'), // Default theme
			switchTheme: (themeSlug: string) => {
				try {
					const theme = ThemeManager.getTheme(themeSlug);
					set({ currentTheme: theme });
				} catch (error) {
					if (error instanceof Error) {
						console.error(error.message);
					} else {
						console.error('An unexpected error occurred');
					}
				}
			},
		}),
		{
			name: 'ide-theme',
		}
	)
);

export default useThemeStore;
