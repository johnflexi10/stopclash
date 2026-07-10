// Client-side Game State Manager
class GameStateManager {
  constructor() {
    this.mode = 'LOBBY_SELECT'; // LOBBY_SELECT, LOBBY, PLAYING, REVIEW, SCOREBOARD
    this.isMultiplayer = false;
    this.roomCode = '';
    this.playerId = '';
    this.playerName = '';
    this.isHost = false;
    this.renderedMode = ''; // Track currently rendered layout to avoid flickering
    
    this.players = [];
    this.categories = [];
    this.letter = '';
    this.currentRound = 0;
    this.duration = 60;
    this.endTime = 0;
    this.timerInterval = null;
    this.stopPressedBy = '';

    // Player inputs for current round
    this.answers = {};
    this.doubleCategory = '';
    this.powerups = {
      oracle: 1, // 1 hint per game
      spy: 1,    // 1 spy per game
      double: 1  // 1 double per game (automatically resets or single charge)
    };
    
    // Peer answers collected during review
    this.playersAnswers = [];
    
    // Votes cast by this client: key 'targetPlayerId_category' -> true (invalidated)
    this.votesCast = {};
    
    // Votes received (Host only tracking): 'voterId_targetPlayerId_category' -> true
    this.votesReceived = {};

    // Reconnection backup (local storage)
    this.restoreSession();
  }

  sendAction(type, data = {}, callback = null) {
    if (this.isMultiplayer && window.sendGameAction) {
      window.sendGameAction(type, data, callback);
    }
  }

  restoreSession() {
    const savedName = localStorage.getItem('stop_player_name');
    if (savedName) this.playerName = savedName;
  }

  saveSessionName(name) {
    this.playerName = name;
    localStorage.setItem('stop_player_name', name);
  }

  startSoloGame(duration = 60, categories = null) {
    this.isMultiplayer = false;
    this.isHost = true;
    this.playerId = 'local-player';
    this.roomCode = 'SOLO';
    this.categories = categories || ['Nome', 'Animal', 'Cor', 'Objeto', 'Fruta', 'Lugar'];
    this.duration = duration;
    this.players = [
      { id: 'local-player', name: this.playerName || 'Você', score: 0, roundScore: 0, ready: false, active: true },
      { id: 'ai-robot-1', name: 'Bot Galáctico 🤖', score: 0, roundScore: 0, ready: false, active: true },
      { id: 'ai-robot-2', name: 'Bot Veloz ⚡', score: 0, roundScore: 0, ready: false, active: true }
    ];
    this.currentRound = 0;
    this.powerups = { oracle: 1, spy: 1, double: 1 };
    
    this.startSoloRound();
  }

  startSoloRound() {
    this.currentRound++;
    this.mode = 'PLAYING';
    this.stopPressedBy = '';
    this.answers = {};
    this.doubleCategory = '';
    this.votesCast = {};

    // Pick random letter from pool
    const letters = 'ABCDEFGHIJKLMNOPQRSTUV'.split('');
    this.letter = letters[Math.floor(Math.random() * letters.length)];

    this.endTime = Date.now() + this.duration * 1000;
    sound.playStart();

    this.startLocalTimer(() => {
      this.endSoloRound();
    });

    this.render();
  }

  startLocalTimer(onComplete) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
      
      // Update timer element directly for smoothness
      const timerBar = document.getElementById('timer-bar');
      const timerText = document.getElementById('timer-text');
      if (timerBar && timerText) {
        const pct = (remaining / this.duration) * 100;
        timerBar.style.width = `${pct}%`;
        timerText.textContent = `${remaining}s`;
        if (remaining <= 5) {
          timerBar.style.backgroundColor = 'var(--neon-magenta)';
          sound.playTick();
        } else {
          timerBar.style.backgroundColor = 'var(--neon-cyan)';
        }
      }

      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  endSoloRound() {
    clearInterval(this.timerInterval);
    this.mode = 'REVIEW';
    sound.playBuzzer();

    // Generate AI answers
    const bot1Answers = generateAIAnswers(this.letter, this.categories);
    const bot2Answers = generateAIAnswers(this.letter, this.categories);

    this.playersAnswers = [
      { id: 'local-player', name: this.playerName || 'Você', answers: this.answers, doubleCategory: this.doubleCategory },
      { id: 'ai-robot-1', name: 'Bot Galáctico 🤖', answers: bot1Answers, doubleCategory: '' },
      { id: 'ai-robot-2', name: 'Bot Veloz ⚡', answers: bot2Answers, doubleCategory: '' }
    ];

    this.render();
  }

