# CPE Tracker frontend

The frontend uses Next.js App Router, JavaScript, and Tailwind CSS. The Professionals page reads and writes records through the Express API.

## Start locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run lint` and `npm run build` to check the project.

Copy `.env.example` to `.env.local` for local development. The frontend uses the same-origin `/api` path, and Next.js proxies those requests to the local backend URL in `BACKEND_API_URL` (default `http://localhost:5000/api`).

## Vercel deployment

Set `BACKEND_API_URL` to `https://cpe-tracker-backend.onrender.com/api` and `NEXT_PUBLIC_API_BASE_URL` to `/api` for the Vercel Production environment, then redeploy. The browser calls Vercel at `/api`; Next.js forwards requests to Render. This keeps the HttpOnly session cookie first-party in the browser. Keep the backend's `FRONTEND_ORIGINS` restricted to the deployed Vercel origin and set Render's `COOKIE_SAME_SITE=lax` (`NODE_ENV=production` keeps the cookie Secure).

## Routes

- `/` — Dashboard
- `/professionals` — Professionals
- `/courses` — Courses
- `/licenses` — Licenses
- `/certificates` — Certificates
- `/audit-logs` — Audit Logs

Dashboard figures and activity are sample layout content. Professionals are loaded from MongoDB through the backend. No license or certificate is verified by this frontend.
