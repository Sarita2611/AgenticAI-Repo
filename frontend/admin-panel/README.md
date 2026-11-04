# Admin console

The admin console is a separate Vite/React app from the customer chatbot
portal at `frontend/customer-chatbot-hr-portal/`:

- Admin: `http://localhost:5174`
- Customer portal: `http://localhost:5173`
- Backend Swagger: `http://127.0.0.1:8000/docs`

Run the backend from `backend/` with `uvicorn app.main:app --reload`. In a
separate terminal run this app with `npm install` and `npm run dev`. Set
`VITE_API_URL` in a local `.env` file to point at another backend URL.

Enter `admin` in the customer portal's Sign in form to open this console
directly. You can also open the admin URL and enter a display name. This is
only a local demo gate; the current backend does not have admin roles,
authentication, or authorization. The console can list, add, edit, and delete
users and heroes, and read chat history for a selected user. Use Swagger to
exercise the other backend endpoints. Do not expose this demo UI or API
publicly.
