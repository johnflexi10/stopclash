// Compact dictionary in Portuguese for Solo AI responses and Oracle suggestions
const DICTIONARY = {
  'A': {
    'Nome': ['Ana', 'Arthur', 'Alice', 'Amanda', 'André', 'Aline', 'Augusto', 'Adriana'],
    'Animal': ['Abelha', 'Águia', 'Anta', 'Albatroz', 'Aranha', 'Avestruz', 'Anêmona'],
    'Cor': ['Azul', 'Amarelo', 'Abóbora', 'Azul-marinho', 'Azul-turquesa', 'Ametista'],
    'Objeto': ['Anel', 'Agulha', 'Armário', 'Almofada', 'Apito', 'Aparelho', 'Ampulheta'],
    'Fruta': ['Abacaxi', 'Acerola', 'Ameixa', 'Aguai', 'Amora', 'Abacate', 'Açaí'],
    'Lugar': ['Alemanha', 'Angola', 'Argentina', 'Aracaju', 'Amazonas', 'Amparo', 'Austrália']
  },
  'B': {
    'Nome': ['Bruno', 'Beatriz', 'Bianca', 'Bento', 'Bárbara', 'Bernardo', 'Bruna'],
    'Animal': ['Baleia', 'Bode', 'Borboleta', 'Búfalo', 'Beija-flor', 'Bicho-preguiça'],
    'Cor': ['Branco', 'Bege', 'Bordô', 'Bronze', 'Bege-claro'],
    'Objeto': ['Bola', 'Bandeja', 'Bacia', 'Borracha', 'Botão', 'Balança', 'Bule', 'Bota'],
    'Fruta': ['Banana', 'Bacuri', 'Biribá', 'Butiá', 'Bergamota', 'Babosa'],
    'Lugar': ['Brasil', 'Bahia', 'Belo Horizonte', 'Bélgica', 'Brasília', 'Barcelona', 'Boston']
  },
  'C': {
    'Nome': ['Carlos', 'Camila', 'Carolina', 'Caio', 'Catarina', 'César', 'Cecília'],
    'Animal': ['Cachorro', 'Cavalo', 'Canguru', 'Cobra', 'Coelho', 'Coruja', 'Camelo'],
    'Cor': ['Cinza', 'Ciano', 'Creme', 'Caramelo', 'Carmesim', 'Castanho'],
    'Objeto': ['Caneta', 'Cadeira', 'Copo', 'Caderno', 'Chave', 'Corda', 'Colher', 'Cama'],
    'Fruta': ['Caju', 'Coco', 'Caqui', 'Carambola', 'Cereja', 'Cupuaçu', 'Cacau'],
    'Lugar': ['Canadá', 'Chile', 'China', 'Curitiba', 'Campinas', 'Ceará', 'Colômbia']
  },
  'D': {
    'Nome': ['Daniel', 'Diego', 'Diana', 'Douglas', 'Dora', 'Davi', 'Débora', 'Denise'],
    'Animal': ['Dinossauro', 'Dromedário', 'Diabo-da-tasmânia', 'Dourado', 'Degual'],
    'Cor': ['Dourado', 'Damasco', 'Doce-de-leite'],
    'Objeto': ['Dado', 'Dardo', 'Dedal', 'Disco', 'Dicionário', 'Dentadura'],
    'Fruta': ['Damasco', 'Dendê', 'Dióspiro', 'Doce-de-ouro'],
    'Lugar': ['Dinamarca', 'Dublin', 'Detroit', 'Diamantina', 'Dois Córregos', 'Dominica']
  },
  'E': {
    'Nome': ['Eduardo', 'Elisa', 'Estêvão', 'Evelyn', 'Enzo', 'Emanuel', 'Elaine'],
    'Animal': ['Elefante', 'Esquilo', 'Estrela-do-mar', 'Ema', 'Escorpião', 'Esponja'],
    'Cor': ['Esmeralda', 'Escarlate', 'Ébano'],
    'Objeto': ['Escova', 'Espelho', 'Escada', 'Estojo', 'Elástico', 'Envelope', 'Espátula'],
    'Fruta': ['Embaúba', 'Esfregão', 'Engenho', 'Espinheiro'],
    'Lugar': ['Espanha', 'Equador', 'Egito', 'Embu das Artes', 'Estados Unidos', 'Estocolmo']
  },
  'F': {
    'Nome': ['Felipe', 'Fernanda', 'Fabio', 'Flávia', 'Francisco', 'Fabiana', 'Frederico'],
    'Animal': ['Foca', 'Falcão', 'Formiga', 'Flamingo', 'Fura-bolo', 'Fuinha'],
    'Cor': ['Fúcsia', 'Ferrugem', 'Florestal'],
    'Objeto': ['Faca', 'Fita', 'Fogão', 'Ferro', 'Funil', 'Fivela', 'Filtro', 'Flauta'],
    'Fruta': ['Figo', 'Framboesa', 'Fruta-pão', 'Fruta-do-conde', 'Fambroesa'],
    'Lugar': ['França', 'Florianópolis', 'Fortaleza', 'Finlândia', 'Fiji', 'Florença']
  },
  'G': {
    'Nome': ['Gabriel', 'Giovanna', 'Gustavo', 'Guilherme', 'Gisele', 'Gabriela', 'Geraldo'],
    'Animal': ['Gato', 'Girafa', 'Gorila', 'Galinha', 'Gavião', 'Golfinho', 'Grilo'],
    'Cor': ['Gelo', 'Grafite', 'Grena', 'Gema'],
    'Objeto': ['Garfo', 'Garrafa', 'Gaiola', 'Giz', 'Gaveta', 'Grelha', 'Guarda-chuva'],
    'Fruta': ['Goiaba', 'Graviola', 'Groselha', 'Grumixama', 'Guabiroba'],
    'Lugar': ['Grécia', 'Guatemala', 'Goiânia', 'Guarulhos', 'Genoa', 'Genebra', 'Gana']
  },
  'H': {
    'Nome': ['Hugo', 'Helena', 'Heitor', 'Heloísa', 'Henrique', 'Hélio', 'Humberto'],
    'Animal': ['Hiena', 'Hipopótamo', 'Harpia', 'Hámster', 'Híbrido'],
    'Cor': ['Heliotrópio', 'Hortênsia', 'Herbal'],
    'Objeto': ['Hélice', 'Harpão', 'Hinário', 'Haltere', 'Hidrante'],
    'Fruta': ['Higo', 'Heisteria', 'Hovenia'],
    'Lugar': ['Honduras', 'Hungria', 'Holanda', 'Havana', 'Houston', 'Helsinque']
  },
  'I': {
    'Nome': ['Igor', 'Isabela', 'Ingrid', 'Ítalo', 'Irene', 'Isadora', 'Ivan', 'Inácio'],
    'Animal': ['Iguana', 'Impala', 'Ibis', 'Indri', 'Inhambu'],
    'Cor': ['Iogurte', 'Indigo', 'Ivory'],
    'Objeto': ['Imã', 'Isqueiro', 'Ioiô', 'Inalador', 'Impressora', 'Incense'],
    'Fruta': ['Ingá', 'Ilama', 'Imbu', 'Itapicuru'],
    'Lugar': ['Itália', 'Inglaterra', 'Israel', 'Itanhaém', 'Itu', 'Itajubá', 'Irlanda']
  },
  'J': {
    'Nome': ['João', 'Julia', 'Júlio', 'Juliana', 'Jorge', 'Jéssica', 'Jaqueline'],
    'Animal': ['Jacaré', 'Jaguar', 'Jaguatirica', 'Jabuti', 'Jumento', 'Joaninha'],
    'Cor': ['Jambo', 'Jaspe', 'Jade'],
    'Objeto': ['Jarra', 'Janela', 'Jornal', 'Jaleco', 'Jogo', 'Jóia'],
    'Fruta': ['Jaca', 'Jabuticaba', 'Jambo', 'Jambolão', 'Jaracatiá'],
    'Lugar': ['Japão', 'Jamaica', 'Jordânia', 'João Pessoa', 'Joinville', 'Jericoacoara']
  },
  'L': {
    'Nome': ['Lucas', 'Larissa', 'Leonardo', 'Letícia', 'Luiz', 'Laura', 'Lívia'],
    'Animal': ['Leão', 'Leopardo', 'Lobo', 'Lagarta', 'Lontra', 'Lhama', 'Lagartixa'],
    'Cor': ['Laranja', 'Lilás', 'Limão', 'Lavanda', 'Lustre'],
    'Objeto': ['Lápis', 'Lustre', 'Lata', 'Lanterna', 'Livro', 'Lixa', 'Lente', 'Lareira'],
    'Fruta': ['Laranja', 'Limão', 'Lichia', 'Lima', 'Lobeira'],
    'Lugar': ['Londres', 'Lisboa', 'Lima', 'Londrina', 'Líbano', 'Lituânia', 'Los Angeles']
  },
  'M': {
    'Nome': ['Mateus', 'Maria', 'Mariana', 'Marcos', 'Manuela', 'Murilo', 'Marcelo'],
    'Animal': ['Macaco', 'Morcego', 'Mosca', 'Mula', 'Mariposa', 'Medusa', 'Mamute'],
    'Cor': ['Marrom', 'Magenta', 'Mostarda', 'Malva', 'Marfim', 'Menta'],
    'Objeto': ['Mesa', 'Mochila', 'Martelo', 'Meia', 'Microfone', 'Moeda', 'Máscara'],
    'Fruta': ['Melancia', 'Melão', 'Morango', 'Manga', 'Maracujá', 'Mexerica', 'Mamão'],
    'Lugar': ['México', 'Marrocos', 'Madri', 'Manaus', 'Maringá', 'Munique', 'Miami']
  },
  'N': {
    'Nome': ['Nicolas', 'Natália', 'Natan', 'Nívea', 'Nelson', 'Nara', 'Newton'],
    'Animal': ['Naja', 'Namorado', 'Niala', 'Narval', 'Nambu'],
    'Cor': ['Naval', 'Nude', 'Negro', 'Néctar'],
    'Objeto': ['Navalha', 'Navio', 'Ninho', 'Notebook', 'Narguilé', 'Novelo'],
    'Fruta': ['Nectarina', 'Nêspera', 'Noni', 'Noz'],
    'Lugar': ['Noruega', 'Nicarágua', 'Natal', 'Niterói', 'Nova York', 'Nagasaki', 'Níger']
  },
  'O': {
    'Nome': ['Otávio', 'Olívia', 'Orlando', 'Odete', 'Oscar', 'Olga', 'Oswaldo'],
    'Animal': ['Ovelha', 'Orangotango', 'Orca', 'Ostra', 'Melro', 'Ouriço'],
    'Cor': ['Ouro', 'Oliva', 'Orquídea', 'Ocre'],
    'Objeto': ['Óculos', 'Olho', 'Ovo', 'Ouro', 'Organizador', 'Obelisco'],
    'Fruta': ['Oriri', 'Oiti', 'Olho-de-boi'],
    'Lugar': ['Osasco', 'Olinda', 'Orlândia', 'Orlando', 'Ouro Preto', 'Ottawa', 'Oman']
  },
  'P': {
    'Nome': ['Pedro', 'Patricia', 'Paulo', 'Priscila', 'Paloma', 'Poliana', 'Plínio'],
    'Animal': ['Pato', 'Pinguim', 'Pantera', 'Panda', 'Pavão', 'Peixe', 'Porco'],
    'Cor': ['Preto', 'Prata', 'Púrpura', 'Pêssego', 'Pérola', 'Pistache'],
    'Objeto': ['Prato', 'Pente', 'Panela', 'Papel', 'Pincel', 'Porta', 'Pilha', 'Pipa'],
    'Fruta': ['Pera', 'Pêssego', 'Pitanga', 'Pitaya', 'Pupunha', 'Pinha', 'Pequi'],
    'Lugar': ['Portugal', 'Peru', 'Paraguai', 'Porto Alegre', 'Paraná', 'Paris', 'Pequim']
  },
  'R': {
    'Nome': ['Rafael', 'Rodrigo', 'Renata', 'Raquel', 'Ricardo', 'Roberta', 'Ruan'],
    'Animal': ['Rato', 'Raposa', 'Rinoceronte', 'Rã', 'Raia', 'Rouxinol'],
    'Cor': ['Rosa', 'Roxo', 'Rubi', 'Romã', 'Rosado'],
    'Objeto': ['Rádio', 'Régua', 'Relógio', 'Roda', 'Rolo', 'Rodo', 'Rede', 'Rifle'],
    'Fruta': ['Romã', 'Rambutã', 'Rabanete', 'Rambutan'],
    'Lugar': ['Rússia', 'Roma', 'Rio de Janeiro', 'Recife', 'Ribeirão Preto', 'Romênia']
  },
  'S': {
    'Nome': ['Samuel', 'Sofia', 'Sara', 'Silvia', 'Sandro', 'Sabrina', 'Sebastião'],
    'Animal': ['Sapo', 'Sardinha', 'Salamandra', 'Serpente', 'Sagui', 'Siri'],
    'Cor': ['Salmão', 'Sépia', 'Siena', 'Safira'],
    'Objeto': ['Sabonete', 'Sino', 'Seringa', 'Saco', 'Sapato', 'Sofá', 'Saca-rolhas'],
    'Fruta': ['Seriguela', 'Sapoti', 'Salak', 'Santol'],
    'Lugar': ['Suécia', 'Suíça', 'Salvador', 'Santos', 'Sorocaba', 'Santiago', 'Seul']
  },
  'T': {
    'Nome': ['Thiago', 'Tatiane', 'Teresa', 'Tomás', 'Túlio', 'Tânia', 'Tadeu'],
    'Animal': ['Tigre', 'Tartaruga', 'Tubarão', 'Tucano', 'Tamanduá', 'Tatu', 'Touro'],
    'Cor': ['Turquesa', 'Tangerina', 'Terra', 'Tijolo'],
    'Objeto': ['Teclado', 'Telefone', 'Tesoura', 'Tigela', 'Tábua', 'Tapete', 'Tenda'],
    'Fruta': ['Tangerina', 'Tamarindo', 'Tamarilho', 'Tarumã'],
    'Lugar': ['Tailândia', 'Teresina', 'Taubaté', 'Tóquio', 'Toronto', 'Turquia', 'Tunísia']
  },
  'U': {
    'Nome': ['Uelinton', 'Ulysses', 'Urbano', 'Ursula', 'Uriel', 'Ubaldino'],
    'Animal': ['Urso', 'Urubu', 'Unicórnio', 'Uauá', 'Uirapuru'],
    'Cor': ['Uva', 'Ultra-violeta'],
    'Objeto': ['Urna', 'Umbrela', 'Umidificador', 'Unha'],
    'Fruta': ['Uva', 'Uvaia', 'Uxi', 'Urumbeba'],
    'Lugar': ['Uruguai', 'Ucrânia', 'Ubatuba', 'Uberlândia', 'Uberaba', 'Utah', 'Utrecht']
  },
  'V': {
    'Nome': ['Victor', 'Vinicius', 'Vanessa', 'Valéria', 'Vitor', 'Valentina', 'Vera'],
    'Animal': ['Vaca', 'Vagalume', 'Veado', 'Víbora', 'Vieira', 'Vison'],
    'Cor': ['Verde', 'Vermelho', 'Violeta', 'Vinho', 'Verde-limão', 'Verde-oliva'],
    'Objeto': ['Vaso', 'Vela', 'Vassoura', 'Ventilador', 'Vidro', 'Violão', 'Volante'],
    'Fruta': ['Veludo', 'Vacum', 'Vassoura'],
    'Lugar': ['Venezuela', 'Vietnã', 'Vitória', 'Vila Velha', 'Valinhos', 'Veneza', 'Viena']
  }
};

