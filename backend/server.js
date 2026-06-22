const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const COUNTRIES_API_BASE_URL = process.env.COUNTRIES_API_BASE_URL || 'https://restcountries.com/v3.1';

app.get('/api/destinations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM destinations ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/destinations', async (req, res) => {
  const { country } = req.body;
  try {
    // Sensible defaults so a destination can always be saved, even when the
    // external country API is unreachable or has been deprecated upstream.
    // This keeps the app working end-to-end regardless of that third party.
    let capital = 'N/A';
    let population = 0;
    let region = 'N/A';

    try {
      const response = await axios.get(`${COUNTRIES_API_BASE_URL}/name/${country}`);
      const countryInfo = Array.isArray(response.data) ? response.data[0] : null;
      if (countryInfo) {
        capital = Array.isArray(countryInfo.capital) ? countryInfo.capital[0] : (countryInfo.capital || capital);
        population = countryInfo.population || population;
        region = countryInfo.region || region;
      }
    } catch (apiErr) {
      console.warn(`Country lookup failed for "${country}": ${apiErr.message}. Saving with default details.`);
    }

    const result = await pool.query(
      'INSERT INTO destinations (country, capital, population, region) VALUES ($1, $2, $3, $4) RETURNING *',
      [country, capital, population, region]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/destinations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM destinations WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});