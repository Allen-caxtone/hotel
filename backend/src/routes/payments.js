const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');

const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const MPESA_BASE = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// Get OAuth token
async function getMpesaToken() {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const { data } = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
}

// POST - Initiate STK Push
router.post('/stkpush', async (req, res) => {
  try {
    const { booking_id, phone_number, amount } = req.body;
    const db = getDatabase();

    if (!booking_id || !phone_number || !amount) {
      return res.status(400).json({ error: 'Missing booking_id, phone_number, or amount' });
    }

    // Verify booking exists
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Format phone (remove leading 0/+254 and format as 254XXXXXXXXX)
    let formattedPhone = phone_number.replace(/^0+/, '').replace(/^\+254/, '254');
    if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    const { data } = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://example.com/callback',
        AccountReference: booking_id,
        TransactionDesc: `Hotel Booking ${booking_id}`
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Store payment record
    const paymentId = 'PAY-' + uuidv4().slice(0, 8).toUpperCase();
    const paymentStmt = db.prepare(`
      INSERT INTO payments (id, booking_id, amount, phone_number, mpesa_checkout_id,
        mpesa_merchant_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    paymentStmt.run(
      paymentId, booking_id, amount, formattedPhone,
      data.CheckoutRequestID, data.MerchantRequestID || null, 'pending'
    );

    // Update booking
    db.prepare('UPDATE bookings SET mpesa_checkout_id = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(data.CheckoutRequestID, 'processing', booking_id);

    res.json({
      success: true,
      checkout_request_id: data.CheckoutRequestID,
      merchant_request_id: data.MerchantRequestID,
      payment_id: paymentId,
      message: 'STK Push sent. Please check your phone and enter your M-Pesa PIN.'
    });
  } catch (err) {
    console.error('M-Pesa STK Push Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'M-Pesa payment initiation failed',
      details: err.response?.data || err.message
    });
  }
});

// POST - Query payment status
router.post('/query/:checkoutId', async (req, res) => {
  try {
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    const { data } = await axios.post(
      `${MPESA_BASE}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: req.params.checkoutId
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// POST - M-Pesa Callback webhook
router.post('/callback', (req, res) => {
  try {
    const db = getDatabase();
    const callback = req.body.Body?.stkCallback;
    if (!callback) return res.status(400).json({ error: 'Invalid callback' });

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;
    console.log('📞 M-Pesa Callback:', { CheckoutRequestID, ResultCode, ResultDesc });

    // Find payment record
    const payment = db.prepare('SELECT * FROM payments WHERE mpesa_checkout_id = ?').get(CheckoutRequestID);
    if (!payment) {
      console.log('Payment record not found for checkout:', CheckoutRequestID);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (ResultCode === 0) {
      // Success
      const meta = {};
      if (CallbackMetadata?.Item) {
        CallbackMetadata.Item.forEach(i => { meta[i.Name] = i.Value; });
      }

      db.prepare(`
        UPDATE payments SET status = ?, mpesa_receipt = ?, result_code = ?, result_description = ?, raw_callback = ?, updated_at = CURRENT_TIMESTAMP
        WHERE mpesa_checkout_id = ?
      `).run('completed', meta.MpesaReceiptNumber || null, ResultCode, ResultDesc,
        JSON.stringify(callback), CheckoutRequestID);

      db.prepare(`
        UPDATE bookings SET payment_status = 'paid', mpesa_receipt = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(meta.MpesaReceiptNumber || null, payment.booking_id);

      console.log(`✅ Payment confirmed: ${meta.MpesaReceiptNumber} for booking ${payment.booking_id}`);
    } else {
      // Failed / Cancelled
      db.prepare(`
        UPDATE payments SET status = ?, result_code = ?, result_description = ?, raw_callback = ?, updated_at = CURRENT_TIMESTAMP
        WHERE mpesa_checkout_id = ?
      `).run('failed', ResultCode, ResultDesc, JSON.stringify(callback), CheckoutRequestID);

      db.prepare("UPDATE bookings SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(payment.booking_id);

      console.log(`❌ Payment failed: ${ResultDesc} for booking ${payment.booking_id}`);
    }

    // Always respond with success so M-Pesa knows we received the callback
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('Callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// GET payment status for a booking
router.get('/booking/:bookingId', (req, res) => {
  try {
    const db = getDatabase();
    const payments = db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC').all(req.params.bookingId);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
