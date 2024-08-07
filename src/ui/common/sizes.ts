import { nodeTypesWithFixedSizes } from '../ui-types';

export const nodeSizes: { [key in nodeTypesWithFixedSizes]: { width: number; height: number } } = {
	methodNode: {
		width: 300,
		height: 290,
	},
	previewMethodNode: {
		width: 300,
		height: 120,
	},
};

export const gridGap = 100;
