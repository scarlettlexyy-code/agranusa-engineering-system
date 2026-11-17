# Agranusa Signature Villa — Engineering System
### Arsitektur Terpisah: Google Sheets (Database) ➔ GitHub ➔ Vercel ➔ PWA Builder

Aplikasi sistem pemantauan operasional, proyek Capex, telemetri utilitas energi, dan evaluasi bulanan untuk Engineering Department **Agranusa Signature Villa**.

Sistem ini dirancang secara **terpisah (Separation of Concerns)** sesuai arahan Anda:
- **Database:** Murni berada di **Google Sheets** (13 tab data relasional).
- **Headless Backend:** Dikelola oleh **Google Apps Script (GAS)** hanya sebagai penyedia REST API JSON (tanpa menyimpan file HTML/UI di Google Sheets).
- **Frontend & Hosting:** Dihosting di **Vercel** dengan source control di **GitHub**.
- **Mobile/Desktop App:** 100% **PWA Builder Ready** (mendukung packaging ke Windows MSIX, Android APK/AAB, dan iOS).

---

## 📁 Struktur Repositori

```
agranusa_monthly_report_gas/
├── backend/                       # Headless REST API Google Apps Script (Hanya file .gs)
│   ├── .clasp.json                # Konfigurasi clasp untuk deploy dari terminal
│   ├── appsscript.json            # Manifest runtime V8 & scope Google Sheets / Drive
│   ├── Code.gs                    # Entry point API murni (doGet, doPost, JSON CORS)
│   ├── ApiRouter.gs               # Dispatcher rute aksi API (CRUD, Report, Eval)
│   ├── SheetRepository.gs         # ORM / Data Access Layer 13 Tab Google Sheets
│   ├── ConfigService.gs           # Pengaturan sistem & default tarif energi
│   ├── AuthService.gs             # Verifikasi pengguna & role izin akses
│   ├── DashboardService.gs        # Agregasi data telemetri & executive insights
│   ├── ActivityService.gs         # Modul B: Input harian, mingguan, & multi-teknisi
│   ├── ProjectService.gs          # Modul C: Monitoring Capex, progres, & over budget
│   ├── EnergyService.gs           # Modul D: Daily Usage & Meter Reading calculation
│   ├── PurchaseService.gs         # Modul E: Ringkasan belanja bulanan (Opex)
│   ├── EvaluationService.gs       # Automatic Evaluation Engine deterministik
│   ├── ReportService.gs           # Modul F: Generate laporan & ekspor PDF ke Drive
│   ├── ValidationService.gs       # Validasi integritas data server-side
│   └── AuditService.gs            # Pencatatan riwayat perubahan ke tab AUDIT_LOG
│
├── frontend/                      # Web App Modern (Vercel & PWA Builder Ready)
│   ├── public/
│   │   ├── manifest.json          # Web App Manifest PWA Builder compliant (100% Score)
│   │   ├── sw.js                  # Service Worker (Cache shell, Stale-while-revalidate, Offline)
│   │   ├── offline.html           # Halaman fallback saat tidak ada koneksi internet
│   │   └── icons/                 # Icon SVG, PNG (192, 512, maskable) & screenshot PWA
│   ├── src/
│   │   └── js/
│   │       ├── api.js             # API Client yang terhubung ke proxy Vercel
│   │       └── pwa.js             # PWA installer & event beforeinstallprompt
│   ├── api/
│   │   └── gas.js                 # Vercel Serverless Function (Proxy CORS ke Apps Script)
│   ├── index.html                 # Antarmuka SPA lengkap (Forest Analytics / CloudFork)
│   ├── vercel.json                # Konfigurasi routing Vercel, PWA headers, & proxy
│   ├── vite.config.js             # Konfigurasi build Vite
│   ├── package.json               # Script dev, build, dan dependencies
│   └── .env.example               # Template environment variable URL Apps Script
│
├── .gitignore
└── README.md                      # Panduan lengkap implementasi
```

---

## 🛠️ Alur Implementasi Langkah demi Langkah

```
[ Google Sheets Database ]
           ▲
           │ (Read/Write via API)
[ Google Apps Script (Headless) ]
           ▲
           │ (HTTP POST JSON)
[ Vercel Serverless Function (/api/gas) ] ◄── Di-push dari ── [ GitHub Repo ]
           ▲
           │
[ Web Frontend (HTML/JS/PWA) ] ──────── Ditautkan ke ───────► [ PWA Builder ]
                                                             (Windows / Android Store)
```

---

### Langkah 1: Siapkan Database Google Sheets & Backend Apps Script