  calculateSoloScores() {
    // Process local scores
    this.playersAnswers.forEach(pa => {
      let roundScore = 0;
      this.categories.forEach(cat => {
        const ans = (pa.answers[cat] || '').trim();
        if (!ans) return;

        // Check correct letter
        if (ans.charAt(0).toUpperCase() !== this.letter) return;

        // Check if validated (local validation check)
        const isBot = pa.id.startsWith('ai-robot');
        // Let's assume bot answers are valid since they come from dictionary.
        // For local player, check dictionary or assume valid if not downvoted in review
        let isValid = false;
        if (isBot) {
          isValid = true;
        } else {
          // If not invalidated by player downvote (in solo mode, downvotes represent player checking bot answers)
          // Also check spelling against dictionary or allow it
          isValid = isValidOffline(this.letter, cat, ans);
        }

        if (isValid) {
          // Find occurrences
          let count = 0;
          this.playersAnswers.forEach(other => {
            const otherAns = (other.answers[cat] || '').trim().toLowerCase();
            if (otherAns === ans.toLowerCase()) count++;
          });

          let points = count === 1 ? 10 : 5;
          if (pa.doubleCategory === cat) points *= 2;
          roundScore += points;
        }
      });

      // Find original player object to accumulate score
      const pl = this.players.find(p => p.id === pa.id);
      if (pl) {
        pl.roundScore = roundScore;
        pl.score += roundScore;
      }
    });

    // Sort players by score
    this.players.sort((a, b) => b.score - a.score);
    this.mode = 'SCOREBOARD';
    sound.playVictory();
    this.render();
  }

  calculateMultiplayerScores() {
    const players = this.players;
    const categories = this.categories;

    // Reset round scores
    players.forEach(p => {
      p.roundScore = 0;
    });

    // Calculate category by category
    categories.forEach(cat => {
      const answersMap = new Map(); // normalizedAnswer -> Array of players

      players.forEach(p => {
        const ans = (p.answers && p.answers[cat] || '').trim();
        const isValidLetter = ans.length > 0 && ans.charAt(0).toUpperCase() === this.letter;
        
        if (isValidLetter) {
          const norm = ans.toLowerCase();
          if (!answersMap.has(norm)) {
            answersMap.set(norm, []);
          }
          answersMap.get(norm).push(p);
        }
      });

      const activePlayerCount = players.filter(p => p.active).length;

      players.forEach(p => {
        const ans = (p.answers && p.answers[cat] || '').trim();
        if (!ans) return;

        const isValidLetter = ans.charAt(0).toUpperCase() === this.letter;
        if (!isValidLetter) return;

        // Count downvotes for this player's category
        let downvotes = 0;
        players.forEach(voter => {
          if (voter.id !== p.id && this.votesReceived[`${voter.id}_${p.id}_${cat}`] === true) {
            downvotes++;
          }
        });

        const totalVoters = activePlayerCount - 1;
        const isInvalidated = totalVoters > 0 && (downvotes / totalVoters) >= 0.5;

        if (isInvalidated) return;

        let basePoints = 0;
        const matchingPlayers = answersMap.get(ans.toLowerCase()) || [];
        
        if (matchingPlayers.length === 1) {
          basePoints = 10;
        } else if (matchingPlayers.length > 1) {
          basePoints = 5;
        }

        if (p.doubleCategory === cat) {
          basePoints *= 2;
        }

        p.roundScore += basePoints;
        p.score += basePoints;
      });
    });

    // Sort players by score
    this.players.sort((a, b) => b.score - a.score);
  }

  // Triggered when client presses "STOP!"
  triggerStop() {
    if (this.isMultiplayer) {
      this.sendAction('press-stop');
    } else {
      this.stopPressedBy = 'Você';
      sound.playBuzzer();
      
      // Let player review/finish for 5 seconds in solo mode too
      this.endTime = Date.now() + 5000;
      this.startLocalTimer(() => {
        this.endSoloRound();
      });
      this.render();
    }
  }

