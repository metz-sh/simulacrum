export const enum CompilerErrorCode {
	UNKNOWN = 'UNKNOWN',
	PRIVATE_PUBLIC_ACCESS = 'PRIVATE_PUBLIC_ACCESS',
	NO_SUPER = 'NO_SUPER',
	UNINITIALIZED_ARGUMENTS_PROVIDED_FOR_INJECTABLE_CONSTRUCTOR = 'NO_ARGUMENTS_FOR_INJECTABLE_CONSTRUCTOR',
	NO_ENTRYPOINT = 'NO_ENTRYPOINT',
	MULTIPLE_ENTRYPOINTS = 'MULTIPLE_ENTRYPOINTS',
	STORING_PROMISE_FROM_PUBLIC_METHOD = 'STORING_PROMISE_FROM_PUBLIC_METHOD',
	TABLE_VIEW_TOO_MANY_SOURCES = 'TABLE_VIEW_TOO_MANY_SOURCES',
	TABLE_VIEW_TOO_FEW_SOURCES = 'TABLE_VIEW_TOO_FEW_SOURCES',
	MALFORMED_FLOW_TYPE = 'MALFORMED_FLOW_TYPE',
}

export const CompilerErrorCodeDocLinks: { [key in CompilerErrorCode]: string } = {
	[CompilerErrorCode.UNKNOWN]: 'https://docs.metz.sh/',
	[CompilerErrorCode.PRIVATE_PUBLIC_ACCESS]: 'https://docs.metz.sh/advanced/access-modifiers',
	[CompilerErrorCode.NO_ENTRYPOINT]: 'https://docs.metz.sh/fundamentals/stories#entrypoint',
	[CompilerErrorCode.MULTIPLE_ENTRYPOINTS]:
		'https://docs.metz.sh/fundamentals/stories#entrypoint',
	[CompilerErrorCode.STORING_PROMISE_FROM_PUBLIC_METHOD]: 'https://docs.metz.sh/',
	[CompilerErrorCode.NO_SUPER]: 'https://docs.metz.sh/',
	[CompilerErrorCode.TABLE_VIEW_TOO_MANY_SOURCES]:
		'https://metz.canny.io/bugs-and-issues/p/app-breaks-when-it-cant-know-which-method-is-being-called-at-compile-time',
	[CompilerErrorCode.TABLE_VIEW_TOO_FEW_SOURCES]:
		'https://metz.canny.io/bugs-and-issues/p/app-breaks-when-it-cant-know-which-method-is-being-called-at-compile-time',
	[CompilerErrorCode.UNINITIALIZED_ARGUMENTS_PROVIDED_FOR_INJECTABLE_CONSTRUCTOR]:
		'https://metz.canny.io/bugs-and-issues/p/app-breaks-when-it-cant-know-which-method-is-being-called-at-compile-time',
	[CompilerErrorCode.MALFORMED_FLOW_TYPE]:
		'https://metz.canny.io/bugs-and-issues/p/app-breaks-when-it-cant-know-which-method-is-being-called-at-compile-time',
};

export const CompilerErrorCodeAdditionalMessages: { [key in CompilerErrorCode]: string[] } = {
	[CompilerErrorCode.UNKNOWN]: [],
	[CompilerErrorCode.PRIVATE_PUBLIC_ACCESS]: [
		`This is not allowed because private methods are hidden in playground whereas public ones are not.`,
		`Private methods are recommended to be pure, if that's not the case, please remove the 'private' modifier.`,
	],
	[CompilerErrorCode.NO_ENTRYPOINT]: [
		`Please select a public method of the class you want to run.`,
		`Without this the story doens't get to have a beginning.`,
	],
	[CompilerErrorCode.MULTIPLE_ENTRYPOINTS]: [
		`We currently only support stories with a single beginning and are working on to add support for parallel flows.`,
		`If you didn't want to start two things parallely, but rather wanted to orchestrate, please do that in your main code.`,
	],
	[CompilerErrorCode.STORING_PROMISE_FROM_PUBLIC_METHOD]: [
		`Storing promises returned from public methods is not supported.`,
		`If you want to orchestrate an async flow, please use async/await.`,
	],
	[CompilerErrorCode.NO_SUPER]: [
		`We inject parent class behaviour into classes inheriting them, which means we can't mix and match.`,
		`You are free to override the method however way you want but can't override it and depend on parent class at the same time.`,
	],
	[CompilerErrorCode.TABLE_VIEW_TOO_MANY_SOURCES]: [
		`@Table represents a database view and hence it can't have multiple sources of data.`,
	],
	[CompilerErrorCode.TABLE_VIEW_TOO_FEW_SOURCES]: [],
	[CompilerErrorCode.UNINITIALIZED_ARGUMENTS_PROVIDED_FOR_INJECTABLE_CONSTRUCTOR]: [
		`The runtime handles construction of '@Injectable' classes and hence doesn't know what arguments to provide.`,
		`You can still have arguments in your constructor but they all need to have an initializer.`,
	],
	[CompilerErrorCode.MALFORMED_FLOW_TYPE]: [
		`This usually happens when you are passing around the flow object and the type information got lost somewhere along the way.`,
		`This can also happen if you created a generic Flow or passed something other than your class object.`,
	],
};
