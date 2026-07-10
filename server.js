const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA (app.use catches all unmatched routes)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rooms database in memory
const rooms = new Map();
// Mapping of socket.id -> { roomCode, playerName } for quick lookup on disconnect
const clients = new Map();

// Helper to generate a unique room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Letters pool (excluding difficult letters like K, Y, W, X, Z for better gameplay, but customizable)
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUV'.split('');

// Predefined categories
const DEFAULT_CATEGORIES = ['Nome', 'Animal', 'Cor', 'Objeto', 'Fruta', 'Lugar'];

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle joining/creating room
  socket.on('join-room', ({ roomCode, playerName }) => {
    playerName = playerName.trim().substring(0, 15) || 'Jogador';
    let code = roomCode ? roomCode.toUpperCase().trim() : null;
    let room;

    if (!code) {
      // Create new room
      code = generateRoomCode();
      room = {
        code,
        hostId: socket.id,
        players: [],
        state: 'LOBBY', // LOBBY, PLAYING, REVIEW, SCOREBOARD
        letter: '',
        categories: [...DEFAULT_CATEGORIES],
        currentRound: 0,
        roundTimer: null,
        endTime: 0,
        duration: 60, // seconds
        stopPressedBy: null,
        reconnectTokens: new Map() // token -> original player object
      };
      rooms.set(code, room);
    } else {
      room = rooms.get(code);
      if (!room) {
        socket.emit('error-msg', 'Sala não encontrada.');
        return;
      }
    }

    if (room.players.length >= 15) {
      socket.emit('error-msg', 'A sala está cheia (limite de 15 jogadores).');
      return;
    }

    if (room.state !== 'LOBBY') {
      socket.emit('error-msg', 'O jogo já começou nesta sala.');
      return;
    }

    // Add player
    const player = {
      id: socket.id,
      name: playerName,
      score: 0,
      roundScore: 0,
      answers: {}, // category -> value
      doubleCategory: '', // category to double points
      ready: false,
      active: true,
      votes: {}, // targetPlayerId_category -> bool (downvoted or not)
      disconnectedAt: null
    };

    room.players.push(player);
    clients.set(socket.id, { roomCode: code, playerName });

    socket.join(code);
    socket.emit('joined-room', {
      roomCode: code,
      playerId: socket.id,
      isHost: room.hostId === socket.id
    });

    // Notify others
    io.to(code).emit('room-update', getRoomSummary(room));
    console.log(`Player ${playerName} joined room ${code}`);
  });

  // Host starts the game
  socket.on('start-game', () => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.hostId !== socket.id) return;

    startNewRound(room);
  });

  // Receive answers
  socket.on('submit-answers', ({ answers, doubleCategory }) => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.state !== 'PLAYING') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.answers = answers;
    player.doubleCategory = doubleCategory;
    player.ready = true;

    // Check if everyone has submitted
    const activePlayers = room.players.filter(p => p.active);
    const allSubmitted = activePlayers.every(p => p.ready);

    io.to(room.code).emit('player-submitted', { playerId: socket.id });

    if (allSubmitted) {
      endRound(room);
    }
  });

  // Player presses STOP!
  socket.on('press-stop', () => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.state !== 'PLAYING') return;

    room.stopPressedBy = socket.id;
    const player = room.players.find(p => p.id === socket.id);
    const playerName = player ? player.name : 'Alguém';
    
    io.to(room.code).emit('stop-triggered', { playerName });
    
    // Give everyone 5 seconds to finish before locking answers
    setTimeout(() => {
      if (room.state === 'PLAYING') {
        endRound(room);
      }
    }, 5000);
  });

  // Vote on answers
  // targetPlayerId: id of the player being voted on
  // category: the category of the answer
  // isValid: true if downvoted (invalidated), false if ok
  socket.on('vote-answer', ({ targetPlayerId, category, isInvalid }) => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.state !== 'REVIEW') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Register vote
    const voteKey = `${targetPlayerId}_${category}`;
    player.votes[voteKey] = isInvalid;

    // Broadcast vote to all players so UI updates in real-time
    io.to(room.code).emit('vote-update', {
      voterId: socket.id,
      targetPlayerId,
      category,
      isInvalid
    });
  });

  // Host finishes voting and calculates scores
  socket.on('finish-review', () => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'REVIEW') return;

    calculateScores(room);
    room.state = 'SCOREBOARD';
    io.to(room.code).emit('room-update', getRoomSummary(room));
  });

  // Host moves to next round
  socket.on('next-round', () => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'SCOREBOARD') return;

    startNewRound(room);
  });

  // Host updates settings (categories, duration)
  socket.on('update-settings', ({ categories, duration }) => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

    if (Array.isArray(categories) && categories.length > 0) {
      room.categories = categories.map(c => c.trim().substring(0, 20)).filter(Boolean).slice(0, 10);
    }
    if (typeof duration === 'number' && duration >= 20 && duration <= 180) {
      room.duration = duration;
    }

    io.to(room.code).emit('room-update', getRoomSummary(room));
  });

  // Handle request for Spy Power-up
  socket.on('request-spy', ({ targetPlayerId, category }, callback) => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return callback({ error: 'Player info not found' });

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.state !== 'PLAYING') return callback({ error: 'Not in playing state' });

    const target = room.players.find(p => p.id === targetPlayerId);
    if (!target) return callback({ error: 'Target player not found' });

    callback({ answer: target.answers[category] || '' });
  });

  // Client updates their temp answers (throttled, for spy powerup and reconnect backup)
  socket.on('update-temp-answers', ({ answers }) => {
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room || room.state !== 'PLAYING') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.answers = answers;
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const clientInfo = clients.get(socket.id);
    if (!clientInfo) return;

    const room = rooms.get(clientInfo.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.active = false;
      player.disconnectedAt = Date.now();

      // If the host disconnected, reassign host
      if (room.hostId === socket.id) {
        const nextHost = room.players.find(p => p.active);
        if (nextHost) {
          room.hostId = nextHost.id;
          io.to(nextHost.id).emit('host-status', true);
        } else {
          // No active players left, schedule room deletion
          setTimeout(() => {
            const r = rooms.get(clientInfo.roomCode);
            if (r && r.players.every(p => !p.active)) {
              console.log(`Deleting empty room: ${clientInfo.roomCode}`);
              if (r.roundTimer) clearTimeout(r.roundTimer);
              rooms.delete(clientInfo.roomCode);
            }
          }, 60000); // 1 minute grace period
        }
      }

      // Notify other players
      io.to(room.code).emit('room-update', getRoomSummary(room));

      // Check if we need to end the round because of disconnection
      if (room.state === 'PLAYING') {
        const activePlayers = room.players.filter(p => p.active);
        const allSubmitted = activePlayers.every(p => p.ready);
        if (allSubmitted && activePlayers.length > 0) {
          endRound(room);
        }
      }
    }

    clients.delete(socket.id);
  });
});

