# CI/CD Pipeline Simplification

## What Changed

The complex CI/CD pipeline has been **replaced with a minimal CI workflow** suitable for a boilerplate starter project.

### Before (203 lines)

The previous pipeline included:
- ❌ Lint and type checking
- ❌ Testing with MongoDB and Redis services
- ❌ Code coverage uploads to Codecov
- ❌ Docker image building and pushing to Docker Hub
- ❌ Deployment to Heroku staging
- ❌ Deployment to Heroku production
- ❌ Slack notifications
- ❌ Security scanning with Trivy
- ❌ npm audit checks
- ❌ Required multiple secrets (Docker Hub, Heroku, Slack, Codecov)

**Problems:**
- Too opinionated about deployment platforms
- Required external accounts and secrets to work
- Most stages would fail without proper configuration
- Overwhelming for developers starting a new project

### After (26 lines)

The new simplified workflow includes:
- ✅ Install dependencies (`npm ci`)
- ✅ Lint code (`npm run lint`)
- ✅ Build TypeScript (`npm run build`)

**Benefits:**
- Works out of the box (no secrets required)
- Validates basic code quality
- Non-opinionated about deployment
- Easy to understand and extend
- Developers add what they need

## New Workflow Location

`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

## How to Extend

See [.github/README.md](.github/README.md) for examples of common additions:
- Adding tests
- Running with MongoDB service
- Adding code coverage
- Deploying to various platforms
- Security scanning

## Migration Notes

If you had the old pipeline configured:

1. **Secrets no longer needed:**
   - DOCKER_USERNAME
   - DOCKER_PASSWORD
   - HEROKU_API_KEY
   - HEROKU_APP_NAME_STAGING
   - HEROKU_APP_NAME_PRODUCTION
   - HEROKU_EMAIL
   - SLACK_WEBHOOK_URL
   - CLERK_SECRET_KEY_TEST

2. **Services removed:**
   - Docker Hub integration
   - Heroku deployments
   - Codecov integration
   - Slack notifications
   - Trivy security scanning

3. **What still works:**
   - Basic CI validation on push/PR
   - ESLint checking
   - TypeScript build verification

## Rationale

This is a **boilerplate starter project**, not a production application. Different teams have different needs:

- Some deploy to AWS, others to Vercel, Railway, or Fly.io
- Some use GitHub Packages, others use Docker Hub or ECR
- Some use Slack, others use Discord or email
- Testing strategies vary widely

The new minimal CI:
- ✅ Validates code quality (lint + build)
- ✅ Works immediately without configuration
- ✅ Provides a starting point to build upon
- ✅ Doesn't force specific tools or platforms

Add what you need, when you need it!
