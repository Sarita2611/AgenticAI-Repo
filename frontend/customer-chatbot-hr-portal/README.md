# Customer portal

The existing responsive HR chatbot UI. It runs at `http://localhost:5173` and
uses the API at `http://127.0.0.1:8000` by default. Override the API base URL
with `VITE_API_URL` in a local `.env` file.

Run `npm install` and `npm run dev`. On the Sign in tab, entering the username
`admin` opens the separate admin console at `http://localhost:5174`; set
`VITE_ADMIN_URL` to override it. The username-only sign-in and admin handoff
are for local demonstration only and do not provide authentication or
authorization.
