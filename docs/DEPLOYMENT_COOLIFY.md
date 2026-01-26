# Deploying to Coolify

This guide explains how to deploy the **CoalLogix Frontend** application to a VPS managed by **Coolify**.

## Prerequisites
1.  **Coolify Instance**: You must have a Coolify instance running on your VPS.
2.  **Git Repository**: This project must be pushed to a Git repository (GitHub/GitLab) accessible by your Coolify instance.

## Deployment Steps

### 1. Push Latest Code
Ensure your latest changes (including `Dockerfile` and `nginx.conf`) are pushed to your repository:
```bash
git add .
git commit -m "chore: added production dockerfile and nginx config"
git push
```

### 2. Create Resource in Coolify
1.  Login to your **Coolify Dashboard**.
2.  Go to your **Project** -> **Environment**.
3.  Click **"+ New Resource"**.
4.  Select **"Git Repository"** (Public or Private depending on your repo).
5.  Select this repository branch (e.g., `main`).

### 3. Build Configuration
Coolify should automatically detect the `Dockerfile`. If asked or if you need to configure manually:
-   **Build Pack**: Select **Docker Config** or **Dockerfile**.
-   **Docker File Location**: `/Dockerfile` (Default).
-   **Port**: `80` (This is the port exposed in our Dockerfile).

### 4. Environment Variables
You **MUST** add your environment variables in Coolify for the build to work correctly.
Go to the **Environment Variables** tab of your application in Coolify and add the following keys from your local `.env`:

| Key | Value (Example) |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` |
| `VITE_NAVBAR_TITLE` | `Nababan Cloud` |
| `VITE_COMPANY_NAME` | `Nababan Cloud` |
| `VITE_APP_VERSION` | `Beta.1.2` |

> [!IMPORTANT]
> **Build vs Runtime**: Since this is a Vite (Client-side) app, environment variables are embedded **during the build process**. If you change these variables in Coolify later, you **MUST Redeploy/Rebuild** the application for changes to take effect.

### 5. Deploy
1.  Click **"Deploy"**.
2.  Watch the build logs.
    -   Stage 1: It will install dependencies and run `npm run build`.
    -   Stage 2: It will set up Nginx.
3.  Once "Healthy", click the generated URL to access your application.

## Troubleshooting
-   **White Screen on 404**: Check if `nginx.conf` is correctly copied. It handles the "SPA Catch-all" routing.
-   **Missing Env Vars**: If the footer says "Company Name" instead of your value, verify you added the Env Vars in Coolify **before** clicking Deploy.
