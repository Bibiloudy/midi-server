import React, { useState, useEffect, useRef } from ‘react’;

// Simulation WebSocket - Serveur virtuel dans le navigateur
class MockWebSocketServer {
constructor() {
this.clients = new Map();
this.sessions = new Map();
}

connect(clientId, onMessage) {
this.clients.set(clientId, { onMessage, isConnected: true });
console.log(`Client ${clientId} connecté`);

```
setTimeout(() => {
  onMessage({ type: 'connected', clientId });
}, 50);
```

}

disconnect(clientId) {
this.clients.delete(clientId);
console.log(`Client ${clientId} déconnecté`);
}

send(fromClientId, message) {
const latency = 20 + Math.random() * 80;

```
setTimeout(() => {
  this.processMessage(fromClientId, message);
}, latency);
```

}

processMessage(fromClientId, message) {
console.log(`Message reçu de ${fromClientId}:`, message);

```
switch (message.type) {
  case 'CREATE_SESSION':
    this.createSession(fromClientId, message);
    break;
  case 'JOIN_SESSION':
    this.joinSession(fromClientId, message);
    break;
  case 'UPDATE_PARTS':
    this.updateParts(fromClientId, message);
    break;
  case 'SELECT_PART':
    this.selectPart(fromClientId, message);
    break;
  case 'START_SESSION':
    this.startSession(fromClientId, message);
    break;
}
```

}

createSession(clientId, message) {
const sessionId = message.sessionId;
this.sessions.set(sessionId, {
id: sessionId,
composer: clientId,
musicians: [],
parts: [],
phase: ‘lobby’,
startTime: null
});

```
this.sendToClient(clientId, {
  type: 'SESSION_CREATED',
  sessionId
});
```

}

joinSession(clientId, message) {
const session = this.sessions.get(message.sessionId);
if (!session) {
this.sendToClient(clientId, {
type: ‘SESSION_NOT_FOUND’
});
return;
}

```
session.musicians.push({
  id: clientId,
  name: message.playerName,
  selectedPart: null,
  ready: false,
  status: 'connected'
});

this.sendToClient(session.composer, {
  type: 'MUSICIAN_JOINED',
  allMusicians: session.musicians
});

this.sendToClient(clientId, {
  type: 'SESSION_JOINED',
  sessionId: message.sessionId,
  parts: session.parts
});
```

}

updateParts(clientId, message) {
const session = this.getSessionByComposer(clientId);
if (session) {
session.parts = message.parts;

```
  session.musicians.forEach(musician => {
    this.sendToClient(musician.id, {
      type: 'PARTS_UPDATED',
      parts: session.parts
    });
  });
}
```

}

selectPart(clientId, message) {
const session = this.getSessionByMusician(clientId);
if (session) {
const musician = session.musicians.find(m => m.id === clientId);
if (musician) {
musician.selectedPart = message.partIndex;
musician.ready = true;

```
    this.sendToClient(session.composer, {
      type: 'MUSICIAN_UPDATED',
      allMusicians: session.musicians
    });
  }
}
```

}

startSession(clientId, message) {
const session = this.getSessionByComposer(clientId);
if (session) {
session.phase = ‘countdown’;
session.startTime = Date.now() + 4000;

```
  this.broadcastToSession(session, {
    type: 'SESSION_STARTING'
  });

  setTimeout(() => {
    session.phase = 'playing';
    this.broadcastToSession(session, {
      type: 'SESSION_STARTED'
    });
  }, 4000);
}
```

}

broadcastToSession(session, message) {
this.sendToClient(session.composer, message);

```
session.musicians.forEach(musician => {
  this.sendToClient(musician.id, message);
});
```

}

sendToClient(clientId, message) {
const client = this.clients.get(clientId);
if (client && client.isConnected) {
setTimeout(() => {
client.onMessage(message);
}, 10 + Math.random() * 30);
}
}

getSessionByComposer(composerId) {
for (let session of this.sessions.values()) {
if (session.composer === composerId) return session;
}
return null;
}

getSessionByMusician(musicianId) {
for (let session of this.sessions.values()) {
if (session.musicians.find(m => m.id === musicianId)) return session;
}
return null;
}
}

const mockServer = new MockWebSocketServer();

const MidiSyncApp = () => {
const [userRole, setUserRole] = useState(’’);
const [isConnected, setIsConnected] = useState(false);
const [roomId, setRoomId] = useState(’’);
const [playerName, setPlayerName] = useState(’’);
const [gamePhase, setGamePhase] = useState(‘lobby’);
const [availableParts, setAvailableParts] = useState([]);
const [selectedPart, setSelectedPart] = useState(null);
const [midiNotes, setMidiNotes] = useState([]);
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [activeNotes, setActiveNotes] = useState(new Set());
const [countdown, setCountdown] = useState(0);
const [connectedMusicians, setConnectedMusicians] = useState([]);
const [connectionStatus, setConnectionStatus] = useState(‘disconnected’);

const startTimeRef = useRef(0);
const animationRef = useRef(null);
const clientIdRef = useRef(Math.random().toString(36).substring(2, 15));

const laneColors = [’#ff6b6b’, ‘#4ecdc4’, ‘#45b7d1’, ‘#96ceb4’];
const laneColorsVibrant = [’#ff2020’, ‘#00ffcc’, ‘#0099ff’, ‘#00ff66’];

// Connexion WebSocket simulée
useEffect(() => {
const handleMessage = (message) => {
console.log(‘Message reçu:’, message);

```
  switch (message.type) {
    case 'connected':
      setConnectionStatus('connected');
      break;
    case 'SESSION_CREATED':
      console.log('Session créée:', message.sessionId);
      break;
    case 'SESSION_JOINED':
      setAvailableParts(message.parts);
      break;
    case 'MUSICIAN_JOINED':
    case 'MUSICIAN_UPDATED':
      if (userRole === 'composer') {
        setConnectedMusicians(message.allMusicians || []);
      }
      break;
    case 'PARTS_UPDATED':
      setAvailableParts(message.parts);
      break;
    case 'SESSION_STARTING':
      setGamePhase('countdown');
      setCountdown(1);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev >= 4) {
            clearInterval(countdownInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      break;
    case 'SESSION_STARTED':
      setGamePhase('playing');
      setIsPlaying(true);
      startTimeRef.current = Date.now();
      break;
  }
};

if (isConnected) {
  mockServer.connect(clientIdRef.current, handleMessage);
}

return () => {
  if (isConnected) {
    mockServer.disconnect(clientIdRef.current);
  }
};
```

}, [isConnected, userRole]);

// Parser MIDI simplifié
const parseMidiFile = async (arrayBuffer) => {
const notes = [];
for (let i = 0; i < 10; i++) {
notes.push({
note: 60 + i,
time: i * 1000 + 6000,
duration: 200,
lane: i % 4,
velocity: 80,
track: 0
});
}
return notes;
};

// Créer des parties de test avec synchronisation
const createTestParts = () => {
const testParts = [];
for (let i = 0; i < 2; i++) {
const notes = [];
for (let j = 0; j < 8; j++) {
notes.push({
note: 60 + i * 3 + j,
time: j * 1000 + 6000,
duration: 200,
lane: j % 4,
velocity: 80,
track: 0
});
}
testParts[i] = {
id: i,
name: `Partie ${i + 1}`,
fileName: `test-partie-${i + 1}.mid`,
notes: notes
};
}
setAvailableParts(testParts);

```
if (userRole === 'composer') {
  mockServer.send(clientIdRef.current, {
    type: 'UPDATE_PARTS',
    parts: testParts
  });
}
```

};

// Ajouter des musiciens de test
const addTestMusicians = () => {
const testMusicians = [
{ name: ‘Alice’, id: ‘test1’, selectedPart: 0, ready: true, status: ‘connected’ },
{ name: ‘Bob’, id: ‘test2’, selectedPart: null, ready: false, status: ‘connected’ },
{ name: ‘Charlie’, id: ‘test3’, selectedPart: 1, ready: true, status: ‘connected’ }
];
setConnectedMusicians(testMusicians);
};

// Démarrage de session avec synchronisation réseau
const startSession = () => {
if (availableParts.length === 0) {
alert(‘Créez d'abord des parties de test !’);
return;
}

```
mockServer.send(clientIdRef.current, {
  type: 'START_SESSION'
});
```

};

// Sélection de partie avec synchronisation
const selectPart = (partIndex) => {
setSelectedPart(partIndex);
setMidiNotes(availableParts[partIndex].notes);

```
mockServer.send(clientIdRef.current, {
  type: 'SELECT_PART',
  partIndex
});
```

};

// Créer session avec réseau
const createSession = () => {
const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
setRoomId(newRoomId);
setPlayerName(‘Compositeur’);
setIsConnected(true);

```
mockServer.send(clientIdRef.current, {
  type: 'CREATE_SESSION',
  sessionId: newRoomId
});
```

};

// Rejoindre session automatiquement (sans code)
const joinSession = () => {
setIsConnected(true);

```
// Demander la session active au serveur (pas de code nécessaire)
sendToServer('JOIN_ACTIVE_SESSION', {
  playerName
});
```

};

// Position des notes
const getNotePosition = (noteTime) => {
const elapsed = Date.now() - startTimeRef.current;
const relativeTime = noteTime - elapsed;
return ((6000 - relativeTime) / 6000) * 100;
};

// Clic sur piste
const handleLaneClick = (laneIndex) => {
if (!isPlaying) return;

```
const hittableNotes = midiNotes.filter(note => {
  if (note.lane !== laneIndex || activeNotes.has(`${note.time}-${note.note}`)) return false;
  const position = getNotePosition(note.time);
  return position >= 64 && position <= 68;
});

if (hittableNotes.length > 0) {
  const bestNote = hittableNotes[0];
  setActiveNotes(prev => new Set([...prev, `${bestNote.time}-${bestNote.note}`]));
}
```

};

// Animation
useEffect(() => {
const animate = () => {
if (isPlaying) {
const elapsed = Date.now() - startTimeRef.current;
setCurrentTime(elapsed);
}
animationRef.current = requestAnimationFrame(animate);
};

```
animationRef.current = requestAnimationFrame(animate);
return () => {
  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
  }
};
```

}, [isPlaying]);

// Retour au menu
const returnToMenu = () => {
setUserRole(’’);
setIsConnected(false);
setRoomId(’’);
setPlayerName(’’);
setGamePhase(‘lobby’);
setAvailableParts([]);
setSelectedPart(null);
setMidiNotes([]);
setIsPlaying(false);
setCurrentTime(0);
setActiveNotes(new Set());
setCountdown(0);
setConnectedMusicians([]);
setConnectionStatus(‘disconnected’);
};

// Utilitaires
const formatTime = (ticks) => {
const seconds = Math.floor(ticks / 120);
const minutes = Math.floor(seconds / 60);
return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
};

// Sélection du rôle
if (!userRole) {
return (
<div className="min-h-screen bg-gray-900 text-white p-4">
<div className="max-w-md mx-auto mt-20">
<h1 className="text-3xl font-bold text-center mb-8">MIDI Sync</h1>
<div className="space-y-4">
<h2 className="text-xl text-center mb-6">Choisissez votre rôle</h2>

```
        <button
          onClick={() => setUserRole('composer')}
          className="w-full p-4 bg-purple-600 rounded hover:bg-purple-700 text-left"
        >
          <div className="text-lg font-bold">🎼 Compositeur</div>
          <div className="text-sm text-purple-200">
            Créer une session, gérer les fichiers MIDI
          </div>
        </button>

        <button
          onClick={() => setUserRole('user')}
          className="w-full p-4 bg-blue-600 rounded hover:bg-blue-700 text-left"
        >
          <div className="text-lg font-bold">🎵 Musicien</div>
          <div className="text-sm text-blue-200">
            Rejoindre une session, choisir une partie
          </div>
        </button>
      </div>
    </div>
  </div>
);
```

}

// Interface de connexion
if (!isConnected) {
return (
<div className="min-h-screen bg-gray-900 text-white p-4">
<div className="max-w-md mx-auto mt-20">
<div className="flex items-center mb-6">
<button
onClick={() => setUserRole(’’)}
className=“mr-3 text-gray-400 hover:text-white”
>
← Retour
</button>
<h1 className="text-2xl font-bold">
{userRole === ‘composer’ ? ‘🎼 Compositeur’ : ‘🎵 Musicien’}
</h1>
</div>

```
      <div className="space-y-4">
        {userRole === 'user' && (
          <input
            type="text"
            placeholder="Votre nom"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-3 bg-gray-800 rounded border border-gray-600 text-white"
          />
        )}

        {userRole === 'composer' ? (
          <button
            onClick={createSession}
            className="w-full p-3 bg-purple-600 rounded hover:bg-purple-700"
          >
            Créer une session
          </button>
        ) : (
          <button
            onClick={joinSession}
            disabled={!playerName}
            className="w-full p-3 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600"
          >
            Rejoindre la session active
          </button>
        )}
      </div>
    </div>
  </div>
);
```

}

// Interface Compositeur
if (userRole === ‘composer’) {
// Interface compositeur pendant la session active
if (gamePhase === ‘playing’) {
return (
<div className="flex flex-col h-screen bg-gray-900 text-white">
<div className="bg-gray-800 p-4 border-b border-gray-700">
<div className="flex items-center justify-between">
<div className="flex items-center space-x-4">
<span className="text-2xl">🎼</span>
<h1 className="text-xl font-bold">Vue Compositeur - Session: {roomId}</h1>
<div className={`px-2 py-1 rounded text-xs ${ connectionStatus === 'connected' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300' }`}>
{connectionStatus === ‘connected’ ? ‘🌐 Connecté’ : ‘🌐 Déconnecté’}
</div>
</div>
<div className="flex items-center space-x-6">
<div className="text-sm text-gray-300">
👥 {connectedMusicians.filter(m => m.ready).length}/{connectedMusicians.length} actifs
</div>
<button
onClick={() => {
setIsPlaying(false);
setGamePhase(‘lobby’);
}}
className=“px-4 py-2 bg-red-600 rounded hover:bg-red-700”
>
⏹ Arrêter Session
</button>
</div>
</div>
</div>

```
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 p-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Piano Roll - Vue d'ensemble</h2>
        </div>

        <div className="flex-1 p-4">
          <div className="bg-black rounded-lg h-full flex items-center justify-center">
            <div className="text-center text-white">
              <h3 className="text-2xl mb-4">🎵 Interface Compositeur Active</h3>
              <p className="text-gray-400 mb-6">Piano roll unifié - Vue d'ensemble des musiciens</p>

              <div className="space-y-4 mb-8">
                {connectedMusicians.length > 0 ? connectedMusicians.map(musician => (
                  <div key={musician.id} className="flex items-center justify-center space-x-4">
                    <div className={`w-4 h-4 rounded ${
                      musician.ready ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span>{musician.name}</span>
                    <span className={`text-sm ${
                      musician.ready ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {musician.ready ? '✓ Prêt' : '⏸ En attente'}
                    </span>
                  </div>
                )) : (
                  <div className="text-gray-500">Aucun musicien connecté</div>
                )}
              </div>

              <div className="text-sm text-gray-500">
                <p>👥 {connectedMusicians.filter(m => m.ready).length}/{connectedMusicians.length} musiciens actifs</p>
                <p className={`🌐 ${connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                  Réseau: {connectionStatus === 'connected' ? 'Synchronisé' : 'Déconnecté'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lobby compositeur
return (
  <div className="min-h-screen bg-gray-900 text-white p-4">
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">🎼 Session: {roomId}</h1>
          <div className={`px-2 py-1 rounded text-xs ${
            connectionStatus === 'connected' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {connectionStatus === 'connected' ? '🌐 Connecté' : '🌐 Déconnecté'}
          </div>
        </div>
        <button
          onClick={returnToMenu}
          className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
        >
          🏠 Menu
        </button>
      </div>

      {/* Participants */}
      <div className="bg-gray-800 rounded p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl">👥 Participants ({connectedMusicians.length})</h2>
          <button
            onClick={addTestMusicians}
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
          >
            + Ajouter musiciens test
          </button>
        </div>

        {connectedMusicians.length > 0 ? (
          <div className="space-y-2">
            {connectedMusicians.map((musician) => (
              <div key={musician.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${musician.ready ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <span>{musician.name}</span>
                </div>
                <div className="text-sm text-gray-300">
                  {musician.selectedPart !== null ? `Partie ${musician.selectedPart + 1}` : 'En attente'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            Aucun musicien connecté. Code: <span className="text-yellow-400">{roomId}</span>
          </div>
        )}
      </div>

      {/* Parties MIDI */}
      <div className="bg-gray-800 rounded p-4 mb-6">
        <h2 className="text-xl mb-4">📁 Parties MIDI ({availableParts.length})</h2>
        <button
          onClick={createTestParts}
          className="w-full p-2 bg-blue-600 rounded hover:bg-blue-700 text-sm mb-4"
        >
          🧪 Créer parties de test
        </button>

        {availableParts.length > 0 && (
          <div className="space-y-2">
            {availableParts.map((part, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded">
                <div className="text-green-400 text-sm">✅ {part.fileName}</div>
                <div className="text-xs text-gray-400">{part.notes.length} notes</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Démarrage */}
      <div className="bg-gray-800 rounded p-4">
        <h2 className="text-xl mb-4">🚀 Contrôle</h2>
        <button
          onClick={startSession}
          className="w-full p-4 bg-green-600 rounded hover:bg-green-700 text-xl font-bold"
        >
          ▶ DÉMARRER LA SESSION
        </button>
        <div className="text-center mt-2 text-sm text-gray-400">
          Parties: {availableParts.length} | Musiciens: {connectedMusicians.length}
        </div>
      </div>

      {/* Décompte */}
      {gamePhase === 'countdown' && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-3xl mb-8 text-white">Décompte musical</h2>
            <div className="text-9xl font-bold mb-4" style={{
              color: countdown === 1 ? '#ff6b6b' :
                     countdown === 2 ? '#4ecdc4' :
                     countdown === 3 ? '#45b7d1' : '#96ceb4'
            }}>
              {countdown}
            </div>
            <div className="text-xl text-gray-300">
              {countdown === 1 ? "Un" :
               countdown === 2 ? "Deux" :
               countdown === 3 ? "Trois" : "Quatre"}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
```

}

// Interface Musicien
return (
<div className="min-h-screen bg-gray-900 text-white">
<div className="bg-gray-800 p-4 flex justify-between items-center">
<div className="flex items-center space-x-4">
<span>🎵 Session: {roomId}</span>
<div className={`px-2 py-1 rounded text-xs ${ connectionStatus === 'connected' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300' }`}>
{connectionStatus === ‘connected’ ? ‘🌐 Connecté’ : ‘🌐 Déconnecté’}
</div>
</div>
<button onClick={returnToMenu} className="px-3 py-1 bg-gray-600 rounded">🏠</button>
</div>

```
  <div className="relative h-screen bg-black overflow-hidden">
    {/* Interface de jeu */}
    {selectedPart !== null && (
      <>
        {/* Pistes avec ligne blanche */}
        <div className="absolute inset-0 flex">
          {[0, 1, 2, 3].map(lane => (
            <div
              key={lane}
              className="flex-1 border-r border-gray-700 relative cursor-pointer"
              style={{ backgroundColor: `${laneColors[lane]}05` }}
              onClick={() => handleLaneClick(lane)}
            >
              <div
                className="absolute left-0 right-0 h-2 bg-white shadow-lg"
                style={{
                  top: '66%',
                  boxShadow: '0 0 20px #ffffff',
                  animation: gamePhase === 'countdown' ? 'pulse 1s ease-in-out infinite' : 'none'
                }}
              />

              <div className="absolute top-2 left-2 text-xs text-gray-400">
                Piste {lane + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Notes qui tombent */}
        {isPlaying && midiNotes.map((note, index) => {
          const position = getNotePosition(note.time);
          if (position > 110 || position < -10) return null;

          const isOnCenter = position >= 64 && position <= 68;
          const noteId = `${note.time}-${note.note}`;
          const isHit = activeNotes.has(noteId);

          return (
            <div
              key={noteId}
              className="absolute rounded shadow-lg transition-none"
              style={{
                left: `${note.lane * 25 + 5}%`,
                width: '15%',
                height: '40px',
                top: `${position}%`,
                backgroundColor: isOnCenter && !isHit ? laneColorsVibrant[note.lane] : laneColors[note.lane],
                border: `2px solid ${isOnCenter && !isHit ? '#ffffff' : laneColors[note.lane]}`,
                opacity: isHit ? 0.5 : 1,
                transform: isOnCenter && !isHit ? 'scale(1.2)' : 'scale(1)'
              }}
            >
              <div className="h-full flex items-center justify-center text-black font-bold text-xs">
                {note.note}
              </div>
            </div>
          );
        })}
      </>
    )}

    {/* Sélection de partie */}
    {gamePhase === 'lobby' && selectedPart === null && (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
        <div className="bg-gray-800 p-6 rounded text-center">
          <h2 className="text-xl mb-4">Choisir votre partie</h2>
          {availableParts.length > 0 ? (
            <div className="space-y-2">
              {availableParts.map((part, index) => (
                <button
                  key={index}
                  onClick={() => selectPart(index)}
                  className="w-full p-3 bg-blue-600 rounded hover:bg-blue-700 text-left"
                >
                  <div className="font-bold">Partie {index + 1}</div>
                  <div className="text-sm opacity-75">{part.fileName}</div>
                  <div className="text-xs">{part.notes.length} notes</div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">En attente des parties du compositeur...</p>
          )}
        </div>
      </div>
    )}

    {/* Attente du démarrage */}
    {gamePhase === 'lobby' && selectedPart !== null && (
      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20">
        <div className="bg-gray-800 bg-opacity-90 p-6 rounded text-center">
          <h2 className="text-xl mb-4">🎵 Partie sélectionnée</h2>
          <div className="text-lg text-green-400 mb-2">
            Partie {selectedPart + 1}
          </div>
          <div className="text-gray-300 mb-4">
            {availableParts[selectedPart]?.fileName}
          </div>
          <p className="text-blue-400">
            En attente du démarrage par le compositeur...
          </p>
        </div>
      </div>
    )}

    {/* Décompte */}
    {gamePhase === 'countdown' && (
      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40">
        <div className="text-center">
          <h2 className="text-2xl mb-6 text-white">Décompte musical</h2>
          <div className="text-8xl font-bold mb-4 transition-all duration-200" style={{
            color: countdown === 1 ? '#ff6b6b' :
                   countdown === 2 ? '#4ecdc4' :
                   countdown === 3 ? '#45b7d1' : '#96ceb4',
            textShadow: `0 0 30px ${
              countdown === 1 ? '#ff6b6b' :
              countdown === 2 ? '#4ecdc4' :
              countdown === 3 ? '#45b7d1' : '#96ceb4'
            }`
          }}>
            {countdown}
          </div>
          <div className="text-xl text-gray-300 mb-4">
            {countdown === 1 ? "Un" :
             countdown === 2 ? "Deux" :
             countdown === 3 ? "Trois" : "Quatre"}
          </div>
          <div className="text-sm text-gray-400 mb-6">
            Préparez-vous sur la ligne blanche
          </div>
        </div>
      </div>
    )}

    {/* Instructions de jeu */}
    {isPlaying && currentTime < 3000 && (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-black bg-opacity-75 p-3 rounded text-center">
          <p className="text-white text-sm">👆 Cliquez dans les colonnes</p>
          <p className="text-yellow-400 text-xs">au moment où les notes traversent la ligne blanche</p>
        </div>
      </div>
    )}
  </div>
</div>
```

);
};

export default MidiSyncApp;