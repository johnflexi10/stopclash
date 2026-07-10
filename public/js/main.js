// Serverless MQTT client logic - global cloud broker integration
let mqttClient = null;
const state = new GameStateManager();
let clientId = 'p_' + Math.random().toString(36).substring(2, 11);

// Suffix to avoid topic collisions on public broker
const TOPIC_PREFIX = 'stopclash/rooms';
let hostHeartbeatInterval = null;
let lastHeartbeatTime = Date.now();
let hostCheckInterval = null;

// Throttled keyboard updates to Host
let updateTimeout = null;
function sendTempAnswers() {
  if (state.isMultiplayer) {
    sendGameAction('update-temp', { answers: state.answers });
  }
}

function handleInputUpdate(cat, value) {
  state.answers[cat] = value;
  
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(sendTempAnswers, 1500); // 1.5s throttle
}

// Global action dispatcher (used by game.js and main.js)
window.sendGameAction = function(type, data = {}, callback = null) {
  if (!state.isMultiplayer || !mqttClient || !mqttClient.connected) {
    return;
  }

  const payload = {
    action: type,
    playerId: clientId,
    senderName: state.playerName,
    timestamp: Date.now(),
    ...data
  };

  const topic = `${TOPIC_PREFIX}/${state.roomCode}/actions/${clientId}`;
  
  if (callback) {
    // Single-use subscription for responses (e.g. Spy peeking)
    const msgId = 'm_' + Math.random().toString(36).substring(2, 9);
    payload.msgId = msgId;
    
    const responseTopic = `${TOPIC_PREFIX}/${state.roomCode}/responses/${clientId}`;
    
    const responseHandler = (topic, message) => {
      try {
        const res = JSON.parse(message.toString());
        if (res.msgId === msgId) {
          callback(res);
          mqttClient.off('message', responseHandler); // unsubscribe after reply
        }
      } catch (e) {}
    };

    mqttClient.on('message', responseHandler);
  }

  mqttClient.publish(topic, JSON.stringify(payload));
};

// Initialize MQTT client connection
function initMqtt(onConnectCallback) {
  if (mqttClient) {
    onConnectCallback();
    return;
  }

  const indicator = document.getElementById('connection-status');
  if (indicator) {
    indicator.className = 'status-indicator status-reconnecting';
    indicator.title = 'Conectando ao Broker...';
  }

  // Connect to free public HiveMQ Broker over secure WebSockets
  mqttClient = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
    clientId: 'stop_' + clientId,
    keepalive: 60,
    reconnectPeriod: 2000,
    connectTimeout: 5000,
    clean: true
  });

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT public broker');
    if (indicator) {
      indicator.className = 'status-indicator status-connected';
      indicator.title = 'Conectado à nuvem';
    }
    if (onConnectCallback) onConnectCallback();
  });

  mqttClient.on('close', () => {
    console.warn('MQTT Connection closed');
    if (indicator) {
      indicator.className = 'status-indicator status-disconnected';
      indicator.title = 'Sem conexão com a nuvem';
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT Error', err);
    if (indicator) {
      indicator.className = 'status-indicator status-disconnected';
      indicator.title = 'Erro de rede';
    }
  });

  // Handle incoming messages
  mqttClient.on('message', (topic, message) => {
    const topicParts = topic.split('/');
    // Format: stopclash/rooms/CODE/state
    // Format: stopclash/rooms/CODE/actions/ID
    const roomCode = topicParts[2];
    const subTopic = topicParts[3];

    if (roomCode !== state.roomCode) return;

    try {
      const payload = JSON.parse(message.toString());

      if (subTopic === 'state') {
        handleStateUpdate(payload);
      } else if (subTopic === 'actions' && state.isHost) {
        const senderId = topicParts[4];
        handleClientAction(senderId, payload);
      }
    } catch (e) {
      console.error('Error processing message', e);
    }
  });
}

// -------------------------------------------------------------
// HOST SPECIFIC GAME LOGIC (Serverless replacement for server.js)
// -------------------------------------------------------------

