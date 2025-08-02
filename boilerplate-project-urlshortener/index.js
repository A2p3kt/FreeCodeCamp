require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { error } = require('console');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

const urlDict = {};
const idDict = {};
let counter = 1;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post('/api/shorturl', (req, res) => {
  const submitted = req.body.url;

  try {
    const parsed = new URL(submitted);
    const cleanUrl = parsed.href; // normalized URL string

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.json({ error: 'Invalid URL' });
    }

    if (idDict[cleanUrl]) {
      return res.json({
        original_url: cleanUrl,
        short_url: idDict[cleanUrl]
      });
    }

    const shortId = counter++;
    urlDict[shortId] = cleanUrl;
    idDict[cleanUrl] = shortId;

    return res.json({
      original_url: cleanUrl,
      short_url: shortId
    });
  } catch {
    return res.json({ error: 'Invalid URL' });
  }
});

app.get('/api/shorturl/:id', (req, res) => {
  const id = req.params.id
  const original_url = urlDict[id]

  if (original_url) {
    res.redirect(original_url)
  } else {
    res.status(404).json({"error":"No short URL found for the given input"})
  }
})
