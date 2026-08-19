# `@aether/security`

Zero-trust contextual sanitization, W3C Trusted Types policy management, SSR serialization escaping, and anti-CSRF token verification for the Aether framework.

## Key Features

- **Zero-`eval` Guarantee**: Prohibits dynamic string-to-script execution.
- **Contextual URI Sanitization**: Blocks `javascript:`, `vbscript:`, and `data:` schemes.
- **SSR Injection Immunity**: Unicode escaping for `<script>` tag safety.
- **W3C Trusted Types**: Integration with `window.trustedTypes`.
