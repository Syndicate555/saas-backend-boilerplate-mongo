# GitHub Configuration

## CI Workflow

This repository includes a minimal CI workflow that runs on every push and pull request to the `main` branch.

### What it does:

1. **Install dependencies** - Runs `npm ci` to install packages
2. **Lint** - Runs ESLint to check code quality
3. **Build** - Compiles TypeScript to ensure no type errors

### Customize for your needs:

The workflow is intentionally simple. You can extend it by adding:

- **Tests**: Add `npm test` step
- **Code coverage**: Add coverage reporting
- **Docker builds**: Build and push Docker images
- **Deployment**: Deploy to your hosting platform
- **Security scans**: Add npm audit or Snyk
- **Multiple Node versions**: Test against different Node.js versions

### Example additions:

**Add testing:**
```yaml
- name: Run tests
  run: npm test
```

**Add MongoDB service for testing:**
```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - 27017:27017
```

**Add deployment:**
```yaml
- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: |
    # Your deployment commands here
```

## Why keep it simple?

This is a boilerplate starter - your CI/CD needs will vary based on:
- Your deployment target (AWS, Heroku, Railway, etc.)
- Your testing requirements
- Your team's workflow
- Your security requirements

Start simple and add what you need!
