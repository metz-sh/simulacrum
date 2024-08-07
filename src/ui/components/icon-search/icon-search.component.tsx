import React, { useState, useEffect } from 'react';
import {
	TextInput,
	Box,
	SimpleGrid,
	ThemeIcon,
	Switch,
	Text,
	LoadingOverlay,
	HoverCard,
	Flex,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { IconMoonStars, IconSun, IconTrash } from '@tabler/icons-react';
import { ColorVariantMap } from '../../common/color-variant-map';
import IconButtonComponent from '../icon-button/icon-button.component';
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md';

const MAX_ICONS_PER_PAGE = 9;

function getSearchQueryForExistingIcon(iconString?: string) {
	if (!iconString) {
		return '';
	}
	return iconString.substring(iconString.lastIndexOf(':') + 1);
}

function EmptyIconList() {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				border: '2px dashed #333',
				width: '100%',
				height: '220px',
				borderRadius: '10px',
			}}
		>
			<Text color="#777" p={'xl'}>
				Select icons for your node
			</Text>
		</div>
	);
}

function Loading() {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				border: '2px dashed #333',
				width: '100%',
				height: '200px',
				borderRadius: '10px',
				position: 'relative',
			}}
		>
			<LoadingOverlay
				loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
				visible
				overlayColor="#000"
			>
				<Text color="#777" p={'xl'}>
					Searching
				</Text>
			</LoadingOverlay>
		</div>
	);
}

function IconHover(props: { icon: string; children: any }) {
	const displayTitle = props.icon.substring(props.icon.lastIndexOf(':') + 1);
	return (
		<HoverCard
			styles={{
				dropdown: {
					padding: '4px',
					backgroundColor: 'rgb(6,6,12)',
				},
			}}
		>
			<HoverCard.Target>{props.children}</HoverCard.Target>
			<HoverCard.Dropdown>
				<Text size="xs">{displayTitle}</Text>
			</HoverCard.Dropdown>
		</HoverCard>
	);
}

function IconList(props: {
	colorVariant: 'dark' | 'light';
	isLoading: boolean;
	icons: string[];
	onSelect: (iconData?: {
		iconString: string;
		iconColorVariant: keyof typeof ColorVariantMap;
	}) => void;
}) {
	const { icons, onSelect, colorVariant } = props;

	if (props.isLoading) {
		return <Loading />;
	}

	if (!icons.length) {
		return <EmptyIconList />;
	}

	return (
		<SimpleGrid cols={3} spacing={10} p={10}>
			{icons.map((icon, index) => {
				const iconDiv = (
					<Flex justify={'center'}>
						<motion.div
							style={{
								borderRadius: '10px',
								marginBottom: '8px',
								maxHeight: '50px',
								maxWidth: '50px',
							}}
							initial={{
								borderRadius: '10px',
							}}
							key={index.toString()}
							whileHover={{
								scale: 1.1,
								boxShadow: '5px 0 8px #52a4fc40, -5px 0 8px #52a4fc40',
							}}
							whileTap={{
								scale: 1.05,
								boxShadow: '10px 0 15px #52a4fc40, -10px 0 15px #52a4fc40',
							}}
							onClick={() =>
								onSelect({
									iconString: icon,
									iconColorVariant: colorVariant,
								})
							}
						>
							<ThemeIcon
								variant="filled"
								color={ColorVariantMap[colorVariant]}
								size={50}
								radius={6}
								p={4}
							>
								<Icon icon={icon} fontSize={'40px'} pointerEvents={'none'} />
							</ThemeIcon>
						</motion.div>
					</Flex>
				);
				return (
					<IconHover key={`h_${index}`} icon={icon}>
						{iconDiv}
					</IconHover>
				);
			})}
		</SimpleGrid>
	);
}