1. Buat Google Spreadsheet baru di Google Drive Anda (beri nama: **`Agranusa Engineering Database`**).
2. Di menu spreadsheet, klik **Ekstensi** > **Apps Script**.
3. Hapus kode bawaan, lalu salin file dari folder `backend/`:
   - `appsscript.json`
   - `Code.gs`
   - `ApiRouter.gs`
   - `SheetRepository.gs`
   - `ConfigService.gs`
   - `AuthService.gs`
   - `DashboardService.gs`
   - `ActivityService.gs`
   - `ProjectService.gs`
   - `EnergyService.gs`
   - `PurchaseService.gs`
   - `EvaluationService.gs`
   - `ReportService.gs`
   - `ValidationService.gs`
   - `AuditService.gs`
4. Pilih fungsi **`menuInitDatabase`** di toolbar editor Apps Script, lalu klik **Run (Jalankan)**.
   - Izinkan otorisasi akses saat diminta.
   - Database Google Sheets Anda akan langsung terisi dengan **13 tab terstruktur** beserta data awal Mei 2026.
5. Deploy sebagai Web App:
   - Klik **Deploy** > **New Deployment**.
   - Pilih jenis: **Web App**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Klik **Deploy**, lalu **Salin Web App URL** (contoh: `https://script.google.com/macros/s/AKfycbx.../exec`).

---

### Langkah 2: Hubungkan Repositori ke GitHub

1. Buka terminal pada folder proyek:
   ```bash
   cd C:\Users\USER\.gemini\antigravity\scratch\agranusa_monthly_report_gas
   git init
   git add .
   git commit -m "feat: Agranusa Engineering System with Vercel & PWA Builder architecture"
   ```
2. Buat repositori baru di GitHub (misal: `agranusa-engineering-system`).
3. Hubungkan remote dan push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/USERNAME/agranusa-engineering-system.git
   git push -u origin main
   ```

---

### Langkah 3: Deploy Frontend ke Vercel

1. Buka dashboard [Vercel](https://vercel.com/) dan klik **Add New Project**.
2. Impor repositori GitHub `agranusa-engineering-system`.
3. Di bagian **Root Directory**, pilih folder: `frontend`.
4. Di bagian **Environment Variables**, tambahkan:
   - **Key:** `GAS_API_URL`
   - **Value:** *[Salin URL Web App Google Apps Script dari Langkah 1]*
5. Klik **Deploy**.
6. Vercel akan otomatis membangun aplikasi dan memberikan URL produksi (contoh: `https://agranusa-engineering.vercel.app`).
   - Request API frontend ke `/api/gas` akan secara otomatis diteruskan oleh Vercel Serverless Function ke Google Sheets tanpa kendala CORS browser!

---

### Langkah 4: Publikasi ke PWA Builder (Aplikasi Windows & Android)

Aplikasi telah dilengkapi dengan `manifest.json`, `sw.js`, dan tombol instalasi in-app:
1. Kunjungi [pwabuilder.com](https://www.pwabuilder.com/).
2. Masukkan URL Vercel Anda (contoh: `https://agranusa-engineering.vercel.app`).
3. Klik **Start**.
4. PWA Builder akan memverifikasi:
   - Manifest: **100% Valid** (Name, Short name, Icons 192/512/Maskable, Standalone display, Theme color `#00342b`).
   - Service Worker: **100% Active** (Cache Shell, Stale-while-revalidate, Offline fallback).
   - Keamanan: **HTTPS Terverifikasi** melalui Vercel SSL.
5. Klik **Package for Stores**:
   - **Windows:** Menghasilkan paket `.msix` untuk diunggah ke Microsoft Store atau dipasang langsung di PC teknisi.
   - **Android:** Menghasilkan proyek Android Studio / `.apk` / `.aab` untuk Google Play Store atau instalasi langsung di smartphone teknisi lapangan.
   - **iOS:** Menghasilkan template WebKit PWA untuk Apple App Store.

---

## 🔒 Keunggulan Arsitektur Ini
- **Google Sheets Tetap Ringan & Bersih:** Spreadsheet hanya bertindak sebagai media penyimpanan data (database) sehingga cepat dibuka oleh staf kantor tanpa file skrip/tampilan HTML yang berat di dalamnya.
- **Bebas Masalah CORS:** Endpoint API Google Apps Script dipanggil melalui Vercel Serverless Function (`frontend/api/gas.js`), menghilangkan error CORS browser.
- **Offline Resilient:** Saat teknisi memeriksa pompa atau genset di area basement/tanpa sinyal, Service Worker akan menyajikan data cache lokal dan halaman offline ramah pengguna.
