# Deployment Guide

## Overview

`cat-ate-my-source-code` is a **CLI tool**, not a web application. Therefore, it should be:

- ✅ **Published to npm** - For distribution as a Node.js package
- ✅ **Hosted on GitHub** - For source code and releases
- ❌ **NOT deployed to Vercel/Render** - These platforms are for web applications

## Publishing to npm

### Prerequisites

1. Create an npm account at https://www.npmjs.com/signup
2. Login via CLI: `npm login`

### Publishing Steps

1. **Update version** in `package.json`:
   ```bash
   npm version patch  # for bug fixes (1.0.0 -> 1.0.1)
   npm version minor  # for new features (1.0.0 -> 1.1.0)
   npm version major  # for breaking changes (1.0.0 -> 2.0.0)
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Test before publishing**:
   ```bash
   npm test
   ```

4. **Publish to npm**:
   ```bash
   npm publish
   ```

   Or for a dry-run to see what would be published:
   ```bash
   npm publish --dry-run
   ```

### After Publishing

Users can install globally:
```bash
npm install -g cat-ate-my-source-code
```

Or use locally in a project:
```bash
npm install cat-ate-my-source-code
npx cat-ate-my-source-code backup --project my-app
```

## GitHub Setup

### 1. Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `cat-ate-my-source-code`
3. Description: "A pragmatic backup & restore CLI tool for code projects"
4. Choose Public or Private
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"

### 2. Push to GitHub

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/cat-ate-my-source-code.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Create a Release

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0`
4. Release title: `v1.0.0 - Initial Release`
5. Description: Copy from CHANGELOG or describe features
6. Click "Publish release"

This will trigger the GitHub Actions workflow to automatically publish to npm (if you've set up the NPM_TOKEN secret).

## GitHub Actions Setup (Optional)

To enable automatic npm publishing on releases:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add a new secret: `NPM_TOKEN`
3. Get your token from npm: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
4. Create a token with "Automation" type
5. Paste it as the `NPM_TOKEN` secret value

Now, whenever you create a GitHub release, it will automatically publish to npm.

## Why Not Vercel/Render?

- **Vercel**: Designed for frontend applications, serverless functions, and static sites
- **Render**: Designed for web services, APIs, and background workers
- **This project**: A CLI tool that runs locally on users' machines

CLI tools are distributed via:
- npm (Node.js packages)
- Homebrew (macOS)
- Chocolatey (Windows)
- apt/yum (Linux package managers)

## Alternative Distribution Methods

If you want broader distribution:

### Homebrew (macOS)

Create a formula in a Homebrew tap:
```ruby
class CatAteMySourceCode < Formula
  desc "A pragmatic backup & restore CLI tool for code projects"
  homepage "https://github.com/YOUR_USERNAME/cat-ate-my-source-code"
  url "https://registry.npmjs.org/cat-ate-my-source-code/-/cat-ate-my-source-code-1.0.0.tgz"
  # ... formula details
end
```

### Docker

Create a Dockerfile for containerized usage:
```dockerfile
FROM node:20-alpine
RUN npm install -g cat-ate-my-source-code
ENTRYPOINT ["cat-ate-my-source-code"]
```

## Summary

✅ **Do**: Publish to npm, host on GitHub  
❌ **Don't**: Deploy to Vercel/Render (wrong platform type)

