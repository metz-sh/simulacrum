import * as themeData from './theme.json';
import { Theme } from '../theme.interface';

const lightTheme: Theme = {
	slug: 'light-theme',
	getJson(): Record<string, any> {
		return themeData;
	},
};

export default lightTheme;