// Returns a random valid answer from DICTIONARY starting with the letter for the category
function getOracleHint(letter, category) {
  const upperLetter = letter.toUpperCase();
  if (DICTIONARY[upperLetter] && DICTIONARY[upperLetter][category]) {
    const list = DICTIONARY[upperLetter][category];
    return list[Math.floor(Math.random() * list.length)];
  }
  return '';
}

// Check if an answer is valid offline (basic check)
function isValidOffline(letter, category, answer) {
  if (!answer) return false;
  const ans = answer.trim();
  if (ans.length === 0) return false;
  
  // Must start with the correct letter
  if (ans.charAt(0).toUpperCase() !== letter.toUpperCase()) return false;
  
  // Basic validation check against the dictionary
  const upperLetter = letter.toUpperCase();
  if (DICTIONARY[upperLetter] && DICTIONARY[upperLetter][category]) {
    const list = DICTIONARY[upperLetter][category].map(w => w.toLowerCase());
    // If it's in our dictionary list, it's definitely valid
    if (list.includes(ans.toLowerCase())) return true;
  }
  
  // If not in dictionary, we still return true (offline doesn't strictly block unregistered words
  // since dictionaries are small, but let's assume it's valid if it has >= 2 characters)
  return ans.length >= 2;
}

// Generate answers for AI bot in Solo mode
function generateAIAnswers(letter, categories) {
  const answers = {};
  categories.forEach(cat => {
    // 85% chance of finding a word, 15% of blank (simulates AI human-like behavior)
    if (Math.random() > 0.15) {
      const hint = getOracleHint(letter, cat);
      if (hint) {
        answers[cat] = hint;
      }
    }
  });
  return answers;
}

if (typeof module !== 'undefined') {
  module.exports = { DICTIONARY, getOracleHint, isValidOffline, generateAIAnswers };
}
