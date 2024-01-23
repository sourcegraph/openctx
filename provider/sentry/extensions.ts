
const languages = Object({
    'c': ['.c', '.cxx'],
    'cpp': ['.h', '.hpp', '.cpp', '.cxx'],
    'dart': ['.dart'],
    'elixir': ['.exs'],
    'golang': ['.go'],
    'haskell': ['.hs'],
    'java': ['.java'],
    'javascript': ['.js', '.jsx'],
    'markdown': ['.md'],
    'python': ['.py'],
    'rust': ['.rs'],
    'ruby': ['.rb'],
    'swift': ['.swift'],
    'typescript': ['.ts', '.tsx'],
})
const shortforms = Object({
    'py': languages.python,
    'js': languages.javascript,
    'ts': languages.typescript,
})

export default function filetype(platform: string): string[] {
    return (languages[platform] ?? shortforms[platform]) || []
}