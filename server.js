const express = require(‘express’);
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware pour traiter les données JSON
app.use(express.json());

// Données temporaires (en mémoire)
let partitions = [
{ id: 1, titre: “Mélodie Collective”, notes: [“Do”, “Ré”, “Mi”, “Fa”] },
{ id: 2, titre: “Rythme Partagé”, notes: [“Sol”, “La”, “Si”, “Do”] }
];

let instruments = [“Piano virtuel”, “Percussion tactile”, “Cordes imaginaires”];
let performances = [];

// 🏠 Endpoint principal
app.get(’/’, (req, res) => {
res.json({
message: ‘MIDI Server - Créateur de liens sociaux’,
endpoints: [’/partitions’, ‘/instruments’, ‘/performances’, ‘/sync’]
});
});

// 📜 Endpoint pour récupérer toutes les partitions
app.get(’/partitions’, (req, res) => {
res.json({
message: “Partitions disponibles pour le public”,
partitions: partitions
});
});

// 📝 Endpoint pour récupérer une partition spécifique
app.get(’/partitions/:id’, (req, res) => {
const id = parseInt(req.params.id);
const partition = partitions.find(p => p.id === id);

if (partition) {
res.json({ partition });
} else {
res.status(404).json({ erreur: “Partition non trouvée” });
}
});

// 🎹 Endpoint pour obtenir la liste des instruments
app.get(’/instruments’, (req, res) => {
res.json({
message: “Instruments inventés pour l’occasion”,
instruments: instruments
});
});

// 🎵 Endpoint pour enregistrer une performance
app.post(’/performances’, (req, res) => {
const nouvellePerformance = {
id: performances.length + 1,
timestamp: new Date(),
musicien: req.body.musicien || “Anonyme”,
notes: req.body.notes || [],
instrument: req.body.instrument || “Non spécifié”
};

performances.push(nouvellePerformance);

res.json({
message: “Performance enregistrée avec succès!”,
performance: nouvellePerformance
});
});

// 🔄 Endpoint pour la synchronisation collective
app.get(’/sync’, (req, res) => {
res.json({
message: “État de la performance collective”,
musiciens_connectes: performances.length,
derniere_performance: performances[performances.length - 1] || null,
tempo: “120 BPM”
});
});

// 📊 Endpoint pour voir toutes les performances
app.get(’/performances’, (req, res) => {
res.json({
message: “Toutes les performances du public”,
total: performances.length,
performances: performances
});
});

// Démarrage du serveur
app.listen(PORT, () => {
console.log(‘🎵 MIDI Server démarré sur le port’, PORT);
console.log(‘🎼 Prêt à créer du lien social par la musique!’);
});
