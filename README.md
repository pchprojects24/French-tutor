<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7f294a37-b5b0-427c-8ce5-edeaad30fd03

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

- Build the static site with `npm run build` (Vite is configured with a relative `base` for Pages).
- Publish the `dist/` folder to Pages.
- If `GEMINI_API_KEY` is not provided at build time, the app will fall back to demo content so the UI still works. When you do provide the key, remember it is exposed client-side on Pages.
