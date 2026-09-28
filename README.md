# KikoLink Production

Stack:
- Node.js + Express
- PostgreSQL
- Prisma ORM
- express-session + PostgreSQL session store
- bcrypt password hashing
- Helmet + rate limiting
- Premium minimalist frontend

## Jalankan lokal

1. Copy `.env.example` menjadi `.env`.
2. Isi `OWNER_PASSWORD` dengan password owner yang kamu inginkan.
3. Pastikan PostgreSQL aktif.
4. Jalankan:
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run seed
   npm start

Buka http://localhost:3000

## Docker

docker compose up --build

Untuk deployment publik, ganti:
- SESSION_SECRET
- password PostgreSQL
- OWNER_PASSWORD
- gunakan HTTPS/reverse proxy
- backup PostgreSQL secara berkala

## Catatan follow/subscribe

`followGate` pada aplikasi ini adalah gate akses setelah login; aplikasi tidak boleh mengklaim user benar-benar follow/subscribe jika belum ada verifikasi dari API platform yang bersangkutan. Untuk verifikasi nyata, tambahkan OAuth/API resmi platform tersebut di backend.

## Struktur

public/
  index.html
  styles.css
  app.js
prisma/
  schema.prisma
  seed.js
server.js
Dockerfile
docker-compose.yml
.env.example
package.json
