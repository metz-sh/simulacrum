import { Prism } from '@mantine/prism';
import { parseNonPrimitive } from './utils/parse-non-primitive';

export default function CommonRenderer(props: { params?: any }) {
	const { params } = props;
	return (
		<>
			{
				<Prism noCopy language={'tsx'}>
					{params ? `${parseNonPrimitive(params)}` : 'void'}
				</Prism>
			}
		</>
	);
}
