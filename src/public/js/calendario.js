const API_URL = 'http://localhost:3001/api';
let dataAtual = new Date();
let viagensPorDia = {};
let feriasPorDia = {};

document.addEventListener('DOMContentLoaded', () => {
  carregarDados().then(() => {
    renderizarCalendario();
  });
});

async function carregarDados() {
  try {
    const resViagens = await fetch(`${API_URL}/viagens`);
    const viagens = await resViagens.json();
    viagensPorDia = {};
    viagens.forEach(v => {
      if (v.status !== 'cancelada') {
        if (!viagensPorDia[v.data_viagem]) viagensPorDia[v.data_viagem] = [];
        viagensPorDia[v.data_viagem].push(v);
      }
    });

    const resFerias = await fetch(`${API_URL}/ferias`);
    const ferias = await resFerias.json();
    feriasPorDia = {};
    
    ferias.forEach(f => {
      let dataAtual = new Date(f.data_inicio);
      const dataFim = new Date(f.data_fim);
      
      while (dataAtual <= dataFim) {
        const dataISO = dataAtual.toISOString().split('T')[0];
        if (!feriasPorDia[dataISO]) feriasPorDia[dataISO] = [];
        feriasPorDia[dataISO].push(f);
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
    });
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
}

function renderizarCalendario() {
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();
  
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('mes-ano').textContent = `${meses[mes]} ${ano}`;
  
  const calendario = document.getElementById('calendario');
  calendario.innerHTML = '';
  
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  diasSemana.forEach(dia => {
    const div = document.createElement('div');
    div.className = 'dia-semana';
    div.textContent = dia;
    calendario.appendChild(div);
  });
  
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();
  
  for (let i = 0; i < primeiroDia; i++) {
    const div = document.createElement('div');
    div.className = 'dia vazio';
    calendario.appendChild(div);
  }
  
  for (let dia = 1; dia <= totalDias; dia++) {
    const div = document.createElement('div');
    div.className = 'dia';
    
    const dataISO = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const viagensDoDia = viagensPorDia[dataISO] || [];
    const feriasDoDia = feriasPorDia[dataISO] || [];
    
    const ehHoje = (hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano);
    if (ehHoje) div.classList.add('hoje');
    
    const numero = document.createElement('div');
    numero.className = 'numero';
    numero.textContent = dia;
    div.appendChild(numero);
    
    // Post-its de FÉRIAS
    feriasDoDia.forEach(f => {
      const postit = document.createElement('div');
      postit.className = 'postit postit-ferias';
      postit.textContent = `🏖️ ${f.nome_motorista}`;
      
      postit.onclick = (e) => {
        e.stopPropagation();
        mostrarDetalhesFerias(f, dataISO);
      };
      
      div.appendChild(postit);
    });
    
    // Post-its de VIAGEM
    viagensDoDia.forEach(v => {
      const postit = document.createElement('div');
      postit.className = 'postit postit-viagem';
      const texto = `${v.cidade_destino} - ${v.local_destino}`;
      postit.textContent = `🚗 ${texto}`;
      
      postit.onclick = (e) => {
        e.stopPropagation();
        mostrarDetalhesViagem(v, dataISO);
      };
      
      div.appendChild(postit);
    });
    
    // Clique no dia (fora dos post-its)
    div.onclick = (e) => {
      if (!e.target.classList.contains('postit')) {
        const { ipcRenderer } = require('electron');
        if (ipcRenderer) {
          ipcRenderer.send('selecionar-data', dataISO);
        }
      }
    };
    
    calendario.appendChild(div);
  }
}

function mostrarDetalhesViagem(viagem, dataISO) {
  const modal = document.getElementById('modalDetalhes');
  const titulo = document.getElementById('modal-titulo');
  const conteudo = document.getElementById('modal-conteudo');
  const btnIrParaDia = document.getElementById('btn-ir-para-dia');
  
  titulo.innerHTML = '🚗 Detalhes da Viagem';
  
  conteudo.innerHTML = `
    <div class="info-linha">
      <strong>📅 Data:</strong>
      <span>${formatarDataCompleta(dataISO)}</span>
    </div>
    <div class="info-linha">
      <strong>👤 Pessoa:</strong>
      <span>${viagem.nome_pessoa}</span>
    </div>
    ${viagem.endereco ? `<div class="info-linha"><strong>📍 Endereço:</strong><span>${viagem.endereco}</span></div>` : ''}
    ${viagem.telefone1 ? `<div class="info-linha"><strong>📞 Telefone:</strong><span>${viagem.telefone1}${viagem.telefone2 ? ` / ${viagem.telefone2}` : ''}</span></div>` : ''}
    <div class="info-linha">
      <strong>🏙️ Destino:</strong>
      <span>${viagem.cidade_destino} - ${viagem.local_destino}</span>
    </div>
    ${viagem.horario_atendimento ? `<div class="info-linha"><strong>🕐 Atendimento:</strong><span>${viagem.horario_atendimento}</span></div>` : ''}
    ${viagem.horario_saida ? `<div class="info-linha"><strong>⚠️ Saída:</strong><span>${viagem.horario_saida}</span></div>` : ''}
    ${viagem.nome_motorista ? `<div class="info-linha"><strong>🚗 Motorista:</strong><span>${viagem.nome_motorista}</span></div>` : ''}
    ${viagem.observacoes ? `<div class="info-linha"><strong>📝 Observações:</strong><span>${viagem.observacoes}</span></div>` : ''}
    ${viagem.quem_autorizou ? `<div class="info-linha"><strong>✅ Autorizado por:</strong><span>${viagem.quem_autorizou}</span></div>` : ''}
  `;
    
  modal.style.display = 'block';
}

function mostrarDetalhesFerias(ferias, dataISO) {
  const modal = document.getElementById('modalDetalhes');
  const titulo = document.getElementById('modal-titulo');
  const conteudo = document.getElementById('modal-conteudo');
  const btnIrParaDia = document.getElementById('btn-ir-para-dia');
  
  titulo.innerHTML = '🏖️ Férias do Motorista';
  
  conteudo.innerHTML = `
    <div class="info-linha">
      <strong>👤 Motorista:</strong>
      <span>${ferias.nome_motorista}</span>
    </div>
    <div class="info-linha">
      <strong>📅 Período:</strong>
      <span>De ${formatarDataCompleta(ferias.data_inicio)} até ${formatarDataCompleta(ferias.data_fim)}</span>
    </div>
    ${ferias.observacoes ? `<div class="info-linha"><strong>📝 Observações:</strong><span>${ferias.observacoes}</span></div>` : ''}
  `;
  
  btnIrParaDia.style.display = 'none';
  modal.style.display = 'block';
}

function fecharModalDetalhes() {
  document.getElementById('modalDetalhes').style.display = 'none';
}

function formatarData(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataCompleta(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dataObj = new Date(ano, mes - 1, dia);
  return `${diasSemana[dataObj.getDay()]}, ${dia} de ${meses[parseInt(mes) - 1]} de ${ano}`;
}

function mudarMes(direcao) {
  dataAtual.setMonth(dataAtual.getMonth() + direcao);
  carregarDados().then(renderizarCalendario);
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
  const modal = document.getElementById('modalDetalhes');
  if (event.target === modal) {
    fecharModalDetalhes();
  }
}