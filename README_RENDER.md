# Render deployment

This project is ready for Render with Django, PostgreSQL, Django Admin, static files, and the Gemini chatbot key from environment variables.

## Render settings

Use these settings when creating the Web Service manually:

- Build Command: `bash build.sh`
- Start Command: `gunicorn dastarkhan_backend.wsgi:application`
- Python version: `3.13.5`

Add a PostgreSQL database in Render and connect it to the web service with `DATABASE_URL`.

## Environment variables

Set these variables in Render:

```text
SECRET_KEY=<generate a long random value>
DEBUG=False
ALLOWED_HOSTS=<your-service-name>.onrender.com,.onrender.com
CSRF_TRUSTED_ORIGINS=https://<your-service-name>.onrender.com
DATABASE_URL=<Render PostgreSQL internal connection string>
GEMINI_API_KEY=<your Google AI Studio key>
GEMINI_MODEL=gemini-2.5-flash
```

## After deploy

Open Render Shell and create the admin user:

```bash
python manage.py createsuperuser
```

Then open:

```text
https://<your-service-name>.onrender.com/admin/
```

Use Django Admin to add menu items, edit prices, approve reviews, and view orders/reservations.
