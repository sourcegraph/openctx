import type { ReactCodeMirrorProps } from '@uiw/react-codemirror'

export function mergeCodeMirrorProps(
    defaults: Omit<ReactCodeMirrorProps, 'value' | 'onChange'>,
    props: Omit<ReactCodeMirrorProps, 'value' | 'onChange'> | undefined,
): Omit<ReactCodeMirrorProps, 'value' | 'onChange'> {
    return {
        ...defaults,
        ...props,
        extensions: [...(defaults.extensions ?? []), ...(props?.extensions ?? [])],
    }
}