  // Handle Oracle Hint Power-up
  useOracle(category) {
    if (this.powerups.oracle <= 0) return;
    this.playBtnSound();

    const hint = getOracleHint(this.letter, category);
    if (hint) {
      this.answers[category] = hint;
      this.powerups.oracle--;
      
      // Focus and fill the input field
      const input = document.getElementById(`input-${category}`);
      if (input) {
        input.value = hint;
        input.classList.add('pulse-cyan');
        setTimeout(() => input.classList.remove('pulse-cyan'), 1000);
      }
      this.renderPowerups();
    }
  }

  // Handle Spy Peek Power-up
  useSpy(category) {
    if (this.powerups.spy <= 0) return;
    this.playBtnSound();

    const opponentPlayers = this.players.filter(p => p.id !== this.playerId && p.active);
    if (opponentPlayers.length === 0) {
      alert('Não há outros jogadores para espionar!');
      return;
    }

    // Pick target player randomly (low network overhead)
    const target = opponentPlayers[Math.floor(Math.random() * opponentPlayers.length)];

    if (this.isMultiplayer) {
      this.sendAction('request-spy', { targetPlayerId: target.id, category }, (response) => {
        if (response && response.answer) {
          this.revealSpyAnswer(category, target.name, response.answer);
        } else {
          this.revealSpyAnswer(category, target.name, '(nada ainda)');
        }
      });
    } else {
      // Solo mode AI answer peek
      const targetAns = this.playersAnswers.length > 0 
        ? (this.playersAnswers.find(pa => pa.id === target.id)?.answers[category] || '') 
        : getOracleHint(this.letter, category); // If playing, generate a hint
      
      this.revealSpyAnswer(category, target.name, targetAns || '(nada ainda)');
    }
  }

  revealSpyAnswer(category, targetName, answerText) {
    this.powerups.spy--;
    const spyInfo = document.getElementById(`spy-info-${category}`);
    if (spyInfo) {
      spyInfo.textContent = `🕵️ ${targetName}: "${answerText}"`;
      spyInfo.style.display = 'block';
      spyInfo.classList.add('peek-animation');
    }
    this.renderPowerups();
  }

  // Toggle category double point multiplier
  toggleDouble(category) {
    this.playBtnSound();
    if (this.doubleCategory === category) {
      this.doubleCategory = '';
    } else {
      this.doubleCategory = category;
    }
    
    // Update UI highlights
    this.categories.forEach(cat => {
      const btn = document.getElementById(`btn-double-${cat}`);
      if (btn) {
        if (cat === this.doubleCategory) {
          btn.classList.add('double-active');
        } else {
          btn.classList.remove('double-active');
        }
      }
    });
  }

  // Common UI Button click sound trigger
  playBtnSound() {
    sound.playClick();
  }

