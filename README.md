# The Grand Lux Hotel 🏨

A **full-stack hotel booking system** with responsive frontend, Node.js/Express backend, SQLite database, M-Pesa STK Push payment integration, and admin dashboard.

**Live at:** [github.com/Allen-caxtone/hotel](https://github.com/Allen-caxtone/hotel)

---

## ✨ Features

### Guest Experience
- 🎨 **Beautiful responsive UI** — Hero slider, room gallery, dining, amenities, testimonials
- 🖼️ **Real hotel imagery** — Curated from Pexels (rooms, dining, amenities)
- 🛏️ **4 Room Categories** — Standard, Deluxe Suite, Executive Suite, **Presidential Suite** (new!)
- 📅 **Real-time booking** — Full contact info + date selection with instant total calculation
- 💳 **M-Pesa STK Push** — Pay directly with your phone (Kenyan mobile money)
- 📧 **Newsletter subscription** — Backend-persisted email list
- 📱 **Mobile-first** — Fully responsive with burger menu

### Admin Dashboard (`admin.html`)
- 📊 **Live statistics** — Total bookings, revenue, occupancy rate, avg. rating
- 📈 **Room-type analytics** — Bookings by category with bar chart
- 📋 **Booking management** — View, confirm, or cancel bookings
- 🛏️ **Room inventory** — Full room list with images and availability
- ✉️ **Guest messages** — Read contact form submissions
- 🔄 **Auto-refresh** — Data updates every 30 seconds

### Backend API (Node.js + Express + SQLite)
- 🚀 RESTful API with 15+ endpoints
- 💾 SQLite database with 6 tables (rooms, bookings, payments, contacts, newsletter, reviews)
- 💳 M-Pesa Daraja API integration (OAuth, STK Push, Query, Callback)
- 🔒 Booking conflict prevention (no double-booking)
- 📊 Dashboard aggregation endpoints

---

## 🗂️ Project Structure

```
hotel/
├── index.html          # Main site (guest-facing)
├── admin.html          # Admin dashboard
├── script.js           # Frontend logic + API calls + M-Pesa flow
├── style.css           # All styling (responsive)
├── README.md
├── images/             # Static hero images
└── backend/            # Node.js/Express API
    ├── package.json
    ├── .env            # M-Pesa credentials (gitignored in prod)
    └── src/
        ├── server.js
        ├── database.js
        └── routes/
            ├── rooms.js
            ├── bookings.js
            ├── payments.js    # M-Pesa Daraja
            ├── dashboard.js
            └── contact.js
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Configure M-Pesa (Optional — for real payments)

Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke), create a sandbox app, then edit `backend/.env`:

```env
PORT=3000
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/callback   # use ngrok in dev
MPESA_ENV=sandbox
```

**Note:** For local testing, use [ngrok](https://ngrok.com) to expose your callback URL:
```bash
ngrok http 3000
# Update MPESA_CALLBACK_URL with the ngrok URL
```

### 3. Start the backend

```bash
npm start
# → 🏨 Grand Lux Hotel API running on http://localhost:3000
# → ✅ Database seeded with room data (4 rooms)
```

### 4. Open the site

Simply open `index.html` in your browser — the frontend will hit `http://localhost:3000/api` by default.

For a different backend URL, set `window.API_BASE` before loading `script.js`:
```html
<script>window.API_BASE = 'https://your-api.com/api';</script>
<script src="script.js"></script>
```

### 5. Access the admin dashboard

Open `admin.html` (or click "Admin" in the site footer).

---

## 🔌 API Endpoints

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List all available rooms |
| GET | `/api/rooms/:id` | Get room details |
| GET | `/api/rooms/availability/search?check_in=&check_out=&room_type=` | Search availability |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings?status=&search=` | List bookings (admin) |
| GET | `/api/bookings/:id` | Get booking with payment info |
| PATCH | `/api/bookings/:id` | Update status/payment |
| DELETE | `/api/bookings/:id` | Cancel booking |

### Payments (M-Pesa)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/stkpush` | Trigger STK Push to guest phone |
| POST | `/api/payments/query/:checkoutId` | Query M-Pesa payment status |
| POST | `/api/payments/callback` | M-Pesa webhook (Safaricom → us) |
| GET | `/api/payments/booking/:bookingId` | Get payments for a booking |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Aggregate statistics |
| GET | `/api/dashboard/activity` | Recent bookings + payments |
| GET | `/api/dashboard/chart-data?days=30` | Daily booking chart data |

### Contact
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Submit contact form |
| POST | `/api/contact/newsletter` | Newsletter subscription |
| GET | `/api/contact` | List messages (admin) |

---

## 💳 M-Pesa Payment Flow

```
Guest fills booking form → POST /api/bookings creates booking (pending)
    ↓
POST /api/payments/stkpush sends STK Push
    ↓
Guest gets prompt on phone → enters M-Pesa PIN
    ↓
Safaricom → POST /api/payments/callback (webhook)
    ↓
Backend updates booking to 'confirmed' + payment_status 'paid'
    ↓
Frontend polls GET /api/bookings/:id every 3s until paid/failed
    ↓
UI shows success/failure to guest
```

---

## 🎨 Room Categories

| Category | Price/Night (KES) | Size | Bed | Rating |
|----------|-------------------|------|-----|--------|
| Standard Room | 25,000 | 32 sqm | King | ⭐ 4.3 |
| Deluxe Suite | 45,000 | 48 sqm | Super King | ⭐ 4.6 |
| Executive Suite | 70,000 | 65 sqm | California King | ⭐ 4.8 |
| **Presidential Suite** | **150,000** | **120 sqm** | **Royal King + Twin** | ⭐ **5.0** |

---

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript (ES2020+), Font Awesome  
**Backend:** Node.js, Express 4, better-sqlite3, axios  
**Payments:** Safaricom Daraja API (M-Pesa STK Push)  
**Deployment:** Any Node.js host (Vercel, Railway, Render, Fly.io)

---

## 📝 Roadmap

- [x] Backend API with SQLite
- [x] M-Pesa integration
- [x] Admin dashboard
- [x] Presidential Suite
- [x] Real hotel imagery
- [ ] Email notifications (confirmation, receipt)
- [ ] Room availability calendar
- [ ] Guest login & booking history
- [ ] Multi-language support (English/Swahili)
- [ ] Docker deployment
- [ ] Real-time notifications (WebSockets)

---

## 👤 Author

**[@Allen-caxtone](https://github.com/Allen-caxtone)** — Caxtone Mulongo

## 📄 License

MIT — free to use, modify, and distribute.
