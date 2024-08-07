export {};

declare global {
	declare function Position(x: number, y: number): (...args: any[]) => void;
	declare function Expand(): (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) => void;
}