function startHostHeartbeat() {
  if (hostHeartbeatInterval) clearInterval(hostHeartbeatInterval);
  
  hostHeartbeatInterval = setInterval(() => {
    broadcastState();
  }, 2500); // Send heartbeat state every 2.5s
}

function broadcastState() {
  if (!state.isHost || !mqttClient || !mqttClient.connected) return;

  const roomState = {
    hostId: state.playerId,
    state: state.mode,
    categories: state.categories,
    duration: state.duration,
    currentRound: state.currentRound,
    letter: state.letter,
    stopPressedBy: state.stopPressedBy,
    endTime: state.endTime,
    players: state.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      roundScore: p.roundScore,
      ready: p.ready,
      active: p.active,
      joinTime: p.joinTime
    })),
    playersAnswers: state.playersAnswers
  };

  const topic = `${TOPIC_PREFIX}/${state.roomCode}/state`;
  mqttClient.publish(topic, JSON.stringify(roomState), { retain: true });
}

function handleClientAction(senderId, data) {
  const player = state.players.find(p => p.id === senderId);

  // If a player joins
  if (data.action === 'join') {
    if (state.mode !== 'LOBBY') return;
    if (state.players.length >= 15) return;

    const exists = state.players.some(p => p.id === senderId);
    if (!exists) {
      state.players.push({
        id: senderId,
        name: data.name,
        score: 0,
        roundScore: 0,
        ready: false,
        active: true,
        joinTime: data.joinTime || Date.now()
      });
      console.log(`Player ${data.name} joined`);
      broadcastState();
    }
    return;
  }

  if (!player) return;

  // Mark player active on any incoming action
  player.active = true;

  switch (data.action) {
    case 'update-temp':
      if (state.mode === 'PLAYING') {
        player.answers = data.answers;
      }
      break;

    case 'submit':
      if (state.mode === 'PLAYING') {
        player.answers = data.answers;
        player.doubleCategory = data.doubleCategory;
        player.ready = true;

        // Check if everyone is ready
        const activePlayers = state.players.filter(p => p.active);
        if (activePlayers.every(p => p.ready)) {
          endRoundHost();
        } else {
          broadcastState();
        }
      }
      break;

    case 'press-stop':
      if (state.mode === 'PLAYING' && !state.stopPressedBy) {
        state.stopPressedBy = player.name;
        // Adjust remaining time to exactly 5 seconds
        state.endTime = Date.now() + 5000;
        
        broadcastState();

        // Host local round-end timer override
        if (window.hostRoundTimer) clearTimeout(window.hostRoundTimer);
        window.hostRoundTimer = setTimeout(() => {
          if (state.mode === 'PLAYING') endRoundHost();
        }, 5000);
      }
      break;

    case 'vote':
      if (state.mode === 'REVIEW') {
        const voteKey = `${senderId}_${data.targetPlayerId}_${data.category}`;
        state.votesReceived[voteKey] = data.isInvalid;
      }
      break;

    case 'finish-review':
      if (state.mode === 'REVIEW' && senderId === state.playerId) { // host only trigger
        state.calculateMultiplayerScores();
        state.mode = 'SCOREBOARD';
        broadcastState();
      }
      break;

    case 'next-round':
      if (state.mode === 'SCOREBOARD' && senderId === state.playerId) {
        startNewRoundHost();
      }
      break;

    case 'update-settings':
      if (state.mode === 'LOBBY' && senderId === state.playerId) {
        state.categories = data.categories;
        state.duration = data.duration;
        broadcastState();
      }
      break;

    case 'request-spy':
      if (state.mode === 'PLAYING') {
        const target = state.players.find(p => p.id === data.targetPlayerId);
        const ans = target && target.answers ? (target.answers[data.category] || '') : '';
        
        // Respond directly to the client's responses topic
        const resTopic = `${TOPIC_PREFIX}/${state.roomCode}/responses/${senderId}`;
        const reply = { msgId: data.msgId, answer: ans };
        mqttClient.publish(resTopic, JSON.stringify(reply));
      }
      break;

    case 'leave':
      player.active = false;
      broadcastState();
      break;
  }
}

