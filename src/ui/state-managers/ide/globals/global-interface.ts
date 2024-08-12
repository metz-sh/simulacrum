export default `
/**
 * Globally available helper module
*/
declare module std {
	class FlowExecutor<RT, M> {
		run(): void;
		await(): RT;
	}
	class ChannelEmitter<T> {
		emit(data: T): void;
	}

	type ScheduledFlow = { flow_type: 'scheduled_flow' }
	type FlowFunction<T extends (...args: any) => any, Schedule> = (Schedule extends Record<any, any> ? ((...params: Parameters<T>) => ScheduledFlow) : ((...params: Parameters<T>) => std.FlowExecutor<ReturnType<T>, T>)) & { readonly __tag: unique symbol }
	type FlowGenerator<T, Schedule> = {
		[key in keyof T]: T[key] extends ((...args: any) => any) ? std.FlowFunction<T[key], Schedule> : never;
	}

	function lambda<T extends Function>(fn: T): T

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

	function createChannelEmitter<T>(slug: string): std.ChannelEmitter<T>;
}



/**
  * Enables class to participate in Dependency Injection and makes it
  * available via \`std.resolve\`
  *
  * @Note But it also means that you can't construct it manually anymore.
*/
declare function Injectable(constructor: Function): void;

/**
  * Marks annotated class as a DatabaseView. Renders the data source as a Relational Table.
*/
declare function Table(columns: string[]): (constructor: Function)=> void;

/**
  * Marks annotated class as a DatabaseView. Renders the data source as a JSON collection.
*/
declare function Collection(constructor: Function): void;

/**
  * Marks annotated class as a DatabaseView. Renders the data source as a Key-Value Pair.
*/
declare function KeyValue(constructor: Function): void;


/**
  * Marks members of class which need to be displayed on playground.
  *
  * @Note Has no effect on methods
*/
declare function Show(target: Object, propertyKey: string | symbol): void;

`;
