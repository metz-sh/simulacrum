import { CSSObject, Textarea, TextareaProps } from '@mantine/core';
import { debounce } from 'lodash';
import { forwardRef, useCallback, useEffect, useState } from 'react';

export default forwardRef(function (
	props: {
		text?: string;
		onUpdate: (value?: string) => void;
		validator: (value?: string) => void;
		mantineProps?: TextareaProps;
		errorStyle?: CSSObject;
	},
	ref?: React.ForwardedRef<HTMLTextAreaElement>
) {
	const debouncedUpdate = useCallback(debounce(props.onUpdate, 200), [props.onUpdate]);
	const [value, setValue] = useState(props.text);
	const [errorMessage, setErroMessage] = useState('');

	useEffect(() => {
		setValue(props.text);
	}, [props.text]);

	return (
		<Textarea
			ref={ref}
			size={'xl'}
			variant="unstyled"
			value={value}
			onChange={(event) => {
				const value = event.currentTarget.value;
				setValue(value);
				if (errorMessage) {
					setErroMessage('');
				}
				try {
					props.validator(value);
					debouncedUpdate(value);
				} catch (e: any) {
					setErroMessage(e.message || 'Something went wrong!');
				}
			}}
			minRows={1}
			autosize
			{...props.mantineProps}
			error={errorMessage}
			styles={{
				error: props.errorStyle,
				...props.mantineProps?.styles,
			}}
		/>
	);
});