function startNewRoundHost() {
  if (window.hostRoundTimer) clearTimeout(window.hostRoundTimer);

  state.currentRound += 1;
  state.mode = 'PLAYING';
  state.stopPressedBy = '';
  
  // Reset players ready status and round variables
  state.players.forEach(p => {
    p.ready = false;
    p.answers = {};
    p.doubleCategory = '';
    p.roundScore = 0;
  });
  state.votesReceived = {};

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUV'.split('');
  state.letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];

  state.endTime = Date.now() + state.duration * 1000;
  
  broadcastState();

  // Set standard timer callback
  window.hostRoundTimer = setTimeout(() => {
    if (state.mode === 'PLAYING') {
      endRoundHost();
    }
  }, state.duration * 1000);
}

function endRoundHost() {
  if (window.hostRoundTimer) clearTimeout(window.hostRoundTimer);
  state.mode = 'REVIEW';

  // Consolidate answers
  state.playersAnswers = state.players.map(p => ({
    id: p.id,
    name: p.name,
    answers: p.answers || {},
    doubleCategory: p.doubleCategory || ''
  }));

  broadcastState();
}

// -------------------------------------------------------------
// CLIENT SPECIFIC LOGIC (Receiving states, lobby checks, heartbeat timers)
// -------------------------------------------------------------

function handleStateUpdate(roomState) {
  lastHeartbeatTime = Date.now();

  // Sync isHost state
  const wasHost = state.isHost;
  state.isHost = roomState.hostId === state.playerId;

  if (state.isHost && !wasHost) {
    // Promoted to Host!
    console.log('You were promoted to Host!');
    alert('Você é o novo Host da sala!');
    
    // Stop host check and start heartbeating
    if (hostCheckInterval) clearInterval(hostCheckInterval);
    
    // Sub actions channel
    const actionTopic = `${TOPIC_PREFIX}/${state.roomCode}/actions/#`;
    mqttClient.subscribe(actionTopic);
    
    startHostHeartbeat();
  }

  // Handle stage transition effects
  if (roomState.state !== state.mode) {
    if (roomState.state === 'PLAYING') {
      sound.playStart();
      state.answers = {};
      state.doubleCategory = '';
      state.votesCast = {};
    } else if (roomState.state === 'REVIEW') {
      sound.playBuzzer();
      if (state.timerInterval) clearInterval(state.timerInterval);
      
      // Auto-submit our local answers if we haven't already
      sendGameAction('submit', { answers: state.answers, doubleCategory: state.doubleCategory });
    } else if (roomState.state === 'SCOREBOARD') {
      sound.playVictory();
    }
  }

  // Update parameters
  state.mode = roomState.state;
  state.categories = roomState.categories;
  state.duration = roomState.duration;
  state.currentRound = roomState.currentRound;
  state.letter = roomState.letter;
  state.stopPressedBy = roomState.stopPressedBy;
  state.endTime = roomState.endTime;
  state.players = roomState.players;
  state.playersAnswers = roomState.playersAnswers;

  // Client side active timer ticks during PLAYING state
  if (state.mode === 'PLAYING') {
    state.startLocalTimer();
  }

  state.render();
}

// Check if Host goes missing and promote next player
function startHostCheck() {
  if (hostCheckInterval) clearInterval(hostCheckInterval);

  hostCheckInterval = setInterval(() => {
    if (state.isHost || !state.isMultiplayer) return;

    const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTime;
    
    // If no heartbeat for 8 seconds (roughly 3 heartbeats missed)
    if (timeSinceLastHeartbeat > 8000) {
      console.warn('Host missing! Searching next active host...');
      
      // Filter active players and sort by joinTime
      const activePlayers = state.players.filter(p => p.active);
      activePlayers.sort((a, b) => a.joinTime - b.joinTime);

      if (activePlayers.length > 0 && activePlayers[0].id === state.playerId) {
        // I am the oldest player! Auto-promote to host
        state.isHost = true;
        state.votesReceived = {}; // reset votes mapping
        
        console.log('Elected as new Host. Initializing action listener...');
        
        const actionTopic = `${TOPIC_PREFIX}/${state.roomCode}/actions/#`;
        mqttClient.subscribe(actionTopic, () => {
          startHostHeartbeat();
        });
      }
    }
  }, 2000);
}

