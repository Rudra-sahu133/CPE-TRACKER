# CPE Tracker frontend

The frontend uses Next.js App Router, JavaScript, and Tailwind CSS. The Professionals page reads and writes records through the Express API.

## Start locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run lint` and `npm run build` to check the project.

The Professionals page uses `http://localhost:5000/api` by default. To use another API base URL, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` to the API base ending in `/api`.

## Routes

- `/` — Dashboard
- `/professionals` — Professionals
- `/courses` — Courses
- `/licenses` — Licenses
- `/certificates` — Certificates
- `/audit-logs` — Audit Logs

Dashboard figures and activity are sample layout content. Professionals are loaded from MongoDB through the backend. No license or certificate is verified by this frontend.
