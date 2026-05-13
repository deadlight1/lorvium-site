# Lorvium Site

Static website for Lorvium, an independent software studio. The site is built for GitHub Pages and served from the `docs/` directory on the `master` branch.

## Deployment

- GitHub Pages source: `master` branch, `/docs` folder.
- Custom domain: `lorvium.com`.
- CNAME file: `docs/CNAME`.
- Public URLs:
  - `https://lorvium.com/`
  - `https://lorvium.com/apps/`
  - `https://lorvium.com/apps/minimal-alarm/`
  - `https://lorvium.com/apps/minimal-alarm/privacy-policy/`

## Technical Constraints

- Plain HTML, CSS, and vanilla JavaScript only.
- No React, Next.js, Vue, Svelte, npm build step, external JavaScript, analytics, cookies, or tracking.
- No external assets unless deliberately reviewed and documented.
- All internal links should use root-relative paths, such as `/apps/minimal-alarm/`.
- Everything needed for deployment must live under `docs/`.

## DNS Checklist

For GitHub Pages apex domain support, configure DNS with:

- `A @ 185.199.108.153`
- `A @ 185.199.109.153`
- `A @ 185.199.110.153`
- `A @ 185.199.111.153`
- `CNAME www deadlight1.github.io`

Do not use domain forwarding for `lorvium.com` or `www.lorvium.com`. After DNS is verified in GitHub Pages, enable HTTPS enforcement.

## Security Rules

This repository is public or intended to be public. Never commit secrets or sensitive data, including:

- API keys, access tokens, passwords, private keys, certificates, or signing material.
- `.env` files or local configuration with private values.
- App signing files, keystores, provisioning material, or credentials.
- Personal data, private support messages, unpublished business material, or sensitive screenshots.
- IDE workspace files that may contain local paths, run configurations, or account metadata.

Before committing, inspect staged changes for secrets. If a real secret is ever committed, rotate the secret immediately and clean the git history deliberately.

## Minimal Alarm Privacy Policy

The Google Play privacy policy for Minimal Alarm is published at:

`https://lorvium.com/apps/minimal-alarm/privacy-policy/`

The app behavior and Google Play Data safety form must stay consistent with that policy.
