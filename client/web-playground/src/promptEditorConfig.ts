import type { PromptEditorConfig } from '@sourcegraph/prompt-editor'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandLoading,
    CommandSeparator,
} from 'cmdk'

export const PROMPT_EDITOR_CONFIG: PromptEditorConfig = {
    commandComponents: {
        Command: Command,
        CommandEmpty,
        CommandGroup,
        CommandInput,
        CommandItem,
        CommandSeparator,
        CommandList,
        CommandLoading,
    },
}
