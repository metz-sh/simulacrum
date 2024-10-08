import * as themeData from './theme.json';
import { Theme } from '../theme.interface';

const darkTheme: Theme = {
	slug: 'dark-theme',
	getJson(): Record<string, any> {
		return themeData;
	},
};

export default darkTheme;
