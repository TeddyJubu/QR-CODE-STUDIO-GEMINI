# 🚀 QR Code Studio - Deployment Guide

A complete guide for developing, testing, and deploying your QR Code Studio application.

---

## 📋 Table of Contents

1. [Local Development](#-local-development)
2. [Testing Before Deployment](#-testing-before-deployment)
3. [Deployment Options](#-deployment-options)
   - [Option A: Vercel (Recommended - Easiest)](#option-a-vercel-recommended---easiest)
   - [Option B: Netlify](#option-b-netlify)
   - [Option C: Docker + Any Cloud Provider](#option-c-docker--any-cloud-provider)
   - [Option D: GitHub Pages](#option-d-github-pages)
4. [CI/CD Setup](#-cicd-setup)
5. [Environment Variables](#-environment-variables)
6. [Troubleshooting](#-troubleshooting)

---

## 🛠 Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Create or edit .env.local and add your API key:
# GEMINI_API_KEY=your_gemini_api_key_here

# 3. Start development server
npm run dev

# Your app will be available at http://localhost:5173
```

### Development Workflow

```bash
# Start dev server with hot reload
npm run dev

# Build for production (test the build locally)
npm run build

# Preview production build locally
npm run preview
```

---

## ✅ Testing Before Deployment

### 1. Local Production Build Test

```bash
# Build the production bundle
npm run build

# Preview the production build
npm run preview

# Visit http://localhost:4173 to test
```

### 2. Docker Build Test

```bash
# Build Docker image
docker build -t qr-code-studio .

# Run container
docker run --rm -p 8080:80 qr-code-studio

# Visit http://localhost:8080 to test
```

---

## 🌐 Deployment Options

### Option A: Vercel (Recommended - Easiest)

**Best for:** Quick deployments, automatic CI/CD, free tier

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Deploy

```bash
# First time deployment (follow prompts)
vercel

# Production deployment
vercel --prod
```

#### Step 3: Set Environment Variables

```bash
# Add your API key via CLI
vercel env add GEMINI_API_KEY production

# Or through Vercel Dashboard:
# 1. Go to vercel.com/dashboard
# 2. Select your project
# 3. Settings > Environment Variables
# 4. Add GEMINI_API_KEY
```

#### Step 4: Auto-Deploy on Git Push

```bash
# Link your GitHub repo in Vercel Dashboard
# Every push to main will auto-deploy!
```

#### Continuous Development with Vercel

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin main

# Vercel automatically deploys! ✨
# Check deployment status at vercel.com/dashboard
```

---

### Option B: Netlify

**Best for:** Static sites, form handling, serverless functions

#### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### Step 2: Create netlify.toml Configuration

```bash
cat > netlify.toml << 'EOF'
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF
```

#### Step 3: Deploy

```bash
# Login to Netlify
netlify login

# Initialize and deploy
netlify init

# Deploy to production
netlify deploy --prod
```

#### Step 4: Set Environment Variables

```bash
# Via Netlify CLI
netlify env:set GEMINI_API_KEY your_api_key_here

# Or through Netlify Dashboard:
# Site settings > Environment variables
```

#### Continuous Development with Netlify

```bash
# After initial setup, just push to Git
git add .
git commit -m "Your changes"
git push origin main

# Netlify auto-deploys from GitHub!
```

---

### Option C: Docker + Any Cloud Provider

**Best for:** Full control, any cloud provider (AWS, GCP, Azure, DigitalOcean)

#### Docker Compose Setup (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  qr-code-studio:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

#### Deploy to Various Platforms

##### **AWS Elastic Beanstalk**

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p docker qr-code-studio

# Create environment and deploy
eb create qr-code-studio-prod
eb deploy
```

##### **Google Cloud Run**

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/qr-code-studio

# Deploy to Cloud Run
gcloud run deploy qr-code-studio \
  --image gcr.io/YOUR_PROJECT_ID/qr-code-studio \
  --platform managed \
  --allow-unauthenticated
```

##### **DigitalOcean App Platform**

```bash
# Install doctl
brew install doctl  # macOS

# Authenticate
doctl auth init

# Deploy (using Dockerfile)
doctl apps create --spec .do/app.yaml
```

Create `.do/app.yaml`:

```yaml
name: qr-code-studio
services:
  - name: web
    dockerfile_path: Dockerfile
    source_dir: /
    github:
      repo: YOUR_USERNAME/QR-CODE-STUDIO-GEMINI
      branch: main
      deploy_on_push: true
    http_port: 80
    routes:
      - path: /
```

---

### Option D: GitHub Pages

**Best for:** Free hosting, simple static sites

#### Step 1: Install gh-pages

```bash
npm install --save-dev gh-pages
```

#### Step 2: Update package.json

Add these scripts and homepage:

```json
{
  "homepage": "https://YOUR_USERNAME.github.io/QR-CODE-STUDIO-GEMINI",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

#### Step 3: Update vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/QR-CODE-STUDIO-GEMINI/'  // Add your repo name
})
```

#### Step 4: Deploy

```bash
npm run deploy
```

#### Continuous Development with GitHub Pages

```bash
# Make changes, then deploy
npm run deploy

# Or automate with GitHub Actions (see CI/CD section)
```

---

## 🔄 CI/CD Setup

### GitHub Actions - Auto-Deploy to Vercel

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitHub Actions - Build and Test

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Run tests (if you add them)
        run: npm test
        continue-on-error: true
```

### GitHub Actions - Deploy to Netlify

Create `.github/workflows/netlify-deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './dist'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 🔐 Environment Variables

### Required Variables

- `GEMINI_API_KEY`: Your Google Gemini API key

### Setting Variables by Platform

#### Local Development
```bash
# Create .env.local file
echo "GEMINI_API_KEY=your_key_here" > .env.local
```

#### Vercel
```bash
vercel env add GEMINI_API_KEY
```

#### Netlify
```bash
netlify env:set GEMINI_API_KEY your_key_here
```

#### GitHub Actions
```bash
# Go to: Repository Settings > Secrets and variables > Actions
# Add: GEMINI_API_KEY
```

#### Docker
```bash
# Option 1: Build-time (bakes into image)
docker build --build-arg GEMINI_API_KEY=your_key .

# Option 2: Runtime (recommended for production)
docker run -e GEMINI_API_KEY=your_key -p 8080:80 qr-code-studio
```

---

## 🐛 Troubleshooting

### Build Fails Locally

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variable Not Working

```bash
# Check if .env.local exists and has correct format
cat .env.local

# Ensure no spaces around =
# Correct: GEMINI_API_KEY=abc123
# Wrong: GEMINI_API_KEY = abc123
```

### Docker Build Fails

```bash
# Check .dockerignore
cat .dockerignore

# Ensure .env.local is NOT ignored if you want it baked in
# Or pass it at runtime with -e flag
```

### Port Already in Use

```bash
# Find process using port
lsof -ti:5173

# Kill the process
kill -9 $(lsof -ti:5173)

# Or use a different port
npm run dev -- --port 3000
```

### Deployment URL Shows 404

- **Vercel/Netlify**: Check that build command is `npm run build` and publish directory is `dist`
- **GitHub Pages**: Ensure `base` in vite.config.ts matches your repo name
- **Docker**: Verify nginx is serving from `/usr/share/nginx/html`

---

## 📝 Recommended Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Start dev server
npm run dev

# 4. Make changes and test

# 5. Test production build
npm run build && npm run preview

# 6. Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature

# 7. Create Pull Request on GitHub

# 8. After PR is merged, it auto-deploys!
```

### Quick Deploy to Production

```bash
# Option 1: If using Vercel/Netlify with Git integration
git add .
git commit -m "Your changes"
git push origin main
# ✨ Auto-deploys!

# Option 2: If using CLI deployment
npm run build
vercel --prod  # or: netlify deploy --prod

# Option 3: Docker
docker build -t qr-code-studio .
docker push your-registry/qr-code-studio:latest
# Then deploy to your cloud provider
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| Preview production build | `npm run preview` |
| Deploy to Vercel | `vercel --prod` |
| Deploy to Netlify | `netlify deploy --prod` |
| Build Docker image | `docker build -t qr-code-studio .` |
| Run Docker container | `docker run -p 8080:80 qr-code-studio` |

---

## 🚦 Getting Started Checklist

- [ ] Set up local development environment
- [ ] Add `.env.local` with API key
- [ ] Test locally with `npm run dev`
- [ ] Test production build with `npm run preview`
- [ ] Choose deployment platform (Vercel recommended)
- [ ] Set up GitHub repository
- [ ] Configure CI/CD (GitHub Actions)
- [ ] Deploy to production
- [ ] Set up environment variables in production
- [ ] Test production deployment
- [ ] Document any custom configuration

---

**Need help?** Check the [troubleshooting section](#-troubleshooting) or open an issue on GitHub.

**Happy deploying! 🎉**