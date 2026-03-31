# DealPost Backend (MySQL)

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create your env file:

```bash
copy .env.example .env
```

3. Set MySQL credentials in `.env` and ensure database exists.

4. Configure Cloudflare R2 image storage in `.env`:

```bash
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://your-public-r2-domain.com
IMAGE_MAX_WIDTH=1920
IMAGE_MAX_HEIGHT=1920
IMAGE_WEBP_QUALITY=75
```

Uploaded images are resized and compressed to WebP before being stored in R2.

4.1 Configure Google OAuth in `.env`:

```bash
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

5. Run server:

```bash
npm run dev
```

Server runs at `http://localhost:5000`.

## Frontend Connection

Set frontend env:

```bash
VITE_API_URL=http://localhost:5000/api
```

## Key Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `GET /api/listings`
- `POST /api/listings`
- `PATCH /api/listings/:id`
- `DELETE /api/listings/:id`
- `GET /api/categories`
- `POST /api/messages`
- `GET /api/admin/stats`
- `GET /api/admin/reports`
- `POST /api/admin/users/:id/ban`
- `DELETE /api/admin/listings/:id`
