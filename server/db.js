const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'bhsshp0biq3b4g6gwlra-mysql.services.clever-cloud.com',
  user: 'uu0eonejv63vhjle',
  password: '7FhcfW9TQL29Bz6dB6bB',
  database: 'bhsshp0biq3b4g6gwlra',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
