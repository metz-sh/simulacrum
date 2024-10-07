import { Theme } from './themes/theme.interface';
import darkTheme from './themes/dark/dark-theme';
import lightTheme from './themes/light/light-theme';

class ThemeManager {
	private themes: Map<string, Theme> = new Map();

	constructor() {
		this.themes.set(lightTheme.slug, lightTheme);
		this.themes.set(darkTheme.slug, darkTheme);
	}

	getTheme(slug: string): Theme {
		const theme = this.themes.get(slug);
		if (!theme) {
			throw new Error(`Theme with slug "${slug}" not found.`);
		}
		return theme;
	}

	getAllThemes(): Theme[] {
		return Array.from(this.themes.values());
	}
}

export default new ThemeManager();
