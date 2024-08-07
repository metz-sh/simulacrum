import { ElementType } from '../ui-types';

export const FlowPlayerSpeedValues = ['1x', '2x', '4x', '10x'] as const;

export type FlowPlayerSpeed = ElementType<typeof FlowPlayerSpeedValues>;
export type FlowPlayerMode = 'auto' | 'manual';

export interface FlowPlayerProps {
	speed: FlowPlayerSpeed;
	mode: FlowPlayerMode;
}
