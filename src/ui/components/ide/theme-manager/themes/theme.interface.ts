export interface Theme {
	slug: string;
	getJson(): Record<string, any>;
}
