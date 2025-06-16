const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

let partitions = [
  { id: 1, titre: "Mélodie Collective", notes: ["Do", "Ré", "Mi", "Fa"] },
  { id: 2, titre: "Rythme Partagé", notes: ["Sol", "La", "Si", "Do"] }
];

let instruments = ["Piano virtuel", "Percussion tactile", "Cordes imaginaires"];
let performances = [];

app.get('/', function(req, res) {
  res.json({ 
    message: 'MIDI Server - Créateur de liens sociaux',
    endpoints: ['/partitions', '/instruments', '/performances', '/sync']
  });
});

app.get('/partitions', function(req, res) {
  res.json({
    message: "Partitions pour le public",
    partitions: partitions
  });
});

app.get('/instruments', function(req, res) {
  res.json({
    message: "Instruments inventés pour l'occasion",
    instruments: instruments
  });
});

app.post('/performances', function(req, res) {
  const performance = {
    id: performances.length + 1,
    timestamp: new Date(),
    musicien: req.body.musicien || "Anonyme",
    notes: req.body.notes || []
  };
  
  performances.push(performance);
  
  res.json({
    message: "Performance enregistrée!",
    performance: performance
  });
});

app.get('/sync', function(req, res) {
  res.json({
    message: "État de la performance collective",
    musiciens_connectes: performances.length,
    tempo: "120 BPM"
  });
});

app.listen(PORT, function() {
  console.log('🎵 MIDI Server sur le port ' + PORT);
});
