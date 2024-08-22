import { Keyword, Keywords } from '../compiler-types';
import lodash from 'lodash';

function getChannelSlugTypeMapping(keywords: Keywords) {
	const slugTypeTuples = keywords
		.filter((kw) => kw.channelEmitters.length > 0)
		.flatMap((kw) => kw.channelEmitters.map((ce) => [ce.slug, ce.type] as const));

	const slugTypeMap = new Map(slugTypeTuples);
	const allSlugs = Array.from(slugTypeMap, ([slug]) => `'${slug}'`);

	const allSlugsType = `type AllChannelSlugs = ${allSlugs.length ? allSlugs.join(' | ') : 'never'}`;
	const types = Array.from(slugTypeMap, ([slug, type]) => `Slug extends '${slug}' ? ${type}\n`);
	if (types.length) {
		types.push('never');
	}

	const typeMapping = types.length ? types.join(' : ') : 'never';

	const finalType = `
		${allSlugsType}
		type ChannelSlugTypeMap<Slug extends AllChannelSlugs> = ${typeMapping}
	`;

	return finalType;
}

function getClassNames(keywords: Keywords) {
	const [constructorBased, injectables] = lodash.partition(
		keywords,
		(_) => _.flags.isConstructorBased
	);
	return {
		constructorBased,
		injectables,
	};
}

function createTypeFromKeyword(keyword: Keyword) {
	const typeParameters = keyword.typeParametersLength
		? `<${Array(keyword.typeParametersLength).fill('unknown')}>`
		: '';

	return `${keyword.className}${typeParameters}`;
}

function getInjectableClasses(params: { injectables: Keywords }) {
	if (!params.injectables.length) {
		return `
		type InjectableClasses = never;
		`;
	}
	return `type InjectableClasses = ${params.injectables.map(createTypeFromKeyword).join(' | ')}`;
}

function getAllClasses(params: { constructorBased: Keywords; injectables: Keywords }) {
	const allClasses = [...params.constructorBased, ...params.injectables];
	if (!allClasses.length) {
		return `
		type AllClasses = never;
		`;
	}
	return `type AllClasses = ${allClasses.map(createTypeFromKeyword).join(' | ')}`;
}

function getBaseTypes(keywords: Keywords) {
	const classes = getClassNames(keywords);
	const injectableClasses = getInjectableClasses({
		injectables: classes.injectables,
	});

	const allClasses = getAllClasses(classes);

	return `
	type Constructor<X> = {new (): X}
	${injectableClasses}
	${allClasses}
	`;
}

export function getGlobals(keywords: Keywords) {
	return `
		${getBaseTypes(keywords)}

		${getChannelSlugTypeMapping(keywords)}

		/**
		 * Globally available helper module
		 * @documentation https://docs.metz.sh/standard-library
		*/
		declare module std {
			/**
			 * Resolve an instance of a class as long it's injectable.
			 * @param service
			 * @documentation https://docs.metz.sh/dependencies-and-scope/dependencies#dependency-injection
			*/
			function resolve<T extends InjectableClasses>(
				service: Constructor<T>
			): T

			/**
			 * Creates a new flow for given class and method
			 * @param name Name of the flow
			 * @param name Object of class this flow is for
			 * @param {ScheduleOptions} options Control the schedule of flow. When provided with after, the flow will run after given ticks have elapsed. With every, the flow runs after every time given ticks have elapsed
			 * @documentation https://docs.metz.sh/flows-101
			*/
			function flow<T extends AllClasses, Schedule extends { after: number } | { every: number } | 'immediate' = 'immediate'>(name: string, classInstance: T, schedule: Schedule = 'immediate'): std.FlowGenerator<T, Schedule>

			/**
			 * @documentation https://docs.metz.sh/events
			*/
			function registerChannelListener<Slug extends AllChannelSlugs>(slug: Slug, listener: (data: ChannelSlugTypeMap<Slug>) => std.FlowExecutor<any, any>): () => void;
		}
	`;
}