function PaginatedIcons(props: {
	colorVariant: 'dark' | 'light';
	isLoading: boolean;
	icons: string[];
	onSelect: (iconData?: {
		iconString: string;
		iconColorVariant: keyof typeof ColorVariantMap;
	}) => void;
}) {
	const maxPages = Math.ceil(props.icons.length / MAX_ICONS_PER_PAGE);
	const [page, setPage] = useState(1);

	useEffect(() => {
		setPage(1);
	}, [props.icons]);

	const iconsSlice = props.icons.slice(
		(page - 1) * MAX_ICONS_PER_PAGE,
		(page - 1) * MAX_ICONS_PER_PAGE + MAX_ICONS_PER_PAGE
	);
	const propsForIconsList = {
		...props,
		icons: iconsSlice,
	};
	return (
		<Flex direction={'column'}>
			<Box mah={220} mih={220}>
				<IconList {...propsForIconsList} />
			</Box>
			{props.icons.length > MAX_ICONS_PER_PAGE && (
				<Flex direction={'column'} w={'100%'} align={'center'} gap={5} fz={14}>
					<Text color="#666">
						{page} of {maxPages}
					</Text>
					<Flex w={'100%'} justify={'center'} gap={5}>
						<IconButtonComponent
							onClick={() => setPage(page - 1)}
							minimal={true}
							disabled={page === 1}
							icon={<MdNavigateBefore />}
						/>
						<IconButtonComponent
							onClick={() => setPage(page + 1)}
							minimal={true}
							disabled={page === maxPages}
							icon={<MdNavigateNext />}
						/>
					</Flex>
				</Flex>
			)}
		</Flex>
	);
}

function MenuBar(props: {
	colorVariant: 'dark' | 'light';
	setColorVariant: (param: 'dark' | 'light') => void;
	iconData?: {
		iconString: string;
		iconColorVariant: keyof typeof ColorVariantMap;
	};
	onSelect: (iconData?: {
		iconString: string;
		iconColorVariant: keyof typeof ColorVariantMap;
	}) => void;
	onDelete: () => void;
}) {
	const { colorVariant, setColorVariant } = props;
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: '5px',
				marginBottom: '20px',
			}}
		>
			<Switch
				styles={{
					track: {
						backgroundColor: 'rgb(6,6,12)',
						cursor: 'pointer',
					},
				}}
				checked={colorVariant === 'light'}
				onLabel={<IconSun size="1rem" stroke={1.8} color={'#fff'} />}
				offLabel={<IconMoonStars size="1rem" stroke={1.8} color={'#00A2DD'} />}
				onChange={(event) => {
					const checked = event.currentTarget.checked;
					const colorVariantToSet = checked ? 'light' : 'dark';
					setColorVariant(colorVariantToSet);
					if (props.iconData?.iconString) {
						props.onSelect({
							iconColorVariant: colorVariantToSet,
							iconString: props.iconData?.iconString,
						});
					}
				}}
			/>
			<IconButtonComponent
				icon={<IconTrash size="14px" />}
				onClick={() => {
					props.onSelect(undefined);
					props.onDelete();
				}}
			></IconButtonComponent>
		</div>
	);
}

const IconSearchComponent = (props: {
	iconData?: {
		iconString: string;
		iconColorVariant: keyof typeof ColorVariantMap;
	};
	onSelect: (iconData?: {
		iconString: string;
		iconColorVariant: keyof typeof ColorVariantMap;
	}) => void;
}) => {
	const [searchQuery, setSearchQuery] = useState(
		getSearchQueryForExistingIcon(props.iconData?.iconString)
	);
	const [colorVariant, setColorVariant] = useState(props.iconData?.iconColorVariant || 'dark');

	const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 500);
	const [icons, setIcons] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
		setSearchQuery(event.target.value);
	};

	useEffect(() => {
		if (debouncedSearchQuery) {
			searchIcons(debouncedSearchQuery);
		} else {
			setIcons([]);
		}
	}, [debouncedSearchQuery]);

	const searchIcons = async (query: string) => {
		const apiUrl = `https://api.iconify.design/search\?query\=${encodeURIComponent(query)}\&limit\=999`;

		try {
			setIsLoading(true);
			const response = await fetch(apiUrl);
			const data = await response.json();
			setIcons(data.icons);
		} catch (error) {
			console.error('Error fetching icons:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div>
			<TextInput
				placeholder="Search"
				value={searchQuery}
				onChange={handleSearchChange}
				styles={{
					input: {
						backgroundColor: 'rgb(6,6,12)',
					},
				}}
			/>
			<Box
				mt="md"
				w={300}
				mih={200}
				style={{
					backgroundColor: 'rgb(6,6,12)',
				}}
			>
				<Box>
					<MenuBar
						colorVariant={colorVariant}
						setColorVariant={setColorVariant}
						iconData={props.iconData}
						onSelect={props.onSelect}
						onDelete={() => setSearchQuery('')}
					/>
					<PaginatedIcons
						isLoading={isLoading}
						icons={icons}
						onSelect={props.onSelect}
						colorVariant={colorVariant}
					/>
				</Box>
			</Box>
		</div>
	);
};

export default IconSearchComponent;
