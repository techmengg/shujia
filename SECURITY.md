# Security policy

## Reporting a vulnerability

If you discover a security issue in shujia — anything that could expose
user data, allow account takeover, bypass authentication / 2FA / rate
limiting, or otherwise compromise the running site — **please do not
open a public issue.**

Instead, email **aingtechmeng@gmail.com** with:

- A short description of the issue
- Steps to reproduce (a proof-of-concept is appreciated but not required)
- Any logs, screenshots, or HTTP traces that help confirm the bug
- Whether the issue is currently exploitable in production at
  [shujia.dev](https://shujia.dev)

You'll get an acknowledgement within **72 hours** during normal weeks.
A public disclosure timeline will be agreed with you before any details
go out.

## What's in scope

- Code in this repository (`web/**`, scripts, prisma migrations)
- The deployed instance at https://shujia.dev
- The authentication, session, and rate-limiting flows
- Database access patterns reachable from API routes
- Token handling (verification, password reset, OAuth state)

## What's out of scope

- Vulnerabilities in third-party services (MangaUpdates, Vercel,
  Resend, Google OAuth, Postgres). Report those upstream.
- Anything requiring physical or social-engineering access to a user's
  device or accounts elsewhere.
- Best-practice nits without a concrete attack (e.g. "this header
  could be tighter") — feel free to open a regular GitHub issue for
  those.

## Recognition

shujia is a solo project with no bug bounty budget, but credible
findings will be credited (with your permission) in the release notes
of the patch that ships the fix.
