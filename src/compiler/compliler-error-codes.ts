export const enum CompilerErrorCode {
	UNKNOWN = 'UNKNOWN',
	PRIVATE_PUBLIC_ACCESS = 'PRIVATE_PUBLIC_ACCESS',
	NO_SUPER = 'NO_SUPER',
	UNINITIALIZED_ARGUMENTS_PROVIDED_FOR_INJECTABLE_CONSTRUCTOR = 'NO_ARGUMENTS_FOR_INJECTABLE_CONSTRUCTOR',
	VIEW_TOO_MANY_SOURCES = 'VIEW_TOO_MANY_SOURCES',
	VIEW_TOO_FEW_SOURCES = 'VIEW_TOO_FEW_SOURCES',
	MALFORMED_FLOW_TYPE = 'MALFORMED_FLOW_TYPE',
	METHOD_CALL_INSIDE_FUNCTION = 'METHOD_CALL_INSIDE_FUNCTION',
}

export const CompilerErrorCodeDocLinks: { [key in CompilerErrorCode]: string } = {
	[CompilerErrorCode.UNKNOWN]: 'https://github.com/metz-sh/simulacrum/issues/new',
	[CompilerErrorCode.PRIVATE_PUBLIC_ACCESS]: 'https://docs.metz.sh/classes',
	[CompilerErrorCode.NO_SUPER]: 'https://docs.metz.sh/classes',
	[CompilerErrorCode.VIEW_TOO_MANY_SOURCES]:
		'https://docs.metz.sh/data-and-views#customizing-how-the-data-is-presented',
	[CompilerErrorCode.VIEW_TOO_FEW_SOURCES]:
		'https://docs.metz.sh/data-and-views#customizing-how-the-data-is-presented',
	[CompilerErrorCode.UNINITIALIZED_ARGUMENTS_PROVIDED_FOR_INJECTABLE_CONSTRUCTOR]:
		'https://docs.metz.sh/dependencies-and-scope/dependencies#dependency-injection',
	[CompilerErrorCode.MALFORMED_FLOW_TYPE]: 'https://docs.metz.sh/flows-102#flowexecutor',
	[CompilerErrorCode.METHOD_CALL_INSIDE_FUNCTION]: 'https://docs.metz.sh/hof',
};

export const CompilerErrorCodeAdditionalMessages: { [key in CompilerErrorCode]: string[] } = {
	[CompilerErrorCode.UNKNOWN]: [],
	[CompilerErrorCode.PRIVATE_PUBLIC_ACCESS]: [
		`This is not allowed because private methods are hidden in playground whereas public ones are not.`,
		`Private methods are recommended to be pure or only depend on other private functions.`,
		`If that's not the case, please remove the 'private' modifier.`,
	],
	[CompilerErrorCode.NO_SUPER]: [
		`We inject parent class behaviour into classes inheriting them, which means we can't mix and match.`,
		`You are free to override the method however way you want, but can't override it and depend on parent class at the same time.`,
	],
	[CompilerErrorCode.VIEW_TOO_MANY_SOURCES]: [`A view can have only one source of data.`],
	[CompilerErrorCode.VIEW_TOO_FEW_SOURCES]: [`A view can have only one source of data.`],
	[CompilerErrorCode.UNINITIALIZED_ARGUMENTS_PROVIDED_FOR_INJECTABLE_CONSTRUCTOR]: [
		`The runtime handles construction of '@Injectable' classes and hence doesn't know what arguments to provide.`,
		`You can still have arguments in your constructor but they all need to have an initializer.`,
	],
	[CompilerErrorCode.MALFORMED_FLOW_TYPE]: [
		`This usually happens when you are passing around the flow object and the type information got lost somewhere along the way.`,
		`This can also happen if you created a generic Flow or passed something other than your class object.`,
	],
	[CompilerErrorCode.METHOD_CALL_INSIDE_FUNCTION]: [
		`After compilation a method is completely transformed, which a function may or may not.`,
		`So if executing a transformed method from a function that may not have been transformed can lead to undefined behaviour.`,
	],
};
