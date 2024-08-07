import * as lodash from 'lodash';
import { createNodeIdForMethod } from '../utils/create-node-id';
import { Keyword } from '../../compiler-types';

function getBaseTypes(classNames: string[]) {
	const classes = `type classes = ${classNames.map((c) => `'${c}'`).join(' | ')}`;
	const [firstClass, ...remainingClasses] = classNames;
	const classNameMap =
		`
	type classNameMap<T extends classes> = 
	T extends '${firstClass}' ? ${firstClass} :
	` +
		remainingClasses.map((className) => `T extends '${className}' ? ${className}`).join(':') +
		`:never`;

	return `
	${classes}

	${classNameMap}
	`;
}

export function getStoryHelpers(classNames: string[]) {
	return `
	export {};

	declare global {
		${getBaseTypes(classNames)}

		type Members<T> = { [P in keyof T as T[P] extends Function ? never : P]: T[P] };
		type Methods<T> = { [P in keyof T as T[P] extends Function ? P : never]: T[P] };

		/** Include property keys from T where the property is assignable to U */
		type IncludePropertyKeys<T, U>  = { [P in keyof T]: T[P] extends U ? P : never}[keyof T]
		/** Excludes property keys from T where the property is assignable to U */
		type ExcludePropertyKeys<T, U>  = { [P in keyof T]: T[P] extends U ? never: P}[keyof T]

		/** Includes properties from T where the property is assignable to U */
		type IncludePropertyTypes<T, U> = { [K in IncludePropertyKeys<T, U>]: T[K] }
		/** Excludes properties from T where the property is assignable to U */
		type ExcludePropertyTypes<T, U> = { [K in ExcludePropertyKeys<T, U>]: T[K] }

		/** Makes properties of type T optional where the property is assignable to U */
		type OptionalPropertyType<T, U> = ExcludePropertyTypes<T, U> & Partial<IncludePropertyTypes<T, U>>
		/** Makes properties of type T readonly where the property is assignable to U */
		type ReadonlyPropertyType<T, U> = ExcludePropertyTypes<T, U> & Readonly<IncludePropertyTypes<T, U>>
		
		type Initializers = {
		[key in classes]?: Members<classNameMap<key>>
		}

		/**
		 * The Story object
		 * @typedef {Object} Story
		 * @property {string} journey - All stories belong to a journey. This allows you to create categories
		 * @property {string} title - Title which you will see on playground.
		 * @property {Object} setup - A key can be a class name and the value can be an object representing that class's members
		 * @property {Array} entrypointParameters - If you need to pass paramaters to you entrypoint function
		*/
		type Story<T extends classes, K extends keyof Methods<classNameMap<T>>> = {
		/**
		 All stories belong to a journey. This allows you to create categories.
		*/
		journey: string,
		
		/**
		 Title which you will see on playground.
		*/
		title: string,

		/**
		 * This is an object where a key can be a class name and the value can be an object representing that class's members.
		 * Use this to set up your story with your parameters.
		*/
		setup: Initializers,
		
		/**
			If your entrypoint function takes arguments, pass them as array here.
		*/
		entrypointParameters: Parameters<classNameMap<T>[K]>,
		}

		type Arguments<T extends classes, K extends keyof Methods<classNameMap<T>>> = Parameters<classNameMap<T>[K]>;

		type Setup<T extends classes> = Members<classNameMap<T>>;

		/**
		 * This function creates stories which get rendered on playground
		 * @template ClassName - Entrypoint Class
		 * @template MethodName - Specific method of Class that you want as entrypoint
		 * @param {Story} story
		*/
		function createStory<T extends classes, K extends keyof Methods<classNameMap<T>>>(story: Story<T, K>): void;
	}
	`;
}

export function getFunctionsForEntrypoint(keywords: Keyword[]) {
	const methodMarkedMap = keywords.reduce(
		(acc, cur) => {
			acc[cur.className] = cur.methods.reduce(
				(macc, mcur) => {
					macc[mcur.methodName] = mcur.flags.isMarked;
					return macc;
				},
				{} as Record<string, boolean>
			);
			return acc;
		},
		{} as Record<string, { [key: string]: boolean }>
	);
	let codeString = `
		const methodMarkedMap: Record<string, {[key: string]: boolean}> = ${JSON.stringify(methodMarkedMap)};
		const entryPointsCalled: any[] = [];
		const classMemberSetup: any = {};

		const classMemberSetupProxyHandler = {
			set (target: any, key: string, value: any) {
				const [_, ...className] = target.constructor.name;
				const isMarked = methodMarkedMap[className as string][key];
				if(typeof value === 'function' && isMarked) {
					throw new Error(\`Please don't override public methods.\n\nThey are already compiled and processed, changing them will undo that.\nIf you want, you can move some logic to a private method and override that here.\`)
				}
				
				classMemberSetup[className] = {
					...classMemberSetup[className],
					[key]: value,
				}
			  	return true
			}
		}
	`;

	for (const kw of keywords) {
		codeString += `
			class I${kw.className} {
				${kw.methods
					.filter((_) => _.flags.isMarked)
					.map(
						(method) => `
					${method.methodName}(...params: Arguments<'${kw.className}', '${method.methodName}'> ):void {
						entryPointsCalled.push({
							nodeId: '${createNodeIdForMethod(kw.className, method.methodName)}',
							className: '${kw.className}',
							methodName: '${method.methodName}',
							arguments,
						})
					}
				`
					)
					.join('\n')}
			}
			const ${lodash.camelCase(kw.className)} = new Proxy<${kw.className}>(new I${kw.className}() as any, classMemberSetupProxyHandler);

		`;
	}
	return codeString;
}
