# Hiveon Frontend

React frontend for Hiveon Agile Project Management System.

## Backend

- Base API: `https://hiveon-agile-project-management.onrender.com/api`
- Swagger: `https://hiveon-agile-project-management.onrender.com/swagger`

## Environment Variables

Create a `.env` file (or set this in Vercel/Netlify):

```env
REACT_APP_API_BASE_URL=https://hiveon-agile-project-management.onrender.com/api
```

Notes:
- This frontend uses Create React App, so runtime env vars must start with `REACT_APP_`.
- Google OAuth login/signup buttons use `REACT_APP_API_BASE_URL + /auth/google`.

## Local Development

```bash
npm install
npm start
```

## Production Build

```bash
npm run build
```

## Deployment Checklist

1. Set `REACT_APP_API_BASE_URL` in your hosting platform.
2. Deploy frontend to Vercel or Netlify.
3. Add deployed frontend origin to backend CORS policy.
4. Add deployed frontend origin in Google Cloud OAuth Authorized JavaScript Origins.