  // Main UI routing and renderer (optimized to avoid flickering/loss of focus)
  render() {
    const container = document.getElementById('game-container');
    if (!container) return;

    // If state changed, perform full view update
    if (this.renderedMode !== this.mode) {
      this.renderedMode = this.mode;
      container.className = `view-state-${this.mode.toLowerCase()}`;
      
      switch (this.mode) {
        case 'LOBBY_SELECT':
          container.innerHTML = this.renderLobbySelect();
          break;
        case 'LOBBY':
          container.innerHTML = this.renderLobby();
          break;
        case 'PLAYING':
          container.innerHTML = this.renderPlaying();
          this.renderPowerups();
          break;
        case 'REVIEW':
          container.innerHTML = this.renderReview();
          break;
        case 'SCOREBOARD':
          container.innerHTML = this.renderScoreboard();
          break;
      }
      return;
    }

    // Delta updates for the same state
    if (this.mode === 'LOBBY') {
      // Update player count badge
      const badge = document.querySelector('.player-count-badge');
      if (badge) {
        const activePlayers = this.players.filter(p => p.active);
        badge.textContent = `👤 ${activePlayers.length}/15`;
      }
      
      // Update players list dynamically
      const list = document.querySelector('.players-list');
      if (list) {
        list.innerHTML = this.players.map(p => `
          <div class="player-card ${p.id === this.playerId ? 'self-player' : ''} ${!p.active ? 'player-disconnected' : ''}">
            <div class="player-avatar" style="background-color: ${stringToHslColor(p.name)}">
              ${p.name.charAt(0).toUpperCase()}
            </div>
            <div class="player-info">
              <span class="player-name">${p.name} ${p.id === this.playerId ? '(Você)' : ''}</span>
              <span class="player-status-text">${!p.active ? '❌ Desconectado' : (p.id === this.roomCode.hostId || p.ready ? '⭐ Pronto' : 'Aguardando')}</span>
            </div>
          </div>
        `).join('');
      }

      // If non-host, sync duration text dynamically
      if (!this.isHost) {
        const durationDisplay = document.querySelector('.setting-item span');
        if (durationDisplay) {
          durationDisplay.textContent = `${this.duration}s`;
        }
        
        const tagsContainer = document.querySelector('.categories-tags-container');
        if (tagsContainer) {
          tagsContainer.innerHTML = this.categories.map(c => `<span class="category-tag">${c}</span>`).join('');
        }
      }
    } else if (this.mode === 'PLAYING') {
      // Dynamic stop banner update during playing phase (without wiping inputs)
      if (this.stopPressedBy) {
        let banner = document.querySelector('.stop-alert-banner');
        if (!banner) {
          banner = document.createElement('div');
          banner.className = 'stop-alert-banner alert-glow';
          const hud = document.querySelector('.game-hud');
          if (hud) hud.insertAdjacentElement('afterend', banner);
        }
        banner.innerHTML = `🚨 <strong>${this.stopPressedBy}</strong> apertou STOP! Finalizando em 5s...`;
        
        // Disable actions
        const stopBtn = document.getElementById('btn-stop-round');
        if (stopBtn) stopBtn.disabled = true;
        
        document.querySelectorAll('.category-input-field').forEach(input => input.disabled = true);
      }
    } else if (this.mode === 'SCOREBOARD') {
      // Scoreboard has no user text inputs, safe to re-render in full
      container.innerHTML = this.renderScoreboard();
    }
  }

  renderLobbySelect() {
    return `
      <div class="glass-card fade-in">
        <h1 class="logo">STOP! <span class="neon-pink-text">CLASH</span></h1>
        <p class="subtitle">O clássico jogo de palavras, turbinado e portátil</p>
        
        <div class="form-group">
          <label for="player-name-input">Seu Apelido:</label>
          <input type="text" id="player-name-input" maxlength="15" placeholder="Digite seu nome..." value="${this.playerName}">
        </div>

        <div class="lobby-actions">
          <button id="btn-create-lobby" class="btn btn-cyan btn-glow">Criar Sala Online</button>
          
          <div class="divider"><span>ou entrar</span></div>
          
          <div class="join-code-row">
            <input type="text" id="room-code-input" placeholder="CÓDIGO" maxlength="4" style="text-transform: uppercase;">
            <button id="btn-join-lobby" class="btn btn-magenta">Entrar</button>
          </div>
          
          <div class="divider"><span>sozinho</span></div>
          
          <button id="btn-play-solo" class="btn btn-border">Modo Solo (Treino Offline)</button>
        </div>
      </div>
    `;
  }

