import React from 'react';
import { Select } from '@mantine/core';
import useThemeStore from './theme.store';

const ThemeSwitcher: React.FC = () => {
	const { currentTheme, switchTheme } = useThemeStore();

	const themeOptions = [
		{ value: 'light-theme', label: 'Light Theme' },
		{ value: 'dark-theme', label: 'Dark Theme' },
	];

	const handleThemeChange = (themeSlug: string) => {
		switchTheme(themeSlug);
	};

	return (
		<Select
			placeholder="Pick a theme"
			value={currentTheme.slug}
			onChange={handleThemeChange}
			data={themeOptions}
			sx={{
				position: 'absolute',
			}}
		/>
	);
};

export default ThemeSwitcher;
