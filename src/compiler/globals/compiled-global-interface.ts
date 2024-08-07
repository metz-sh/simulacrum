function getInjectableClasses(params: { injectableClassNames: string[] }) {
	if (!params.injectableClassNames.length) {
		return `
		type InjectableClasses = never;
		`;
	}
	return `type InjectableClasses = ${params.injectableClassNames.join(' | ')}`;
}

function getAllClasses(params: { constructorBased: string[]; injectableClassNames: string[] }) {
	const allClasses = [...params.constructorBased, ...params.injectableClassNames];
	if (!allClasses.length) {
		return `
		type AllClasses = never;
		`;
	}
	return `type AllClasses = ${allClasses.join(' | ')}`;
}

function getBaseTypes(params: { constructorBased: string[]; injectableClassNames: string[] }) {
	const injectableClasses = getInjectableClasses({
		injectableClassNames: params.injectableClassNames,
	});

	const allClasses = getAllClasses(params);

	return `
	type Constructor<X> = {new (): X}
	${injectableClasses}
	${allClasses}
	`;
}

export function getGlobals(params: { constructorBased: string[]; injectableClassNames: string[] }) {
	return `

	interface Window {
		${getBaseTypes(params)}

		/**
		 * Globally available helper module
		*/
		declare module std {
			declare class FlowExecutor<RT, M> {
			 run(): void;
			 await(): RT;
			}
			type ScheduledFlow = { flow_type: 'scheduled_flow' }
			type FlowFunction<T extends (...args: any) => any, Schedule> = (Schedule extends Record<any, any> ? ((...params: Parameters<T>) => ScheduledFlow) : ((...params: Parameters<T>) => std.FlowExecutor<ReturnType<T>, T>)) & { readonly __tag: unique symbol }
			type FlowGenerator<T, Schedule> = {
				[key in keyof T]: T[key] extends ((...args: any) => any) ? std.FlowFunction<T[key], Schedule> : never;
			}

			/**
			 * Resolve an instance of a class as long it's injectable.
			 * @param service
			 * @link https://metz.sh
			*/
			function resolve<T extends InjectableClasses>(
				service: Constructor<T>
			): T

			/**
			 * Halts the flow for specified number of ticks
			 * @param ticks Number of ticks to halt for
			 * @link https://metz.sh
			*/
			function sleep(
				ticks: number
			): void

			/**
			 * Gets the current tick of runtime. Equivalent of getting current time.
			 * @link https://metz.sh
			*/
			function currentTick(): number


			/**
			 * Creates a new flow for given class and method
			 * @param name Name of the flow
			 * @param name Object of class this flow is for
			 * @param {ScheduleOptions} options Control the schedule of flow. When provided with after, the flow will run after given ticks have elapsed. With every, the flow runs after every time given ticks have elapsed
			 * @link https://metz.sh
			*/
			function flow<T extends AllClasses, Schedule extends { after: number } | { every: number } | 'immediate' = 'immediate'>(name: string, classInstance: T, schedule: Schedule = 'immediate'): std.FlowGenerator<T, Schedule>

			function awaitAll<T extends FlowExecutor<any, any>[]>(
				flows: [...T]
			): { [K in keyof T]: T[K] extends FlowExecutor<infer RT, any> ? RT : never }

			function awaitRace<T extends FlowExecutor<any, any>[]>(
				flows: [...T]
			): T[number] extends FlowExecutor<infer RT, any> ? RT : never

			/**
			 * Logs messages on playground
			 * @link https://metz.sh
			*/
			function log(message?: any, ...optionalParams: any[]): void
		}
	}
	`;
}
