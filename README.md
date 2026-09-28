# KikoLink — Vercel Edition

Ini adalah versi yang memang disusun untuk Vercel + PostgreSQL, bukan server Docker yang dipaksa ke Vercel.

## Deploy
1. Push folder ini ke GitHub.
2. Import repository ke Vercel.
3. Tambahkan database PostgreSQL. Pilihan yang praktis adalah Prisma Postgres atau Supabase.
4. Set environment variables:
   DATABASE_URL
   AUTH_SECRET
   OWNER_USERNAME=KikoEnakTau
   OWNER_PASSWORD=<password owner>
   DISCORD_URL=https://discord.gg/U6sFp89fFa
5. Deploy. Build command menjalankan `prisma generate && prisma migrate deploy && next build`.
6. Setelah database tersedia, seed owner:
   `npm run db:seed`
   (bisa dijalankan lokal dengan environment production/DB yang sesuai).

## Penting
- Jangan masukkan password owner ke Git.
- `AUTH_SECRET` harus random dan panjang.
- Follow/subscribe gate di kode adalah gate akses setelah login; verifikasi follow/subscribe sungguhan membutuhkan API/OAuth platform yang relevan.
- Untuk database Vercel, Prisma Postgres tersedia sebagai integration resmi; Supabase juga tersedia melalui Vercel Marketplace.
