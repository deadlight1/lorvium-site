DO NOT USE AND DO NOT DOWNLOAD UNSAFE TOOLS.
Do not use rg in Windows.

This repository is public or intended to be public.
No secrets, credentials, tokens, private keys, certificates, signing files, personal data, private support data, or sensitive local configuration may be committed.
This rule applies to current files and commit history. If sensitive data is found in history, rotate the affected secret and clean history deliberately.

Before committing, inspect staged changes for secret-like values and sensitive files.
Do not commit .env files, local.properties, IDE workspace metadata, keystores, signing material, private certificates, or personal/private screenshots.

The site must remain GitHub Pages compatible:
- deployable from the master branch /docs folder
- static only
- plain HTML, CSS, and vanilla JavaScript
- no npm/build tools/frameworks
- no external JavaScript, analytics, cookies, or tracking
- no network requests introduced by site code

All decisions and changes must prioritize security, performance, and scalability.
Always before and after changes, check them against AGENTS.md, and correct discrepancies.