// Start new round
function startNewRound(room) {
  if (room.roundTimer) clearTimeout(room.roundTimer);

  room.currentRound += 1;
  room.state = 'PLAYING';
  room.stopPressedBy = null;

  // Pick a random letter not used yet
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  room.letter = letter;

  // Reset player round states
  room.players.forEach(p => {
    p.ready = false;
    p.answers = {};
    p.doubleCategory = '';
    p.roundScore = 0;
    p.votes = {};
  });

  room.endTime = Date.now() + room.duration * 1000;
  
  // Send state update
  io.to(room.code).emit('game-started', {
    letter: room.letter,
    categories: room.categories,
    duration: room.duration,
    endTime: room.endTime,
    currentRound: room.currentRound
  });

  // Set timeout for end of round
  room.roundTimer = setTimeout(() => {
    if (room.state === 'PLAYING') {
      endRound(room);
    }
  }, room.duration * 1000);
}

// End playing round
function endRound(room) {
  if (room.roundTimer) clearTimeout(room.roundTimer);
  room.state = 'REVIEW';

  // Force all players to submit their current answers
  io.to(room.code).emit('round-ended', {
    playersAnswers: room.players.map(p => ({
      id: p.id,
      name: p.name,
      answers: p.answers,
      doubleCategory: p.doubleCategory
    }))
  });
}

// Calculate scores for the round
function calculateScores(room) {
  const players = room.players.filter(p => p.active || p.disconnectedAt !== null);
  const categories = room.categories;

  // Reset round scores
  players.forEach(p => {
    p.roundScore = 0;
  });

  // Calculate category by category
  categories.forEach(cat => {
    // Collect all answers for this category, lowercase and trimmed
    const answersMap = new Map(); // normalizedAnswer -> Array of players

    players.forEach(p => {
      const ans = (p.answers[cat] || '').trim();
      // Only count if it starts with the correct letter (case insensitive)
      const isValidLetter = ans.length > 0 && ans.charAt(0).toUpperCase() === room.letter;
      
      if (isValidLetter) {
        const norm = ans.toLowerCase();
        if (!answersMap.has(norm)) {
          answersMap.set(norm, []);
        }
        answersMap.get(norm).push(p);
      }
    });

    // Check votes for invalidation
    // For each player, check if the majority of other players downvoted their answer
    const activePlayerCount = players.length;

    players.forEach(p => {
      const ans = (p.answers[cat] || '').trim();
      if (!ans) return; // blank gets 0

      const norm = ans.toLowerCase();
      
      // Count downvotes for this player's category
      let downvotes = 0;
      players.forEach(voter => {
        if (voter.id !== p.id && voter.votes[`${p.id}_${cat}`] === true) {
          downvotes++;
        }
      });

      // If downvoted by >= 50% of OTHER active players, it's invalid
      const totalVoters = activePlayerCount - 1;
      const isInvalidated = totalVoters > 0 && (downvotes / totalVoters) >= 0.5;

      if (isInvalidated) {
        // 0 points
        return;
      }

      // Check if letter matches (redundant but safe)
      const isValidLetter = ans.charAt(0).toUpperCase() === room.letter;
      if (!isValidLetter) return;

      // Calculate base score
      let basePoints = 0;
      const matchingPlayers = answersMap.get(norm) || [];
      
      if (matchingPlayers.length === 1) {
        basePoints = 10;
      } else if (matchingPlayers.length > 1) {
        basePoints = 5;
      }

      // Apply double powerup
      if (p.doubleCategory === cat) {
        basePoints *= 2;
      }

      p.roundScore += basePoints;
      p.score += basePoints;
    });
  });
}

// Get summary of room state for client
function getRoomSummary(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    categories: room.categories,
    duration: room.duration,
    currentRound: room.currentRound,
    letter: room.letter,
    stopPressedBy: room.stopPressedBy,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      roundScore: p.roundScore,
      ready: p.ready,
      active: p.active
    }))
  };
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
