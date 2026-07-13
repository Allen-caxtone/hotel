# Grand Lux Hotel Backend

## Environment Variables
Create a `.env` file:

```
PORT=3000

# M-Pesa Daraja API (Sandbox)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback
MPESA_ENV=sandbox
```

## API Endpoints

### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/:id` - Get room details
- `GET /api/rooms/availability` - Check availability

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List bookings (admin)
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

### Payments (M-Pesa)
- `POST /api/payments/stkpush` - Initiate STK Push
- `POST /api/payments/query/:checkoutId` - Query payment status
- `POST /api/mpesa/callback` - M-Pesa callback webhook

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
