import './node-debug-console.css';
import { Prism } from '@mantine/prism';
import { parseNonPrimitive } from './utils/parse-non-primitive';

function parseParams(params: any[], paramsNames?: string[]) {
	if (!paramsNames) {
		return params.map((p) => JSON.stringify(p, parseNonPrimitive, 2)).join(',\n');
	}
	const result = paramsNames
		.map((paramName, index) => {
			const param = params[index];
			const name = paramName.split(':')[0];
			const parsedParam = parseNonPrimitive(param);
			return `${name}: ${parsedParam}`;
		})
		.join('\n');

	return result;
}

export default function (props: {
	params?: string[];
	parameters?: { name: string; type: string; text: string }[];
}) {
	const { params, parameters } = props;
	return (
		<div>
			<Prism noCopy language={'tsx'}>
				{params && params.length
					? parseParams(
							params,
							parameters?.map((p) => p.name)
						)
					: 'void'}
			</Prism>
		</div>
	);
}
