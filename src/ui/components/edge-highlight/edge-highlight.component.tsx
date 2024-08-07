import { useHover } from '@mantine/hooks';
import { motion, useAnimate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { EdgeLabelRenderer } from 'reactflow';
import TextAreaComponent from '../text-area/text-area.component';
import { MdArrowBackIos, MdNotes } from 'react-icons/md';
import { ThemeIcon } from '@mantine/core';
import { useCommands } from '../../commands/use-command.hook';
import { StoryState, useStory } from '../../state-managers/story/story.store';
import { EdgeData } from '../base/edge/edge-data.model';
import { useHost } from '../../state-managers/host/host.store';

const selector = (state: StoryState) => ({
	id: state.id,
});

export default function (props: {
	id: string;
	data?: EdgeData;
	edgePath: string;
	labelX: number;
	labelY: number;
	markerStart?: string;
	markerEnd?: string;
}) {
	const { id: storyId } = useStory(selector);

	const edgePath = props.edgePath;
	const { ref: pathRef, hovered: isPathHovered } = useHover();

	const { ref: edgeLabelDivRef, hovered: isEdgeLabelHovered } = useHover();

	const textAreaRef = useRef<HTMLTextAreaElement>(null);

	const [scope, animate] = useAnimate();
	const [labelScope, animateLabel] = useAnimate();
	const [labelIconScope, animateLabelIcon] = useAnimate();

	const {
		edge: { setEdgeLabel },
	} = useCommands();

	const { isEditMode, emitAnalyticsEvent } = useHost((state) => ({
		isEditMode: state.isEditMode,
		emitAnalyticsEvent: state.emitAnalyticsEvent,
	}));

	useEffect(() => {
		if (!props.data?.label) {
			return;
		}
		if (isEdgeLabelHovered) {
			animateLabelIcon(labelIconScope.current, {
				scale: 0,
				opacity: 0,
			});
		} else {
			animateLabelIcon(labelIconScope.current, {
				scale: 1,
				opacity: 0.7,
			});
		}
	}, [isEdgeLabelHovered, props.data]);

	const hovered = isEdgeLabelHovered || isPathHovered;
	useEffect(() => {
		if (hovered) {
			animate(
				scope.current,
				{
					strokeWidth: 3,
					strokeOpacity: 0.7,
				},
				{
					duration: 0.2,
				}
			);

			animateLabel(labelScope.current, {
				opacity: 1,
				scale: 1,
			});
		} else {
			animate(
				scope.current,
				{
					strokeWidth: 0,
					strokeOpacity: 0,
				},
				{
					duration: 0.2,
				}
			);

			animateLabel(labelScope.current, {
				opacity: 0,
				scale: 0,
			});

			textAreaRef.current?.blur();
		}
	}, [hovered, textAreaRef.current]);

	return (
		<>
			<motion.path
				ref={scope}
				initial={{
					strokeWidth: 2,
					fill: 'none',
					stroke: 'url(#hover-edge-gradient)',
					strokeOpacity: 0,
				}}
				d={edgePath}
				markerStart={props.markerStart}
				markerEnd={props.markerEnd}
			/>
			<path
				ref={pathRef as any}
				style={{
					strokeWidth: 60,
					fill: 'none',
				}}
				d={edgePath}
			/>

			<EdgeLabelRenderer>
				<div
					ref={edgeLabelDivRef}
					style={{
						position: 'absolute',
						transform: `translate(-50%, -50%) translate(${props.labelX}px,${props.labelY}px)`,
						pointerEvents: 'all',
					}}
				>
					{
						<motion.div
							initial={{
								width: '40px',
								height: '40px',
								opacity: props.data?.label ? 1 : 0,
								scale: props.data?.label ? 1 : 0,
							}}
							animate={{
								opacity: props.data?.label ? 1 : 0,
								scale: props.data?.label ? 1 : 0,
							}}
							style={{
								position: 'relative',
							}}
						>
							<motion.div
								ref={labelIconScope}
								initial={{
									width: '10px',
									height: '10px',
									opacity: 0.7,
								}}
								style={{
									position: 'absolute',
									left: '80%',
									bottom: '120%',
								}}
							>
								<ThemeIcon color="#2a6db2" variant="outline" size={'sm'}>
									<MdNotes />
								</ThemeIcon>
							</motion.div>
						</motion.div>
					}
				</div>

				<div
					ref={edgeLabelDivRef}
					style={{
						position: 'absolute',
						transform: `translate(-50%, -50%) translate(${props.labelX}px,${props.labelY}px)`,
						pointerEvents: 'all',
					}}
				>
					<motion.div
						ref={labelScope}
						layout
						initial={{
							opacity: 0,
							scale: 0,
						}}
						style={{
							backgroundColor: 'rgb(11,11,19)',
							borderRadius: '10px',
							overflow: 'hidden',
							border: '2px solid #27365940',
						}}
					>
						<TextAreaComponent
							text={props.data?.label}
							mantineProps={{
								pb: 30,
								pl: 16,
								pr: 16,
								placeholder: 'Add text',
								styles: {
									input: {
										color: '#777',
										'&[data-disabled]': {
											backgroundColor: 'inherit',
											color: '#777',
											opacity: 'inherit',
											cursor: 'inherit',
										},
									},
								},
								disabled: !isEditMode,
							}}
							ref={textAreaRef}
							validator={() => {}}
							onUpdate={(text) => {
								setEdgeLabel(storyId, props.data?.trueId || props.id, text);
								emitAnalyticsEvent('edge-label.edited');
							}}
						/>
					</motion.div>
				</div>
			</EdgeLabelRenderer>
		</>
	);
}
