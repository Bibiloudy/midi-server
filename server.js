const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Hello MIDI Server' });
});

app.listen(PORT, () => {
  console.log('Server started on port', PORT);
});
