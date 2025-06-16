const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', function(req, res) {
  res.json({ message:'MIDI Server Works' });
});

app.listen(PORT, function() {
  console.log('Server on port ' + PORT );
});
