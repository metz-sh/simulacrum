export default `
/**
 * Globally available helper module
*/
declare module std {
	/**
	 * @documentation https://docs.metz.sh/flows-102#flowexecutor
	*/
	class FlowExecutor<RT, M> {
		run(): void;
		await(): RT;
	}
	/**
	 * @documentation https://docs.metz.sh/events
	*/
	class ChannelEmitter<T> {
		emit(data: T): void;
	}

	type ScheduledFlow = { flow_type: 'scheduled_flow' }
	type FlowFunction<T extends (...args: any) => any, Schedule> = (Schedule extends Record<any, any> ? ((...params: Parameters<T>) => ScheduledFlow) : ((...params: Parameters<T>) => std.FlowExecutor<ReturnType<T>, T>)) & { readonly __tag: unique symbol }
	type FlowGenerator<T, Schedule> = {
		[key in keyof T]: T[key] extends ((...args: any) => any) ? std.FlowFunction<T[key], Schedule> : never;
	}

	/**
	 * @documentation https://docs.metz.sh/hof
	*/
	function lambda<T extends Function>(fn: T): T

	/**
	 * Halts the flow for specified number of ticks
	 * @param ticks Number of ticks to halt for
	 * @documentation https://docs.metz.sh/standard-library#sleep
	*/
	function sleep(
		ticks: number
	): void

	/**
	 * Gets the current tick of runtime. Equivalent of getting current time.
	 * @documentation https://docs.metz.sh/runtime#tick
	*/
	function currentTick(): number

	/**
	 * This is the equivalent of JavaScript’s Promise.all.
	 * @documentation https://docs.metz.sh/awaiting-flows#std-awaitall
	*/
	function awaitAll<T extends FlowExecutor<any, any>[]>(
		flows: [...T]
	): { [K in keyof T]: T[K] extends FlowExecutor<infer RT, any> ? RT : never }

	/**
	 * This is the equivalent of JavaScript’s Promise.race.
	 * @documentation https://docs.metz.sh/awaiting-flows#std-awaitrace
	*/
	function awaitRace<T extends FlowExecutor<any, any>[]>(
		flows: [...T]
	): T[number] extends FlowExecutor<infer RT, any> ? RT : never

	/**
	 * Logs messages on playground
	 * @documentation https://docs.metz.sh/standard-library#log
	*/
	function log(message?: any, ...optionalParams: any[]): void

	/**
	 * @documentation https://docs.metz.sh/events
	*/
	function createChannelEmitter<T>(slug: string): std.ChannelEmitter<T>;
}



/**
  * Enables class to participate in Dependency Injection and makes it
  * available via \`std.resolve\`
  *
  * @Note But it also means that you can't construct it manually anymore.
  * @documentation https://docs.metz.sh/dependencies-and-scope/dependencies#dependency-injection
*/
declare function Injectable(constructor: Function): void;

/**
  * Marks annotated class as a DatabaseView. Renders the data source as a Relational Table.
  * @documentation https://docs.metz.sh/data-and-views#table-view
*/
declare function Table(columns: string[]): (constructor: Function)=> void;

/**
  * Marks annotated class as a DatabaseView. Renders the data source as a JSON collection.
  * @documentation https://docs.metz.sh/data-and-views#collection-view
*/
declare function Collection(constructor: Function): void;

/**
  * Marks annotated class as a DatabaseView. Renders the data source as a Key-Value Pair.
  * @documentation https://docs.metz.sh/data-and-views#keyvalue-view
*/
declare function KeyValue(constructor: Function): void;


/**
  * Marks members of class which need to be displayed on playground.
  *
  * @Note Has no effect on methods
  * @documentation https://docs.metz.sh/data-and-views
*/
declare function Show(target: Object, propertyKey: string | symbol): void;

`;
