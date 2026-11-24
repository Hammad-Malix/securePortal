# Aegis backend setup

## 1. Configure MySQL

Create the database schema in MySQL Workbench or the MySQL CLI:

```powershell
Get-Content .\schema.sql | mysql -u root -p
```

If you already created the database using the older schema, run
`migrations/001_portal_integration.sql` once instead of recreating the database:

```powershell
Get-Content .\migrations\001_portal_integration.sql | mysql -u root -p aegis_secure_portal
```
The migration adds record summaries/checksums, account status, and classification
support required by the frontend.

## 2. Configure and start the API

Set the database credentials and a private random `JWT_SECRET` in `backend/.env`.
Use `.env.example` as a reference; do not commit `.env`.

```powershell
cd "F:\UNI\SEMESTER 7\Project\InfoSec\backend"
npm install
npm run dev
```

The API listens on port 5000 by default. Check the API and database connection at
`http://localhost:5000/api/health`.

On an empty `users` table the server creates these demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@aegis.io` | `Admin@123` |
| Manager | `manager@aegis.io` | `Manager@123` |
| Staff | `staff@aegis.io` | `Staff@123` |

During local development, the MFA challenge code is returned to the frontend for
testing. Do not expose that behavior in a production deployment.

## 3. Start the frontend

In another PowerShell window:

```powershell
cd "F:\UNI\SEMESTER 7\Project\InfoSec\secure-portal"
npm install
npm run dev
```

The frontend defaults to `http://localhost:5000/api`. Set
`VITE_API_BASE_URL` in the frontend environment if the API runs elsewhere.
