import { Button, Popover, Tooltip } from '@mantine/core';
import { FaPlay, FaPause } from 'react-icons/fa';
import { BsSkipEndFill, BsSkipStartFill } from 'react-icons/bs';
import { BiReset } from 'react-icons/bi';
import { BiCodeCurly as IconCode } from 'react-icons/bi';
import { SlSizeFullscreen as IconFullscreen } from 'react-icons/sl';
import './player-controls.css';
import { FlowPlayerProps } from '../../models/flow-player';
import { useEffect, useState } from 'react';
import { useDisclosure, useHover } from '@mantine/hooks';
import { StoryState, useStory } from '../../state-managers/story/story.store';
import { useCommands } from '../../commands/use-command.hook';
import { MdError, MdSettings, MdWarning } from 'react-icons/md';
import { LuScroll } from 'react-icons/lu';
import TipComponent from '../tip/tip.component';
import { useHost } from '../../state-managers/host/host.store';
import { RenderEngine } from '../../services/render-engine/render-engine';
import RenderIfAllowedComponent from '../render-if-allowed/render-if-allowed.component';
import { HiCpuChip } from 'react-icons/hi2';
import PopoverDropdownHolderComponent from '../popover-dropdown-holder/popover-dropdown-holder.component';
import RuntimeConsoleComponent from '../runtime-console/runtime-console.component';
import { motion } from 'framer-motion';

const selector = (state: StoryState) => ({
	flowPlayerProps: state.flowPlayerProps,
	cycleFlowPlayerSpeed: state.cycleFlowPlayerSpeed,
	cycleFlowPlayerMode: state.cycleFlowPlayerMode,
	reset: state.reset,
	isFinished: state.isFinished,
	script: state.script,
	errors: state.errors,
	id: state.id,
	consumeRenderToken: state.consumeRenderToken,
	returnRenderToken: state.returnRenderToken,
});

function isAuto(flowPlayerProps: FlowPlayerProps) {
	return flowPlayerProps.mode === 'auto';
}

function ControlButtons(props: {
	toggleFullscreen: () => Promise<void>;
	setAlert: (alert?: string) => void;
	renderEngine: RenderEngine;
}) {
	const {
		cycleFlowPlayerMode,
		flowPlayerProps,
		isFinished,
		errors,
		script,
		id: storyId,
		consumeRenderToken,
		returnRenderToken,
	} = useStory(selector);

	const {
		modals: { openStoryScriptModal },
		stories: { reset },
	} = useCommands();

	const isErrored = !!errors.length;
	const isDisabled = isErrored || !script.raw.length;
	const { emitAnalyticsEvent } = useHost((state) => ({
		emitAnalyticsEvent: state.emitAnalyticsEvent,
	}));

	return (
		<>
			<Popover closeOnClickOutside={false}>
				<TipComponent text={'Runtime Console'}>
					<Popover.Target>
						<Button size="md" radius={5}>
							<HiCpuChip fontSize={20} />
						</Button>
					</Popover.Target>
				</TipComponent>
				<Popover.Dropdown
					style={{
						backgroundColor: 'rgb(6,3,10)',
						border: '2px solid #27365940',
						borderRadius: '7px',
					}}
				>
					<PopoverDropdownHolderComponent title="Runtime console">
						<RuntimeConsoleComponent />
					</PopoverDropdownHolderComponent>
				</Popover.Dropdown>
			</Popover>
			<TipComponent
				text={
					isErrored
						? 'Please fix errors'
						: !script.raw.length
							? 'Please set story script'
							: 'Edit Story Script'
				}
			>
				<Button
					size="md"
					radius={5}
					onClick={() => {
						openStoryScriptModal(storyId);
					}}
				>
					{isErrored ? (
						<MdError color="#ff4a4a" />
					) : !script.raw?.length ? (
						<MdWarning color="orange" />
					) : (
						<LuScroll />
					)}
				</Button>
			</TipComponent>
			<TipComponent text={isFinished ? 'Flow is complete, please reset' : 'Reset Playground'}>
				<Button
					size="md"
					radius={5}
					disabled={isAuto(flowPlayerProps) || isDisabled}
					onClick={() => {
						reset({
							storyId,
							renderEngine: props.renderEngine,
						});
						emitAnalyticsEvent('flow.reset');
					}}
				>
					<BiReset />
				</Button>
			</TipComponent>
			<TipComponent
				text={
					isFinished
						? 'Flow is complete. Please reset'
						: isDisabled
							? 'Playing is disabled'
							: isAuto(flowPlayerProps)
								? 'Pause'
								: 'Play'
				}
			>
				<Button
					size="md"
					radius={5}
					disabled={isFinished || isDisabled}
					onClick={() => {
						cycleFlowPlayerMode();
						emitAnalyticsEvent('flow.played');
					}}
				>
					{isAuto(flowPlayerProps) ? (
						<FaPause color="teal" />
					) : (
						<motion.div
							style={{
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
							}}
							animate={
								isFinished || isDisabled
									? {}
									: {
											y: -2,
										}
							}
							transition={{
								duration: 0.1,
								type: 'spring',
								bounce: 1,
								damping: 0,
							}}
						>
							<FaPlay color={isFinished || isDisabled ? 'default' : 'orange'} />
						</motion.div>
					)}
				</Button>
			</TipComponent>
			<TipComponent text="Step through">
				<Button
					size="md"
					radius={5}
					disabled={isAuto(flowPlayerProps) || isFinished || isDisabled}
					onClick={() => {
						const token = consumeRenderToken();
						if (!token) {
							console.error('Tried rendering but no token');
							return;
						}
						props.renderEngine.render(token);
						returnRenderToken(token);
						emitAnalyticsEvent('flow.stepped_through');
					}}
				>
					<BsSkipEndFill />
				</Button>
			</TipComponent>
		</>
	);
}

function PlayerControls(props: {
	namespace: string;
	toggleFullscreen: () => Promise<void>;
	renderEngine: RenderEngine;
}) {
	const [tooltipLabel, setTooltipLabel] = useState<string>();
	const { hovered, ref } = useHover();
	return (
		<div className="player_controls">
			<div className="player_control_bar">
				<Tooltip opened={hovered && !!tooltipLabel} label={tooltipLabel}>
					<Button.Group ref={ref}>
						<ControlButtons
							toggleFullscreen={props.toggleFullscreen}
							setAlert={setTooltipLabel}
							renderEngine={props.renderEngine}
						/>
					</Button.Group>
				</Tooltip>
			</div>
		</div>
	);
}

export default PlayerControls;
