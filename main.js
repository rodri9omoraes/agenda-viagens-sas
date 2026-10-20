const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const express = require('express');
const db = require('./src/database/db');

let mainJanela;
let calendarioJanela = null;
let server;

function criarJanela() {
  mainJanela = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets/ICON_SAS.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainJanela.loadFile('src/public/index.html');
}

function abrirCalendario() {
  if (calendarioJanela === null || calendarioJanela.isDestroyed()) {
    const { width: telaLargura, height: telaAltura } = screen.getPrimaryDisplay().workAreaSize;
    
    const larguraJanela = 900; //450
    const alturaJanela = 700; //520
    
    const x = telaLargura - larguraJanela - 20;
    const y = 20;

    calendarioJanela = new BrowserWindow({
      width: larguraJanela,
      height: alturaJanela,
      x: x,
      y: y,
      alwaysOnTop: true,
      resizable: true, //redimensionável
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    calendarioJanela.loadFile('src/public/calendario.html');

    calendarioJanela.on('closed', () => {
      calendarioJanela = null;
    });
  } else {
    calendarioJanela.show();
    calendarioJanela.focus();
  }
}

function startServer() {
  const expressApp = express();
  const PORT = 3001;

  expressApp.use(express.json());
  expressApp.use(express.static(path.join(__dirname, 'src/public')));

  expressApp.get('/api/viagens', (req, res) => {
    try {
      const viagens = db.getAll('SELECT * FROM viagens ORDER BY data_viagem, horario_atendimento');
      res.json(viagens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.get('/api/viagens/:id', (req, res) => {
    try {
      const viagem = db.getOne('SELECT * FROM viagens WHERE id = ?', [parseInt(req.params.id)]);
      res.json(viagem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.post('/api/viagens', (req, res) => {
    try {
      const {
        data_viagem, quem_autorizou, nome_pessoa, endereco,
        telefone1, telefone2, cidade_destino, local_destino,
        horario_atendimento, horario_saida, observacoes
      } = req.body;

      db.run(`
        INSERT INTO viagens (
          data_viagem, quem_autorizou, nome_pessoa, endereco,
          telefone1, telefone2, cidade_destino, local_destino,
          horario_atendimento, horario_saida, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data_viagem, quem_autorizou, nome_pessoa, endereco,
        telefone1, telefone2, cidade_destino, local_destino,
        horario_atendimento, horario_saida, observacoes
      ]);

      const id = db.getLastId();
      res.json({ id: id, message: 'Viagem cadastrada com sucesso!' });
    } catch (error) {
      console.error('Erro ao criar viagem:', error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.put('/api/viagens/:id', (req, res) => {
    try {
      const {
        data_viagem, quem_autorizou, nome_pessoa, endereco,
        telefone1, telefone2, cidade_destino, local_destino,
        horario_atendimento, horario_saida, observacoes, nome_motorista, status
      } = req.body;

      db.run(`
        UPDATE viagens SET
          data_viagem = ?, quem_autorizou = ?, nome_pessoa = ?, endereco = ?,
          telefone1 = ?, telefone2 = ?, cidade_destino = ?, local_destino = ?,
          horario_atendimento = ?, horario_saida = ?, observacoes = ?,
          nome_motorista = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        data_viagem, quem_autorizou, nome_pessoa, endereco,
        telefone1, telefone2, cidade_destino, local_destino,
        horario_atendimento, horario_saida, observacoes,
        nome_motorista, status, parseInt(req.params.id)
      ]);

      res.json({ message: 'Viagem atualizada com sucesso!' });
    } catch (error) {
      console.error('Erro ao atualizar viagem:', error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.delete('/api/viagens/:id', (req, res) => {
    try {
      db.run('DELETE FROM viagens WHERE id = ?', [parseInt(req.params.id)]);
      res.json({ message: 'Viagem cancelada com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.get('/api/viagens/data/:data', (req, res) => {
    try {
      const viagens = db.getAll(`
        SELECT * FROM viagens 
        WHERE data_viagem = ? AND status != 'cancelada'
        ORDER BY horario_atendimento
      `, [req.params.data]);
      res.json(viagens);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  server = expressApp.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });

  //FÉRIAS DOS MOTORISTAS
  //Listar todas as férias
  expressApp.get('/api/ferias', (req, res) => {
    try {
      const ferias = db.getAll('SELECT * FROM ferias_motoristas ORDER BY data_inicio ASC');
      res.json(ferias);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

    // Registrar férias
  expressApp.post('/api/ferias', (req, res) => {
    try {
      console.log('📥 Recebendo dados de férias:', req.body);
      
      const { nome_motorista, data_inicio, data_fim, observacoes } = req.body;
      
      if (!nome_motorista || !data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }

      db.run(`
        INSERT INTO ferias_motoristas (nome_motorista, data_inicio, data_fim, observacoes)
        VALUES (?, ?, ?, ?)
      `, [nome_motorista, data_inicio, data_fim, observacoes || '']);

      const id = db.getLastId();
      console.log('✅ Férias salvas no banco com ID:', id);
      res.json({ id, message: 'Férias registradas com sucesso!' });
    } catch (error) {
      console.error('❌ Erro ao salvar férias no DB:', error);
      res.status(500).json({ error: error.message });
    }
  });

  //Excluir registro de férias
  expressApp.delete('/api/ferias/:id', (req, res) => {
    try {
      db.run('DELETE FROM ferias_motoristas WHERE id = ?', [parseInt(req.params.id)]);
      res.json({ message: 'Registro de férias removido!' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  //Verificar se um motorista específico está de férias em um data
  expressApp.get('/api/ferias/verificar', (req, res) => {
    try {
      const { motorista, data } = req.query;
      const ferias = db.getAll(`
        SELECT * FROM ferias_motoristas
        WHERE nome_motorista = ? AND data_inicio <= ? AND data_fim >= ?
      `, [motorista, data, data]);

      res.json({ emFerias: ferias.length > 0, registros: ferias });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

app.whenReady().then(async () => {
  await db.initDatabase();
  startServer();
  criarJanela();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) server.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    criarJanela();
  }
});

ipcMain.on('abrir-calendario', () => {
  abrirCalendario();
});

ipcMain.on('selecionar-data', (event, data) => {
  if (mainJanela && !mainJanela.isDestroyed()) {
    mainJanela.webContents.send('data-selecionada', data);
  }
});

ipcMain.on('forcar-foco-janela', () => {
  if (mainJanela && !mainJanela.isDestroyed()) {
    mainJanela.blur(); // Tira o foco
    setTimeout(() => {
      mainJanela.focus(); // Devolve o foco, forçando o Chromium a repaintar os eventos
    }, 50);
  }
});

ipcMain.on('atualizar-calendario', () => {
  if (calendarioJanela && !calendarioJanela.isDestroyed()) {
    calendarioJanela.reload();
  }
});