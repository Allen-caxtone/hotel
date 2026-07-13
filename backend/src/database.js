const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'hotel.db');
let db;

function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      price_per_night INTEGER NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 2,
      bed_type TEXT DEFAULT 'King Bed',
      amenities TEXT,
      image_url TEXT,
      gallery_urls TEXT,
      size_sqm INTEGER,
      floor INTEGER,
      view TEXT,
      status TEXT DEFAULT 'available',
      rating REAL DEFAULT 4.5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      guest_email TEXT NOT NULL,
      guest_phone TEXT NOT NULL,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      adults INTEGER NOT NULL DEFAULT 1,
      children INTEGER NOT NULL DEFAULT 0,
      total_nights INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      special_requests TEXT,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      mpesa_checkout_id TEXT,
      mpesa_receipt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      phone_number TEXT NOT NULL,
      mpesa_checkout_id TEXT,
      mpesa_merchant_id TEXT,
      mpesa_receipt TEXT,
      result_code INTEGER,
      result_description TEXT,
      status TEXT DEFAULT 'pending',
      raw_callback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      guest_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      status TEXT DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );
  `);

  // Seed rooms if empty
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
  if (roomCount.count === 0) {
    seedRooms();
  }

  return db;
}

function seedRooms() {
  const insertRoom = db.prepare(`
    INSERT INTO rooms (id, name, type, description, price_per_night, capacity, bed_type, amenities, image_url, gallery_urls, size_sqm, floor, view, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rooms = [
    {
      id: 'room-standard-1',
      name: 'Standard Room',
      type: 'standard',
      description: 'Cozy and elegant, perfect for a comfortable stay. Features modern furnishings, en-suite bathroom, and all essential amenities for the discerning traveler.',
      price_per_night: 25000,
      capacity: 2,
      bed_type: 'King Bed',
      amenities: 'Free Wi-Fi,Breakfast Included,Air Conditioning,Flat Screen TV,Mini Bar,Room Service,En-suite Bathroom,Work Desk',
      image_url: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
      gallery_urls: JSON.stringify([
        'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=800'
      ]),
      size_sqm: 32,
      floor: 2,
      view: 'City View',
      rating: 4.3
    },
    {
      id: 'room-deluxe-1',
      name: 'Deluxe Suite',
      type: 'deluxe',
      description: 'Spacious and stylish, with a separate living area and premium finishes. Enjoy the perfect blend of comfort and elegance with panoramic views.',
      price_per_night: 45000,
      capacity: 2,
      bed_type: 'Super King Bed',
      amenities: 'Free Wi-Fi,Breakfast Included,Air Conditioning,Flat Screen TV,Mini Bar,Room Service,Marble Bathroom,Separate Living Area,Balcony,Espresso Machine',
      image_url: 'https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg?auto=compress&cs=tinysrgb&w=800',
      gallery_urls: JSON.stringify([
        'https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=800'
      ]),
      size_sqm: 48,
      floor: 4,
      view: 'Ocean View',
      rating: 4.6
    },
    {
      id: 'room-executive-1',
      name: 'Executive Suite',
      type: 'executive',
      description: 'Panoramic views and exclusive executive lounge access. Designed for the business traveler who demands the finest in luxury and functionality.',
      price_per_night: 70000,
      capacity: 2,
      bed_type: 'California King',
      amenities: 'Free Wi-Fi,Breakfast Included,Air Conditioning,Flat Screen TV,Mini Bar,24/7 Room Service,Executive Lounge Access,Coffee Machine,Premium Toiletries,Butler Service,Work Station',
      image_url: 'https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=800',
      gallery_urls: JSON.stringify([
        'https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/261169/pexels-photo-261169.jpeg?auto=compress&cs=tinysrgb&w=800'
      ]),
      size_sqm: 65,
      floor: 6,
      view: 'Panoramic City & Ocean',
      rating: 4.8
    },
    {
      id: 'room-presidential-1',
      name: 'Presidential Suite',
      type: 'presidential',
      description: 'The pinnacle of luxury. Our Presidential Suite offers unmatched opulence with a grand living room, private dining area, personal butler, and breathtaking 360° views of the city and ocean.',
      price_per_night: 150000,
      capacity: 4,
      bed_type: 'Royal King Bed + Twin Beds',
      amenities: 'Free Wi-Fi,Breakfast Included,Air Conditioning,85" OLED TV,Full Bar,24/7 Butler Service,Private Dining Room,Jacuzzi,Walk-in Closet,Personal Chef Available,Helipad Access,Private Elevator,Limo Service',
      image_url: 'https://images.pexels.com/photos/271643/pexels-photo-271643.jpeg?auto=compress&cs=tinysrgb&w=800',
      gallery_urls: JSON.stringify([
        'https://images.pexels.com/photos/271643/pexels-photo-271643.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/271672/pexels-photo-271672.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/271648/pexels-photo-271648.jpeg?auto=compress&cs=tinysrgb&w=800'
      ]),
      size_sqm: 120,
      floor: 10,
      view: '360° Panoramic',
      rating: 5.0
    }
  ];

  const insertMany = db.transaction((rooms) => {
    for (const room of rooms) {
      insertRoom.run(
        room.id, room.name, room.type, room.description,
        room.price_per_night, room.capacity, room.bed_type,
        room.amenities, room.image_url, room.gallery_urls,
        room.size_sqm, room.floor, room.view, room.rating
      );
    }
  });

  insertMany(rooms);
  console.log('✅ Database seeded with room data');
}

function getDatabase() {
  return db;
}

module.exports = { initDatabase, getDatabase };
