const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'viagens.db');
let db;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
    
    // 1. Tabela de Viagens
    db.run(`
      CREATE TABLE IF NOT EXISTS viagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_viagem TEXT NOT NULL,
        quem_autorizou TEXT,
        nome_pessoa TEXT NOT NULL,
        endereco TEXT,
        telefone1 TEXT,
        telefone2 TEXT,
        cidade_destino TEXT,
        local_destino TEXT,
        horario_atendimento TEXT,
        horario_saida TEXT,
        observacoes TEXT,
        nome_motorista TEXT,
        status TEXT DEFAULT 'agendada',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabela de Férias
    db.run(`
      CREATE TABLE IF NOT EXISTS ferias_motoristas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_motorista TEXT NOT NULL,
        data_inicio TEXT NOT NULL,
        data_fim TEXT NOT NULL,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    saveDatabase();
    console.log('✅ Banco de dados inicializado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  }
}

function saveDatabase() {
  try {
    if (db) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  } catch (error) {
    console.error('⚠️ Erro ao salvar arquivo do banco:', error.message);
  }
}

function run(query, params = []) {
  try {
    db.run(query, params);
    saveDatabase();
  } catch (error) {
    console.error('❌ Erro no DB (run):', error);
    throw error;
  }
}

function getOne(query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getAll(query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getLastId() {
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

module.exports = {
  initDatabase,
  run,
  getOne,
  getAll,
  getLastId
};