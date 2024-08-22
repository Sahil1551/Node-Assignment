const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();
app.use(bodyParser.json());
const dbHost = process.env.MYSQL_ADDON_HOST;
const dbUser = process.env.MYSQL_ADDON_USER;
const dbPassword = process.env.MYSQL_ADDON_PASSWORD;
const dbName = process.env.MYSQL_ADDON_DB;
const connection = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    return;
  }
  console.log('Connected to the MySQL database');
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degree) => degree * (Math.PI / 180);
  const R = 6371; 
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

app.post('/addSchool', (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (typeof name !== 'string' || typeof address !== 'string') {
    return res.status(400).json({ error: 'Invalid data type for name or address' });
  }
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Latitude and longitude must be numbers' });
  }

  const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
  connection.query(query, [name, address, latitude, longitude], (err, result) => {
    if (err) {
      console.error('Error adding the school:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'School added successfully' });
  });
});

app.get('/listSchools', (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  const query = 'SELECT name, address, latitude, longitude FROM schools';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching schools:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const userLatitude = parseFloat(latitude);
    const userLongitude = parseFloat(longitude);
    const sortedSchools = results.map(school => {
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        parseFloat(school.latitude),
        parseFloat(school.longitude)
      );
      return { ...school, distance };
    }).sort((a, b) => a.distance - b.distance);

    res.status(200).json(sortedSchools);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
