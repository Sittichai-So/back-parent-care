# Parent Care Backend

Backend scaffold for Parent Care using Node.js, Express, MongoDB, and Mongoose.

## Project structure

- `src/config` - Database and environment configuration
- `src/interfaces/http` - Route registration and HTTP middlewares
- `src/modules` - Feature-based modules
- `src/utils` - Shared helpers and response normalization

## Run locally

1. Copy `.env.example` to `.env`
2. Fill in your `MONGODB_URI` and `JWT_SECRET`
3. Install dependencies

```bash
npm install
npm run dev
```

## API endpoints

- `/api/auth`
- `/api/users`
- `/api/families`
- `/api/medicines`
- `/api/medication-logs`
- `/api/appointments`
- `/api/notifications`
- `/api/hospitals`
- `/api/uploads`
