// server.js - Serveur MIDI Collaboratif
const express = require(‘express’);
const http = require(‘http’);
const socketIo = require(‘socket.io’);
const cors = require(‘cors’);
const path = require(‘path’);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
cors: {
origin: “*”,
methods: [“GET”, “POST”]
}
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, ‘public’)));

// Stockage des sessions en mémoire
const sessions = new Map();
const clients = new Map();

// Fonction utilitaire pour générer un ID de session
function generateSessionId() {
return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Fonction pour trouver une session par compositeur
function findSessionByComposer(composerId) {
for (let session of sessions.values()) {
if (session.composer === composerId) return session;
}
return null;
}

// Fonction pour trouver une session par musicien
function findSessionByMusician(musicianId) {
for (let session of sessions.values()) {
if (session.musicians.find(m => m.id === musicianId)) return session;
}
return null;
}

// Fonction pour broadcaster à une session
function broadcastToSession(sessionId, message, excludeClient = null) {
const session = sessions.get(sessionId);
if (!session) return;

// Envoyer au compositeur
if (session.composer !== excludeClient) {
const composerSocket = clients.get(session.composer);
if (composerSocket) {
composerSocket.emit(‘message’, message);
}
}

// Envoyer à tous les musiciens
session.musicians.forEach(musician => {
if (musician.id !== excludeClient) {
const musicianSocket = clients.get(musician.id);
if (musicianSocket) {
musicianSocket.emit(‘message’, message);
}
}
});
}

// Connexion WebSocket
io.on(‘connection’, (socket) => {
console.log(`Client connecté: ${socket.id}`);
clients.set(socket.id, socket);

// Envoyer confirmation de connexion
socket.emit(‘message’, {
type: ‘connected’,
clientId: socket.id
});

// === GESTION DES MESSAGES ===

// Créer une session
socket.on(‘CREATE_SESSION’, (data) => {
const sessionId = data.sessionId || generateSessionId();

```
const newSession = {
  id: sessionId,
  composer: socket.id,
  musicians: [],
  parts: [],
  phase: 'lobby',
  startTime: null,
  currentPosition: 0,
  createdAt: new Date()
};

sessions.set(sessionId, newSession);

socket.emit('message', {
  type: 'SESSION_CREATED',
  sessionId: sessionId
});

console.log(`Session créée: ${sessionId} par ${socket.id}`);
```

});

// Rejoindre la session active (sans code)
socket.on(‘JOIN_ACTIVE_SESSION’, (data) => {
// Trouver la session active (la plus récente en phase lobby)
let activeSession = null;
for (let session of sessions.values()) {
if (session.phase === ‘lobby’) {
if (!activeSession || session.createdAt > activeSession.createdAt) {
activeSession = session;
}
}
}

```
if (!activeSession) {
  socket.emit('message', {
    type: 'NO_ACTIVE_SESSION'
  });
  return;
}

// Ajouter le musicien à la session active
const musician = {
  id: socket.id,
  name: data.playerName,
  selectedPart: null,
  ready: false,
  status: 'connected',
  joinedAt: new Date()
};

activeSession.musicians.push(musician);

// Notifier le compositeur
const composerSocket = clients.get(activeSession.composer);
if (composerSocket) {
  composerSocket.emit('message', {
    type: 'MUSICIAN_JOINED',
    musician: musician,
    allMusicians: activeSession.musicians
  });
}

// Confirmer au musicien
socket.emit('message', {
  type: 'SESSION_JOINED',
  sessionId: activeSession.id,
  parts: activeSession.parts
});

console.log(`${data.playerName} a rejoint automatiquement la session ${activeSession.id}`);
```

});

// Mettre à jour les parties MIDI
socket.on(‘UPDATE_PARTS’, (data) => {
const session = findSessionByComposer(socket.id);
if (session) {
session.parts = data.parts;

```
  // Notifier tous les musiciens
  session.musicians.forEach(musician => {
    const musicianSocket = clients.get(musician.id);
    if (musicianSocket) {
      musicianSocket.emit('message', {
        type: 'PARTS_UPDATED',
        parts: session.parts
      });
    }
  });

  console.log(`Parties mises à jour pour session ${session.id}`);
}
```

});

// Sélectionner une partie
socket.on(‘SELECT_PART’, (data) => {
const session = findSessionByMusician(socket.id);
if (session) {
const musician = session.musicians.find(m => m.id === socket.id);
if (musician) {
musician.selectedPart = data.partIndex;
musician.ready = true;

```
    // Notifier le compositeur
    const composerSocket = clients.get(session.composer);
    if (composerSocket) {
      composerSocket.emit('message', {
        type: 'MUSICIAN_UPDATED',
        musician: musician,
        allMusicians: session.musicians
      });
    }

    console.log(`${musician.name} a sélectionné la partie ${data.partIndex}`);
  }
}
```

});

// Démarrer la session
socket.on(‘START_SESSION’, (data) => {
const session = findSessionByComposer(socket.id);
if (session) {
session.phase = ‘countdown’;
session.startTime = Date.now() + 4000; // 4 secondes de décompte

```
  // Broadcaster le démarrage
  broadcastToSession(session.id, {
    type: 'SESSION_STARTING',
    startTime: session.startTime
  });

  // Programmer le démarrage effectif
  setTimeout(() => {
    session.phase = 'playing';
    broadcastToSession(session.id, {
      type: 'SESSION_STARTED'
    });

    // Démarrer la synchronisation de position
    startPositionSync(session);
  }, 4000);

  console.log(`Session ${session.id} démarrée`);
}
```

});

// Mise à jour du statut du joueur
socket.on(‘PLAYER_STATUS’, (data) => {
const session = findSessionByMusician(socket.id);
if (session) {
const musician = session.musicians.find(m => m.id === socket.id);
if (musician) {
musician.status = data.status;
musician.position = data.position;

```
    // Notifier le compositeur
    const composerSocket = clients.get(session.composer);
    if (composerSocket) {
      composerSocket.emit('message', {
        type: 'MUSICIAN_STATUS_UPDATED',
        musicianId: socket.id,
        status: data.status,
        position: data.position
      });
    }
  }
}
```

});

// Arrêter la session
socket.on(‘STOP_SESSION’, (data) => {
const session = findSessionByComposer(socket.id);
if (session) {
session.phase = ‘lobby’;

```
  broadcastToSession(session.id, {
    type: 'SESSION_STOPPED'
  });

  console.log(`Session ${session.id} arrêtée`);
}
```

});

// === DÉCONNEXION ===
socket.on(‘disconnect’, () => {
console.log(`Client déconnecté: ${socket.id}`);
clients.delete(socket.id);

```
// Nettoyer les sessions
for (let [sessionId, session] of sessions.entries()) {
  // Si c'est le compositeur qui se déconnecte
  if (session.composer === socket.id) {
    // Notifier tous les musiciens
    session.musicians.forEach(musician => {
      const musicianSocket = clients.get(musician.id);
      if (musicianSocket) {
        musicianSocket.emit('message', {
          type: 'COMPOSER_DISCONNECTED'
        });
      }
    });

    // Supprimer la session après un délai
    setTimeout(() => {
      sessions.delete(sessionId);
      console.log(`Session ${sessionId} supprimée (compositeur déconnecté)`);
    }, 30000); // 30 secondes de grâce
  } else {
    // Si c'est un musicien qui se déconnecte
    const musicianIndex = session.musicians.findIndex(m => m.id === socket.id);
    if (musicianIndex !== -1) {
      const musician = session.musicians[musicianIndex];
      session.musicians.splice(musicianIndex, 1);

      // Notifier le compositeur
      const composerSocket = clients.get(session.composer);
      if (composerSocket) {
        composerSocket.emit('message', {
          type: 'MUSICIAN_DISCONNECTED',
          musicianId: socket.id,
          allMusicians: session.musicians
        });
      }

      console.log(`${musician.name} a quitté la session ${sessionId}`);
    }
  }
}
```

});
});

// Fonction de synchronisation de position
function startPositionSync(session) {
const syncInterval = setInterval(() => {
if (session.phase !== ‘playing’) {
clearInterval(syncInterval);
return;
}

```
const elapsed = Date.now() - session.startTime;
session.currentPosition = elapsed;

// Broadcaster la position à tous
broadcastToSession(session.id, {
  type: 'POSITION_SYNC',
  position: session.currentPosition,
  timestamp: Date.now()
});
```

}, 100); // Sync toutes les 100ms
}

// API REST pour monitoring
app.get(’/api/status’, (req, res) => {
res.json({
status: ‘running’,
sessions: sessions.size,
clients: clients.size,
uptime: process.uptime()
});
});

app.get(’/api/sessions’, (req, res) => {
const sessionsList = Array.from(sessions.values()).map(session => ({
id: session.id,
phase: session.phase,
musiciansCount: session.musicians.length,
partsCount: session.parts.length,
createdAt: session.createdAt
}));

res.json(sessionsList);
});

// Route par défaut
app.get(’/’, (req, res) => {
res.json({
message: ‘MIDI Collaborative Server’,
version: ‘1.0.0’,
endpoints: {
status: ‘/api/status’,
sessions: ‘/api/sessions’
}
});
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
console.log(`🎵 Serveur MIDI démarré sur le port ${PORT}`);
console.log(`📡 WebSocket prêt pour les connexions`);
console.log(`🌐 API disponible sur http://localhost:${PORT}`);
});

// Gestion des erreurs
process.on(‘uncaughtException’, (error) => {
console.error(‘Erreur non gérée:’, error);
});

process.on(‘unhandledRejection’, (reason, promise) => {
console.error(‘Promesse rejetée:’, reason);
});

module.exports = server;