  renderLobby() {
    const isReady = this.players.find(p => p.id === this.playerId)?.ready || false;
    const activePlayers = this.players.filter(p => p.active);

    return `
      <div class="glass-card fade-in">
        <div class="lobby-header">
          <h2>Sala: <span class="room-code-display">${this.roomCode}</span></h2>
          <span class="player-count-badge">👤 ${activePlayers.length}/15</span>
        </div>

        <div class="settings-panel">
          <h3>Configurações da Rodada</h3>
          <div class="settings-grid">
            <div class="setting-item">
              <label>Tempo (segundos):</label>
              ${this.isHost ? `
                <select id="select-duration">
                  <option value="40" ${this.duration === 40 ? 'selected' : ''}>40s</option>
                  <option value="60" ${this.duration === 60 ? 'selected' : ''}>60s</option>
                  <option value="90" ${this.duration === 90 ? 'selected' : ''}>90s</option>
                  <option value="120" ${this.duration === 120 ? 'selected' : ''}>120s</option>
                </select>
              ` : `<span>${this.duration}s</span>`}
            </div>
          </div>
          
          <div class="categories-setup">
            <label>Categorias:</label>
            <div class="categories-tags-container">
              ${this.categories.map(c => `<span class="category-tag">${c}</span>`).join('')}
            </div>
            ${this.isHost ? `
              <button id="btn-edit-categories" class="btn btn-mini">Editar Categorias</button>
            ` : ''}
          </div>
        </div>

        <div class="players-list-panel">
          <h3>Jogadores na Sala</h3>
          <div class="players-list">
            ${this.players.map(p => `
              <div class="player-card ${p.id === this.playerId ? 'self-player' : ''} ${!p.active ? 'player-disconnected' : ''}">
                <div class="player-avatar" style="background-color: ${stringToHslColor(p.name)}">
                  ${p.name.charAt(0).toUpperCase()}
                </div>
                <div class="player-info">
                  <span class="player-name">${p.name} ${p.id === this.playerId ? '(Você)' : ''}</span>
                  <span class="player-status-text">${!p.active ? '❌ Desconectado' : (p.id === this.roomCode.hostId || p.ready ? '⭐ Pronto' : 'Aguardando')}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="lobby-footer">
          ${this.isHost ? `
            <button id="btn-start-game" class="btn btn-cyan btn-glow w-100">Iniciar Jogo 🎮</button>
          ` : `
            <div class="waiting-message">Aguardando o Host iniciar o jogo...</div>
          `}
          <button id="btn-exit-lobby" class="btn btn-border w-100 mt-2">Sair da Sala</button>
        </div>
      </div>
    `;
  }

  renderPlaying() {
    const isStopTriggered = this.stopPressedBy !== '';
    return `
      <div class="playing-screen fade-in">
        <div class="game-hud">
          <div class="hud-letter-circle">
            <span>${this.letter}</span>
          </div>
          <div class="hud-timer-container">
            <div class="timer-meta">
              <span>Rodada ${this.currentRound}</span>
              <span id="timer-text">${Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000))}s</span>
            </div>
            <div class="timer-progress-track">
              <div id="timer-bar" class="timer-progress-fill" style="width: 100%;"></div>
            </div>
          </div>
        </div>

        ${isStopTriggered ? `
          <div class="stop-alert-banner alert-glow">
            🚨 <strong>${this.stopPressedBy}</strong> apertou STOP! Finalizando em 5s...
          </div>
        ` : ''}

        <div class="inputs-grid">
          ${this.categories.map(cat => {
            const hasOracle = this.powerups.oracle > 0;
            const hasSpy = this.powerups.spy > 0;
            const isDouble = this.doubleCategory === cat;
            return `
              <div class="input-card">
                <div class="input-card-header">
                  <span class="category-name">${cat}</span>
                  <div class="powerup-buttons">
                    <button class="btn-powerup btn-powerup-double ${isDouble ? 'double-active' : ''}" 
                            id="btn-double-${cat}" 
                            data-cat="${cat}" 
                            title="Dobrar pontos nesta categoria">x2</button>
                    <button class="btn-powerup btn-powerup-oracle" 
                            data-cat="${cat}" 
                            title="Usar Dica do Oráculo">🔮</button>
                    <button class="btn-powerup btn-powerup-spy" 
                            data-cat="${cat}" 
                            title="Espiar resposta do oponente">🕵️</button>
                  </div>
                </div>
                <div class="input-wrapper">
                  <input type="text" 
                         id="input-${cat}" 
                         class="category-input-field" 
                         data-cat="${cat}" 
                         value="${this.answers[cat] || ''}" 
                         placeholder="Escreva aqui..." 
                         ${isStopTriggered ? 'disabled' : ''}>
                </div>
                <div id="spy-info-${cat}" class="spy-peek-info" style="display: none;"></div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="playing-footer">
          <div class="powerups-inventory">
            <span class="inventory-tag">Mochila:</span>
            <span class="powerup-inventory-item" id="inv-oracle">🔮 Dica: 1</span>
            <span class="powerup-inventory-item" id="inv-spy">🕵️ Espionar: 1</span>
          </div>
          <button id="btn-stop-round" class="btn btn-stop btn-stop-glow" ${isStopTriggered ? 'disabled' : ''}>STOP! 🚨</button>
        </div>
      </div>
    `;
  }

  renderPowerups() {
    const invOracle = document.getElementById('inv-oracle');
    const invSpy = document.getElementById('inv-spy');
    if (invOracle) invOracle.textContent = `🔮 Dica: ${this.powerups.oracle}`;
    if (invSpy) invSpy.textContent = `🕵️ Espionar: ${this.powerups.spy}`;

    // Disable powerup buttons if inventory depleted
    document.querySelectorAll('.btn-powerup-oracle').forEach(btn => {
      if (this.powerups.oracle <= 0) btn.disabled = true;
    });
    document.querySelectorAll('.btn-powerup-spy').forEach(btn => {
      if (this.powerups.spy <= 0) btn.disabled = true;
    });
  }

  renderReview() {
    return `
      <div class="glass-card review-screen fade-in">
        <div class="review-header">
          <h2>Avaliação de Respostas</h2>
          <p>Vote 👍 ou 👎 nas palavras que você acha válidas ou inválidas!</p>
        </div>

        <div class="review-grid">
          ${this.categories.map(cat => {
            return `
              <div class="review-category-section">
                <h3>Categoria: <span class="neon-cyan-text">${cat}</span></h3>
                <div class="answers-review-list">
                  ${this.playersAnswers.map(pa => {
                    const ans = (pa.answers[cat] || '').trim();
                    const isBlank = ans.length === 0;
                    const matchesLetter = !isBlank && ans.charAt(0).toUpperCase() === this.letter;
                    const voteKey = `${pa.id}_${cat}`;
                    const isDownvoted = this.votesCast[voteKey] === true;
                    
                    // Don't show downvote option on self or on blank/invalid letter answers
                    const canVote = pa.id !== this.playerId && !isBlank && matchesLetter;

                    let answerDisplay = ans;
                    let displayClass = 'review-answer-text';
                    
                    if (isBlank) {
                      answerDisplay = '(em branco)';
                      displayClass += ' answer-empty';
                    } else if (!matchesLetter) {
                      answerDisplay = `${ans} (Letra errada)`;
                      displayClass += ' answer-invalid-letter';
                    }

                    return `
                      <div class="review-row ${isDownvoted ? 'review-row-downvoted' : ''}" id="row-${voteKey}">
                        <div class="reviewer-avatar-col">
                          <div class="player-avatar-mini" style="background-color: ${stringToHslColor(pa.name)}">
                            ${pa.name.charAt(0).toUpperCase()}
                          </div>
                          <span class="reviewer-name">${pa.name} ${pa.doubleCategory === cat ? '⭐ x2' : ''}</span>
                        </div>
                        <div class="reviewer-answer-col">
                          <span class="${displayClass}">${answerDisplay}</span>
                        </div>
                        <div class="reviewer-action-col">
                          ${canVote ? `
                            <button class="btn-vote btn-vote-down ${isDownvoted ? 'vote-active' : ''}" 
                                    data-target="${pa.id}" 
                                    data-cat="${cat}" 
                                    title="Votar como inválido">👎</button>
                          ` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="review-footer">
          ${this.isHost ? `
            <button id="btn-finish-review" class="btn btn-cyan btn-glow w-100">Finalizar Avaliação & Pontuar 🧮</button>
          ` : `
            <div class="waiting-message">Aguardando o Host finalizar a apuração...</div>
          `}
        </div>
      </div>
    `;
  }

  renderScoreboard() {
    return `
      <div class="glass-card scoreboard-screen fade-in">
        <h2 class="neon-pink-text text-center">Placar da Rodada ${this.currentRound}</h2>
        
        <div class="scoreboard-list">
          ${this.players.map((p, idx) => {
            const isSelf = p.id === this.playerId;
            return `
              <div class="score-card ${isSelf ? 'self-score-card' : ''}">
                <div class="score-rank">${idx + 1}</div>
                <div class="score-player-info">
                  <div class="player-avatar-mini" style="background-color: ${stringToHslColor(p.name)}">
                    ${p.name.charAt(0).toUpperCase()}
                  </div>
                  <span class="score-name">${p.name} ${isSelf ? '(Você)' : ''}</span>
                </div>
                <div class="score-value-group">
                  <span class="score-round-add">+${p.roundScore || 0}</span>
                  <span class="score-total">${p.score} pts</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="scoreboard-footer">
          ${this.isHost ? `
            <button id="btn-next-round" class="btn btn-cyan btn-glow w-100">Próxima Rodada ➔</button>
          ` : `
            <div class="waiting-message">Aguardando o Host iniciar a próxima rodada...</div>
          `}
          <button id="btn-exit-game" class="btn btn-border w-100 mt-2">Sair do Jogo</button>
        </div>
      </div>
    `;
  }
}

// Utility to generate distinct colors for player avatars
function stringToHslColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 45%)`;
}
