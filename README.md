<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hfF6X4OBK78BhwQHSYiwiFWMQA5DVUly

## Contributor Guidelines

For code style, testing expectations, and PR checklists, see [AGENTS.md](AGENTS.md).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Docker

1. Ensure any required environment files (for example `.env.local`) are present in the project root before building so the values are baked into the bundle.
2. Build the production image:
   `docker build -t qr-code-studio .`
3. Run the container locally:
   `docker run --rm -p 8080:80 qr-code-studio`
4. Open your browser to `http://localhost:8080` to access the deployed bundle.
