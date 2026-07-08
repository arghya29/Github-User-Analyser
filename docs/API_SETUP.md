# GitHub API Token Setup Guide

To unlock the full features of GitHub User Analyzer (such as Achievements, Productivity charts, and fast response times), you must configure a Personal Access Token.

## Step 1: Create a Personal Access Token (classic)

1. Navigate to [GitHub Token Settings](https://github.com/settings/tokens).
2. Click **Generate new token** -> **Generate new token (classic)**.
3. Set the expiration date (e.g. 90 days).
4. Select the **`read:user`** scope (this is the only permission needed to read public profiles).
5. Click **Generate token** at the bottom of the page.
6. Copy the generated token string immediately.

## Step 2: Configure Environment Variables

1. In the root of your local clone, copy `.env.example` to a new file named `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your token:
   ```env
   GITHUB_TOKEN=ghp_YourTokenHereString
   ```

## Step 3: Run locally
Restart your dev server:
```bash
npm run dev
```
The application will now fetch profile data using the GraphQL gateway.
