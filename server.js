const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // untuk mengakses index.html

// Path ke database
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Helper baca/tulis DB
function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Inisialisasi DB jika belum ada
if (!fs.existsSync(DB_PATH)) {
    const defaultDB = {
        admin: {
            username: "admin",
            password: "admin123", // dalam production, gunakan hash!
        },
        content: {
            churchName: "PISGAH BISDAC CHURCH",
            tagline: "A Home to Belong. A Family to Grow. A Mission to Fulfill.",
            verse: "<i class='fas fa-bible'></i> “Sebab di mana dua atau tiga orang berkumpul dalam nama-Ku, di situ Aku ada di tengah-tengah mereka.” — Matius 18:20",
            promoText: "Pembukaan malam ini akan menggalakkan wakil pengikut bagi semua hari • BACA WAJAH TERBAIK!",
            schedule: [
                ["Ibadah Umum 1", "07.00", "Masa Sanctuary"],
                ["Ibadah Umum 2", "10.00", "Masa Sanctuary"],
                ["Ibadah Youth", "17.00", "Youth Chapel"],
                ["Ibadah Doa", "19.00", "Prayer Room"],
                ["Ibadah Anak", "10.00", "Kuin Chosen"],
                ["Ibadah Online", "10.00", "Youth Club"]
            ],
            ministries: [
                { icon: "fas fa-city", title: "MISI KOTA", desc: "Kasih untuk Semua. Penjangkauan sosial & penginjilan di Surabaya." },
                { icon: "fas fa-music", title: "WORSHIP", desc: "Perwirah dan berdoa — tim pujian yang membawa hadirat Tuhan." },
                { icon: "fas fa-hands-helping", title: "COMMUNITY CARE", desc: "Menghadiri dan melayani dengan telinga terbaik. Konseling & pendampingan." }
            ],
            aboutCards: [
                { icon: "fas fa-door-open", title: "VISIT", desc: "Mengajak keluarga dan teman-teman untuk menikmati kesuksesan dan konten positif." },
                { icon: "fas fa-bullhorn", title: "MISI KAMI", desc: "Membangun komunitas sehat & spiritual." },
                { icon: "fas fa-star-of-life", title: "KESAKSIAN", desc: "✨ Selamat jam bertemu bersama dalam sesi ibadah." }
            ],
            layout: {
                ministryGrid: "3",
                aboutGrid: "3",
                theme: "green"
            }
        }
    };
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    writeDB(defaultDB);
}

// ========== API ROUTES ==========
// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    if (db.admin.username === username && db.admin.password === password) {
        res.json({ success: true, message: "Login berhasil" });
    } else {
        res.status(401).json({ success: false, message: "Username atau password salah" });
    }
});

// Ambil semua konten (tanpa password)
app.get('/api/content', (req, res) => {
    const db = readDB();
    res.json({ success: true, content: db.content });
});

// Simpan konten (hanya untuk admin, tapi kita sederhanakan pakai token nanti)
// Untuk kemudahan, kita akan kirim token dari frontend setelah login (gunakan session sederhana)
// Kita buat session sederhana dengan token random
let activeToken = null;
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    if (db.admin.username === username && db.admin.password === password) {
        activeToken = require('crypto').randomBytes(32).toString('hex');
        res.json({ success: true, token: activeToken });
    } else {
        res.status(401).json({ success: false });
    }
});

// Middleware verifikasi token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (token === `Bearer ${activeToken}`) {
        next();
    } else {
        res.status(403).json({ success: false, message: "Unauthorized" });
    }
}

// Update konten umum (field per field)
app.post('/api/update-content', verifyToken, (req, res) => {
    const { field, value } = req.body;
    const db = readDB();
    if (field.startsWith("schedule")) {
        // khusus schedule: array 2d
        db.content.schedule = value;
    } else if (field.startsWith("ministries")) {
        db.content.ministries = value;
    } else if (field.startsWith("aboutCards")) {
        db.content.aboutCards = value;
    } else if (field === "layout") {
        db.content.layout = value;
    } else {
        db.content[field] = value;
    }
    writeDB(db);
    res.json({ success: true });
});

// Update layout
app.post('/api/update-layout', verifyToken, (req, res) => {
    const { ministryGrid, aboutGrid, theme } = req.body;
    const db = readDB();
    db.content.layout = { ministryGrid, aboutGrid, theme };
    writeDB(db);
    res.json({ success: true });
});

// Reset ke default
app.post('/api/reset', verifyToken, (req, res) => {
    const defaultDB = {
        admin: { username: "admin", password: "admin123" },
        content: {
            churchName: "PISGAH BISDAC CHURCH",
            tagline: "A Home to Belong. A Family to Grow. A Mission to Fulfill.",
            verse: "<i class='fas fa-bible'></i> “Sebab di mana dua atau tiga orang berkumpul dalam nama-Ku, di situ Aku ada di tengah-tengah mereka.” — Matius 18:20",
            promoText: "Pembukaan malam ini akan menggalakkan wakil pengikut bagi semua hari • BACA WAJAH TERBAIK!",
            schedule: [
                ["Ibadah Umum 1", "07.00", "Masa Sanctuary"],
                ["Ibadah Umum 2", "10.00", "Masa Sanctuary"],
                ["Ibadah Youth", "17.00", "Youth Chapel"],
                ["Ibadah Doa", "19.00", "Prayer Room"],
                ["Ibadah Anak", "10.00", "Kuin Chosen"],
                ["Ibadah Online", "10.00", "Youth Club"]
            ],
            ministries: [
                { icon: "fas fa-city", title: "MISI KOTA", desc: "Kasih untuk Semua. Penjangkauan sosial & penginjilan di Surabaya." },
                { icon: "fas fa-music", title: "WORSHIP", desc: "Perwirah dan berdoa — tim pujian yang membawa hadirat Tuhan." },
                { icon: "fas fa-hands-helping", title: "COMMUNITY CARE", desc: "Menghadiri dan melayani dengan telinga terbaik. Konseling & pendampingan." }
            ],
            aboutCards: [
                { icon: "fas fa-door-open", title: "VISIT", desc: "Mengajak keluarga dan teman-teman untuk menikmati kesuksesan dan konten positif." },
                { icon: "fas fa-bullhorn", title: "MISI KAMI", desc: "Membangun komunitas sehat & spiritual." },
                { icon: "fas fa-star-of-life", title: "KESAKSIAN", desc: "✨ Selamat jam bertemu bersama dalam sesi ibadah." }
            ],
            layout: { ministryGrid: "3", aboutGrid: "3", theme: "green" }
        }
    };
    writeDB(defaultDB);
    res.json({ success: true, message: "Reset ke default berhasil" });
});

app.listen(PORT, () => {
    console.log(`Server backend berjalan di http://localhost:${PORT}`);
    console.log(`Akses frontend: http://localhost:${PORT}`);
});
