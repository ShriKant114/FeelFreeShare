require("dotenv").config();
const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const qr = require('qrcode');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const PORT = process.env.PORT || 3000;

router.post('/upload', (req, res) => {
  const { link } = req.body;

  if (!link) {
    return res.json({ success: false, message: 'Link is required' });
  }

  // Generate 4-digit access code
  const code = Math.floor(1000 + Math.random() * 9000);

  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0];

  db.query(
    'INSERT INTO link_data (copy_link, access_code, date, time) VALUES (?, ?, ?, ?)',
    [link, code, date, time],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: 'Database error' });
      }

      // ✅ QR code me direct uploaded link
      qr.toDataURL(link, (err, qrCodeData) => {
        if (err) {
          console.error(err);
          return res.json({
            success: true,
            code,
            message: 'Link saved but QR generation failed'
          });
        }

        res.json({
          success: true,
          code,
          qrCode: qrCodeData
        });
      });
    }
  );
});


// Access link
router.get('/link-access', (req, res) => {
  const { code } = req.query;
  console.log('Access request for code:', code);
  if (!code) {
    return res.json({ success: false, message: 'Code is required' });
  }

  db.query('SELECT * FROM link_data WHERE access_code = ?', [code], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.json({ success: false, message: 'Database error' });
    }
    console.log('Query results:', results);
    if (results.length === 0) {
      return res.json({ success: false, message: 'Invalid code' });
    }
    res.json({ success: true, data: results });
  });
});

module.exports = router;