// -------------------------------------------------------------
// USER CLICK & EVENT ROUTING
// -------------------------------------------------------------

function setupEventListeners() {
  const container = document.getElementById('game-container');
  if (!container) return;

  // Keyup listener on inputs (PLAYING state)
  container.addEventListener('input', (e) => {
    if (e.target && e.target.classList.contains('category-input-field')) {
      const cat = e.target.dataset.cat;
      const val = e.target.value;
      handleInputUpdate(cat, val);
    }
  });

  // Click Handler Delegation
  container.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;

    // --- LOBBY SELECT VIEW ACTIONS ---
    if (target.id === 'btn-create-lobby') {
      const nameInput = document.getElementById('player-name-input');
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) return alert('Por favor, digite seu apelido!');
      
      state.saveSessionName(name);
      state.playerName = name;

      initMqtt(() => {
        // Generate random room code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        state.roomCode = code;
        state.playerId = clientId;
        state.isHost = true;
        state.players = [{
          id: clientId,
          name: name,
          score: 0,
          roundScore: 0,
          ready: false,
          active: true,
          joinTime: Date.now()
        }];
        state.categories = ['Nome', 'Animal', 'Cor', 'Objeto', 'Fruta', 'Lugar'];
        state.duration = 60;
        state.mode = 'LOBBY';
        state.isMultiplayer = true;
        state.votesReceived = {};

        // Subscribe to state changes and actions
        const stateTopic = `${TOPIC_PREFIX}/${code}/state`;
        const actionTopic = `${TOPIC_PREFIX}/${code}/actions/#`;
        const responseTopic = `${TOPIC_PREFIX}/${code}/responses/${clientId}`;
        
        mqttClient.subscribe([stateTopic, actionTopic, responseTopic], () => {
          console.log(`Host created room ${code}`);
          startHostHeartbeat();
          state.render();
        });
      });
    }

    if (target.id === 'btn-join-lobby') {
      const nameInput = document.getElementById('player-name-input');
      const codeInput = document.getElementById('room-code-input');
      const name = nameInput ? nameInput.value.trim() : '';
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

      if (!name) return alert('Por favor, digite seu apelido!');
      if (!code || code.length !== 4) return alert('Por favor, digite um código de 4 caracteres!');

      state.saveSessionName(name);
      state.playerName = name;

      initMqtt(() => {
        state.roomCode = code;
        state.playerId = clientId;
        state.isHost = false;
        state.isMultiplayer = true;

        // Subscribing to state and player response channel
        const stateTopic = `${TOPIC_PREFIX}/${code}/state`;
        const responseTopic = `${TOPIC_PREFIX}/${code}/responses/${clientId}`;
        
        mqttClient.subscribe([stateTopic, responseTopic], () => {
          console.log(`Subscribed to room ${code}. Sending join request...`);
          
          // Publish join action
          sendGameAction('join', { name: name, joinTime: Date.now() });

          // Join timeout in case host doesn't exist
          let attempts = 0;
          const joinCheck = setInterval(() => {
            if (state.mode === 'LOBBY') {
              clearInterval(joinCheck);
              startHostCheck(); // start checking for host activity
            } else {
              attempts++;
              if (attempts >= 4) { // 4 seconds without response
                clearInterval(joinCheck);
                alert('Não foi possível conectar a esta sala. Verifique o código ou se o Host está ativo.');
                if (mqttClient) {
                  mqttClient.end();
                  mqttClient = null;
                }
                state.mode = 'LOBBY_SELECT';
                state.render();
              } else {
                // Retry join request
                sendGameAction('join', { name: name, joinTime: Date.now() });
              }
            }
          }, 1000);
        });
      });
    }

    if (target.id === 'btn-play-solo') {
      const nameInput = document.getElementById('player-name-input');
      const name = nameInput ? nameInput.value.trim() : 'Jogador Solo';
      state.saveSessionName(name);
      state.playerName = name;
      state.startSoloGame(60);
    }

    // --- LOBBY VIEW ACTIONS ---
    if (target.id === 'btn-start-game') {
      state.playBtnSound();
      if (state.isMultiplayer && state.isHost) {
        startNewRoundHost();
      } else {
        state.startSoloRound();
      }
    }

    if (target.id === 'btn-edit-categories') {
      state.playBtnSound();
      const customCats = prompt('Digite as categorias separadas por vírgula (máx 8):', state.categories.join(', '));
      if (customCats) {
        const parsed = customCats.split(',').map(c => c.trim()).filter(Boolean);
        if (parsed.length > 0) {
          const cut = parsed.slice(0, 8);
          if (state.isMultiplayer && state.isHost) {
            sendGameAction('update-settings', { categories: cut, duration: state.duration });
          } else {
            state.categories = cut;
            state.render();
          }
        }
      }
    }

    if (target.id === 'btn-exit-lobby' || target.id === 'btn-exit-game') {
      state.playBtnSound();
      if (state.timerInterval) clearInterval(state.timerInterval);
      if (window.hostRoundTimer) clearTimeout(window.hostRoundTimer);
      if (hostHeartbeatInterval) clearInterval(hostHeartbeatInterval);
      if (hostCheckInterval) clearInterval(hostCheckInterval);

      if (state.isMultiplayer && mqttClient) {
        sendGameAction('leave');
        mqttClient.end();
        mqttClient = null;
      }

      state.mode = 'LOBBY_SELECT';
      state.isMultiplayer = false;
      state.render();
    }

    // --- PLAYING VIEW ACTIONS ---
    if (target.classList.contains('btn-powerup-oracle')) {
      const cat = target.dataset.cat;
      state.useOracle(cat);
    }

    if (target.classList.contains('btn-powerup-spy')) {
      const cat = target.dataset.cat;
      state.useSpy(cat);
    }

    if (target.classList.contains('btn-powerup-double')) {
      const cat = target.dataset.cat;
      state.toggleDouble(cat);
    }

    if (target.id === 'btn-stop-round') {
      state.triggerStop();
    }

    // --- REVIEW VIEW ACTIONS ---
    if (target.classList.contains('btn-vote-down')) {
      const targetId = target.dataset.target;
      const cat = target.dataset.cat;
      const voteKey = `${targetId}_${cat}`;
      
      const wasDownvoted = state.votesCast[voteKey] === true;
      state.votesCast[voteKey] = !wasDownvoted;
      
      sound.playClick();
      
      const row = document.getElementById(`row-${voteKey}`);
      if (row) {
        if (!wasDownvoted) {
          row.classList.add('review-row-downvoted');
          target.classList.add('vote-active');
        } else {
          row.classList.remove('review-row-downvoted');
          target.classList.remove('vote-active');
        }
      }

      if (state.isMultiplayer) {
        sendGameAction('vote', {
          targetPlayerId: targetId,
          category: cat,
          isInvalid: !wasDownvoted
        });
      }
    }

    if (target.id === 'btn-finish-review') {
      state.playBtnSound();
      if (state.isMultiplayer && state.isHost) {
        state.calculateMultiplayerScores();
        state.mode = 'SCOREBOARD';
        broadcastState();
      } else if (!state.isMultiplayer) {
        state.calculateSoloScores();
      }
    }

    // --- SCOREBOARD VIEW ACTIONS ---
    if (target.id === 'btn-next-round') {
      state.playBtnSound();
      if (state.isMultiplayer && state.isHost) {
        startNewRoundHost();
      } else if (!state.isMultiplayer) {
        state.startSoloRound();
      }
    }
  });

  // Handle select inputs changes
  container.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'select-duration') {
      const duration = parseInt(e.target.value, 10);
      if (state.isMultiplayer && state.isHost) {
        sendGameAction('update-settings', { categories: state.categories, duration: duration });
      } else {
        state.duration = duration;
      }
    }
  });
}

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  state.render();
});
