import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json'

const { version } = packageJson
export default defineManifest(env => ({
    manifest_version: 3,
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlj3eX64ybepLkrNAVzF/kWd8iv9EVstTcKQ+r6BrL68y+raGAwy3eVAZs5Dj6w5YaiPM3yiRrEPu5RV/C0U3aRwehy69CG05bomF02q72ZXbetYX9V1dXvwAzVwC46ZuYSlgr52wifXrDwIfiI0ARS0TcqFZxjwW9W1gQhAG8ETcKrPTZ520JGLjwE0x45/lIkkvJ8RgDc3rrGlhYxEyBquTYAG7Il5BjOmcpDNw/VUyOgnIPVGkqc8CdsXu9GWEn1LlALp2BWN2iqcjFxpmC92qvK+Itl8C9oEP2OlQBWRoEPTSKmMqlj9Gaud7wadAEs0mU9VG3dCdhIMU0/xn9QIDAQAB',
    name: env.mode === 'development' ? 'OpenCtx [dev]' : 'OpenCtx',
    description: "Enhance your code host's UI with contextual info from your other dev tools.",
    version,

    icons: {
        '32': 'icon-32.png',
        '48': 'icon-48.png',
        '128': 'icon-128.png',
    },
    action: {
        default_title: 'OpenCtx',
        default_icon: {
            '32': 'icon-32.png',
            '48': 'icon-48.png',
            '128': 'icon-128.png',
        },
        default_popup: 'src/options/options.html',
    },
    permissions: ['storage'],
    options_ui: {
        page: 'src/options/options.html',
        open_in_tab: true,
    },
    background: {
        service_worker: 'src/background/background.main.ts',
        type: 'module' as const,
    },
    content_scripts: [
        {
            matches: ['https://github.com/*'],
            js: ['src/contentScript/contentScript.main.ts'],
            run_at: 'document_idle',
        },
    ],
}))
