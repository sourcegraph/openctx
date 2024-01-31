
interface Languages { [key: string]: string[] }

const languages: Languages = {
    c: ['.c', '.cxx'],
    cpp: ['.h', '.hpp', '.cpp', '.cxx'],
    dart: ['.dart'],
    elixir: ['.exs'],
    golang: ['.go'],
    haskell: ['.hs'],
    java: ['.java'],
    javascript: ['.js', '.jsx'],
    markdown: ['.md'],
    python: ['.py'],
    rust: ['.rs'],
    ruby: ['.rb'],
    swift: ['.swift'],
    typescript: ['.ts', '.tsx'],
}
const shortforms: Languages = {
    py: languages.python,
    js: languages.javascript,
    ts: languages.typescript,
}


export const filetype = function (platform: string): string[] {
  return (languages[platform] ?? shortforms[platform]) || []
}
