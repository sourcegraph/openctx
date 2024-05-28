
export type Finding = {
    id: number,                 // 1234567
    ref: string,                // "refs/pull/1234/merge"
    first_seen_scan_id: string, // 1234
    syntactic_id: string,       // "440eeface888e78afceac3dc7d4cc2cf"
    match_based_id: string,     // "440eeface888e78afceac3dc7d4cc2cf"
    state: string,              // "unresolved"
    repository: {
        name: string,           // "semgrep"
        url: string             // "https://github.com/semgrep/semgrep"
    },
    line_of_code_url: string,   // "https://github.com/semgrep/semgrep/blob/39f95450a7d4d70e54c9edbd109bed8210a36889/src/core_cli/Core_CLI.ml#L1"
    triage_state: string,       // "untriaged"
    severity: string,           // "medium"
    confidence: string,         // "medium"
    categories: Array<string>,  // ["security"]
    created_at: string,         // "2020-11-18T23:28:12.391807Z"
    relevant_since: string,     // "2020-11-18T23:28:12.391807Z"
    rule_name: string,          // "typescript.react.security.audit.react-no-refs.react-no-refs",
    rule_message: string,       // "`ref` usage found. refs give direct DOM access and may create a possibility for XSS, which could cause\nsensitive information such as user cookies to be retrieved by an attacker. Instead, avoid direct DOM\nmanipulation or use DOMPurify to sanitize HTML before writing it into the page.\n",
    location: {
        file_path: string,      // "frontend/src/corpComponents/Code.tsx",
        line: number,           // 120
        column: number,         // 8
        end_line: number,       // 124
        end_column: number,     // 16
    },
    sourcing_policy: {
        id: number,             // 120
        name: string,           // "Default Policy",
        slug: string            // "default-policy"
    },
    triaged_at: string,         // "2020-11-19T23:28:12.391807Z",
    triage_comment: string,     // "This finding is from the test repo",
    triage_reason: string,      // "acceptable_risk",
    state_updated_at: string,   // "2020-11-19T23:28:12.391807Z",
    rule: {
        name: string,           // "html.security.plaintext-http-link.plaintext-http-link",
        message: string,        // "This link points to a plaintext HTTP URL. Prefer an encrypted HTTPS URL if possible.",
        confidence: string,     // "high",
        category: string,       // "security",
        subcategories: Array<string>,
        vulnerability_classes: Array<string>,
        cwe_names: Array<string>,
        owasp_names: Array<string>
    },
    assistant: {
        autofix: {
            fix_code: string,       // "cookie.setHttpOnly(true);\nresponse.addCookie(cookie);",
            explanation: string,    // "This fix requires an additional library to be imported."
        },
        autotriage: {
            verdict: string,        // "false_positive",
            reason: string,         // "The matched code is used for a non-security related feature."
        },
        component: {
            tag: string,            // "user data",
            risk: string,           // "high"
        }
    }
}

export type Findings = Finding[]

export function urlfor(depl: string, repo: string, fnum: number | null = null): string {
    const host = 'https://semgrep.dev'
    const qs = new URLSearchParams({repo:repo}).toString()
    return !fnum ? `${host}/orgs/${depl}/findings?${qs}` :
                   `${host}/orgs/${depl}/findings/${fnum}?${qs}`
}