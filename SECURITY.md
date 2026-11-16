# Security Policy

## Supported versions

Security fixes are released for the latest minor version of the current major release.

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| < 3.0   | :x:                |

If you are on 2.x, please upgrade to the latest 3.x release. See the
[changelog](dist/changelog.md) for breaking changes.

## Reporting a vulnerability

**Please do not report security issues in public GitHub issues, pull requests or discussions.**

Report them privately through GitHub instead:
[Report a vulnerability](https://github.com/smart-on-fhir/client-js/security/advisories/new).

If you cannot use GitHub, email support@smarthealthit.org with "fhirclient security" in the subject.

Please include:

- the affected version(s) of `fhirclient`
- where the code runs (browser, Node, which framework or adapter)
- steps to reproduce, or a proof of concept
- the impact you expect, for example which data or credentials an attacker could get

## What to expect

- We will acknowledge your report within 5 business days.
- We will confirm whether the issue is valid and keep you updated while we work on a fix.
- When the fix is released, we will publish a GitHub Security Advisory and credit you,
  unless you prefer to stay anonymous.

This is a small open-source project maintained by the SMART Health IT team, so please allow
reasonable time for a fix before disclosing the issue publicly.
