// ====================================================================================
// CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ====================================================================================

//Endereço base da API (servidor que guarda as viagens e férias)
const API_URL = 'http://localhost:3001/api';

//Lista de férias carregada do servidor
let cacheFerias = [];

// ====================================================================================
// FUNÇÕES AUXILIARES
// ====================================================================================

//Converte a data "AAAA-MM-DD" para "Dia da semana, "DD" de "mês" de "ano" "
function formatarDataBrasil(dataISO) {
  //Se não veio data nenhuma, devolve texto vazio
  if (!dataISO) return '';
  //Separa a data em três pedaços usando o "-" como divisor: ano, mês e dia
  const [ano, mes, dia] = dataISO.split('-');
  // Lista com o nome dos meses (começando na posição 0 = Janeiro, 1 = Fevereiro...)
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  // Lista com os dias da semana (começando na posição 0 = domingo...)                 
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  // Cria um objeto de data (mês começa em 0 no JavaScript, por isso "mes - 1")
  const dataObj = new Date(ano, mes - 1, dia);
  // Monta o texto final usando as listas acima
  return `${diasSemana[dataObj.getDay()]}, ${dia} de ${meses[parseInt(mes) - 1]} de ${ano}`;
}

// Devolve a hora para exibir; se não houver, mosta "--:--", se houver devolve a própria hora
function formatarHora(hora) {
  if (!hora) return '--:--';
  return hora;
}

// Mostra uma mensagem no Modal Personaliza
// Tipo pode ser 'Sucesso', 'Erro' ou 'Aviso'
function notificar(mensagem, tipo ='sucesso'){
  const modal = document.getElementById('modalAlerta');
  const iconCircle = document.getElementById('alerta-icon-circle');
  const iconText = document.getElementById('alerta-exclamacao');
  const titulo = document.getElementById('alerta-titulo');
  const msgElement = document.getElementById('alerta-mensagem');

  // Reseta estilos anteriores
  iconCircle.style.borderColor = '';
  iconCircle.style.background = '';
  iconText.style.color = '';

  // Define o visual baseado no tipo
  if (tipo === 'sucesso') {
    titulo.textContent = '';
    iconCircle.style.borderColor = '#28a745';
    iconCircle.style.background = '#e6f9ed';
    iconText.textContent = '✓';
    iconText.style.color = '#28a745';
  } else if (tipo === 'erro') {
    titulo.textContent = '';
    iconCircle.style.borderColor = '#dc3545';
    iconCircle.style.background = '#fde8e8';
    iconText.textContent = '✕';
    iconText.style.color = '#dc3545';
  } else {
    titulo.textContent = '';
    iconCircle.style.borderColor = '#fd7e14';
    iconCircle.style.background = '#fff4e6';
    iconText.textContent = '!';
    iconText.style.color = '#fd7e14';
  }

  msgElement.textContent = mensagem;
  modal.style.display = 'block';
}

// Mostra uma caixa "Sim/Não" dentro da página
// Devolve uma Promise: quem chamar usa "await" e recebe true ou false
function confirmar(mensagem) {
  return new Promise((resolve) => {
    // Cria um fundo escuro que cobre toda tela
    const fundo = document.createElement('div');
    // Estilo do fundo
    fundo.style.cssText = `
      position: fixed; inset: 0; z-index: 99998;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
    `;
    // Cria o conteúdo da caixa: a pergunta e dois botões
    // * as aspas especiais ` permitem escrever o HTML em várias linhas
    fundo.innerHTML = `
      <div style="background: #fff; padding: 24px; border-radius: 10px; max-width: 360px; text-align: center;">
        <p style="margin: 0 0 18px; font-size: 16px;"></p>
        <button class="btn btn-danger" data-resposta="sim">Sim</button>
        <button class="btn btn-secondary" data-resposta="nao">Não</button>
      </div>
    `;
    // Coloca a pergunta com textContent (* para textos é melhor que innerHTML)
    fundo.querySelector('p').textContent = mensagem;
    
    fundo.addEventListener('click', (e) => {
      // Lê qual botão foi clicado (o valor do atributo data-resposta)
      const resposta = e.target.dataset.resposta;
      // Se clicar em fora do botão, ignora
      if (!resposta) return;
      // Remove caixa da tela
      fundo.remove();
      // Entrega a resposta: true ou false
      resolve(resposta === 'sim');
    });
    // Coloca a caixa na página para o usuário ver
    document.body.appendChild(fundo);
  })
}

// Atalho para pegar o valor do campo "data-selecionada" no topo da tela
function pegarDataSelecionada(){
  // Procura o campo pelo id
  const campo = document.getElementById('data-selecionada');
  // Se o campo existir, devolve o valor dele, senão devolve texto vazio
  return campo ? campo.value : '';
}

// Atualiza o texto da data grande no topo ("Segunda-feira, 1 de Outubro de 1992...")
function atualizarTextoData(dataISO) {
  // Procura o elemento onde o texto aparece
  const textoData = document.getElementById('data-atual');
  // Se existir, troca o texto dele pela data formatada
  if (textoData) textoData.textContent = formatarDataBrasil(dataISO);
}

// Atualiza a janela do calendário
function atualizarCalendarioSeAberto() {
  // Chama se a ponte com o Electron existir e tiver essa função
  if (window.electronAPI && window.electronAPI.atualizarCalendario) {
    // Recarrega o calendário
    window.electronAPI.atualizarCalendario();
  }
}

// ====================================================================================
// NAVEGAÇÃO DE DIA
// ====================================================================================
function mudarDia(direcao) {
  const campoData = document.getElementById('data-selecionada');
  if (!campoData || !campoData.value) return;

  const dataAtual = new Date(campoData.value);
  dataAtual.setDate(dataAtual.getDate() + direcao);

  const novaData = dataAtual.toISOString().split('T')[0];
  campoData.value = novaData;

  atualizarTextoData(novaData);
  carregarViagensDia();
}

// Agrupar viagens por destino e horário de saída
function agruparViagens(viagens){
  const grupos = {};

  viagens.forEach(viagem => {
    // Chave única: destino + local + horário de saída
    const chave = `${viagem.cidade_destino}|${viagem.horario_saida || 'sem-horario'}`;

    if (!grupos[chave]) {
      grupos[chave] = {
        cidade: viagem.cidade_destino,
        local: viagem.local_destino,
        horarioSaida: viagem.horario_saida,
        horario_atendimento: viagem.horario_atendimento,
        motorista: viagem.nome_motorista,
        passageiros: []
      };
    }

    grupos[chave].passageiros.push(viagem);
  });

  return Object.values(grupos);
}

// Renderizar viagens aggrupadas
function renderizarViagensAgrupadas(viagens) {
  const grupos = agruparViagens(viagens);

  return grupos.map(grupo => {
    const passageirosHTML = grupo.passageiros.map(p => `
      <div class="passageiro-item">
        <div class="passageiro-nome">👤 ${p.nome_pessoa}</div>
        ${p.endereco ? `<div class="passageiro-info">📍 ${p.endereco}</div>` : ''}
        ${p.telefone1 ? `<div class="passageiro-info"> ${p.telefone1}${p.telefone2 ? ` | ${p.telefone2}` : ''}</div>` : ''}
        ${p.observacoes ? `<div class="passageiro-info">📝 ${p.observacoes}</div>` : ''}
        ${p.quem_autorizou ? `<div class="passageiro-info" style="font-size: 12px; color: #999; margin-top: 8px;">Autorizado por: ${p.quem_autorizou}</div>` : ''}
        <div class="grupo-acoes">
          <button class="btn btn-secondary" onclick="editarViagem(${p.id})">✏️ Editar</button>
          ${p.status !== 'cancelada' ? `<button class="btn btn-danger" onclick="cancelarViagem(${p.id})">❌ Cancelar</button>` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="grupo-viagem">
        <div class="grupo-header">
          🏙️ ${grupo.cidade} - ${grupo.local}
          ${grupo.horarioAtendimento ? `- ${grupo.horarioAtendimento}` : ''}
          ${grupo.horarioSaida ? `<span style="margin-left: auto; background: #ccff00; padding: 4px 12px; border-radius: 6px; color: #000;">⚠️ Saída: ${grupo.horarioSaida}</span>` : ''}
        </div>
        ${grupo.motorista ? `<div style="margin-bottom: 15px; font-size: 14px; color: #666;">🚗 Motorista: <strong>${grupo.motorista}</strong></div>` : ''}
        ${passageirosHTML}
      </div>
    `;
  }).join('');
}


// ====================================================================================
// VIAGENS
// ====================================================================================

// Montar o HTML (card) de uma viagem
function montarCardViagem(viagem, opcoes = {}){
  // Pega as opções, com valores padrão caso não venham informadas
  const { comAcoes = false, avisoFerias = '' } = opcoes;

  // *O formato "condição ? algo : ''" significa "se existir, mostra; senão, não"
  return `
    <div class="viagem-item ${viagem.status === 'cancelada' ? 'cancelada' : ''}" data-id="${viagem.id}">
      <div class="viagem-destino-linha">
        🏙️ ${viagem.cidade_destino} - ${viagem.local_destino} - ${formatarHora(viagem.horario_atendimento)}
      </div>
      <div class="viagem-nome">👤 ${viagem.nome_pessoa}</div>
      ${viagem.endereco ? `<div class="viagem-info"><strong>📍 Endereço:</strong> ${viagem.endereco}</div>` : ''}
      ${viagem.telefone1 ? `<div class="viagem-info"><strong>📞 Tel:</strong> ${viagem.telefone1}${viagem.telefone2 ? ` | ${viagem.telefone2}` : ''}</div>` : ''}
      ${viagem.observacoes ? `<div class="viagem-info"><strong>📝 Obs:</strong> ${viagem.observacoes}</div>` : ''}
      ${viagem.horario_saida ? `<div class="viagem-saida">⚠️ Saída: ${formatarHora(viagem.horario_saida)}</div>` : ''}
      ${viagem.nome_motorista ? `<div class="viagem-info"><strong>🚗 Motorista:</strong> ${viagem.nome_motorista}</div>` : ''}
      ${viagem.quem_autorizou ? `<div class="viagem-autorizado">Autorizado por: ${viagem.quem_autorizou}</div>` : ''}
      ${avisoFerias}
      ${comAcoes ? `
        <div class="viagem-acoes">
          <button class="btn btn-secondary" onclick="editarViagem(${viagem.id})">✏️ Editar</button>
          ${viagem.status !== 'cancelada' ? `<button class="btn btn-danger" onclick="cancelarViagem(${viagem.id})">❌ Cancelar</button>` : ''}
        </div>` : ''}
    </div>`;
}

// Buscar as viagens da data escolhida e apresenta-las na tela
async function carregarViagensDia() {
  const data = pegarDataSelecionada();
  const listaViagens = document.getElementById('lista-viagens');

  await carregarFerias();

  if (!data) {
    listaViagens.innerHTML = `<div class="empty-state"><div class="icone">📋</div><p>Selecione uma data</p></div>`;
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/viagens/data/${data}`);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    const viagens = await response.json();
    
    if (viagens.length === 0) {
      listaViagens.innerHTML = `
        <div class="empty-state">
          <div class="icone">📭</div>
          <p>Nenhuma viagem agendada para ${formatarDataBrasil(data)}</p>
        </div>`;
      return;
    }

    // Agrupa as viagens por destino e horário
    const grupos = agruparViagens(viagens);
    let htmlGrupos = '';

    // Percorre cada GRUPO de viagem
    grupos.forEach(grupo => {
      // Verifica se o motorista deste grupo está de férias
      let avisoFeriasGrupo = '';
      if (grupo.motorista && motoristaEstaDeFerias(grupo.motorista, data)) {
        avisoFeriasGrupo = `<div style="background: #fff3cd; color: #856404; padding: 8px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; font-weight: bold; text-align: center;">
            ⚠️ ATENÇÃO: O motorista ${grupo.motorista} está de FÉRIAS neste período!
          </div>`;
      }
      
      // Monta os cards dos passageiros dentro deste grupo
      const passageirosHTML = grupo.passageiros.map(p => `
        <div class="passageiro-item">
          <div class="passageiro-nome">👤 ${p.nome_pessoa}</div>
          ${p.endereco ? `<div class="passageiro-info">📍 ${p.endereco}</div>` : ''}
          ${p.telefone1 ? `<div class="passageiro-info">📞 ${p.telefone1}${p.telefone2 ? ` | ${p.telefone2}` : ''}</div>` : ''}
          ${p.observacoes ? `<div class="passageiro-info">📝 ${p.observacoes}</div>` : ''}
          ${p.quem_autorizou ? `<div class="passageiro-info" style="font-size: 12px; color: #999; margin-top: 8px; border-top: 1px solid #eee; padding-top: 5px;">Autorizado por: ${p.quem_autorizou}</div>` : ''}
          
          <div class="grupo-acoes">
            <button class="btn btn-secondary" onclick="editarViagem(${p.id})">✏️ Editar</button>
            <button class="btn" style="background: #dc3545; color: white; ${p.status === 'cancelada' ? 'opacity: 0.5; cursor: default;' : ''}" 
              onclick="${p.status !== 'cancelada' ? `mudarStatusViagem(${p.id}, 'cancelada')` : 'return false'}">
              ❌ Cancelada
            </button>
            <button class="btn" style="background: #28a745; color: white; ${p.status === 'realizada' ? 'opacity: 0.5; cursor: default;' : ''}" 
              onclick="${p.status !== 'realizada' ? `mudarStatusViagem(${p.id}, 'realizada')` : 'return false'}">
              ✅ Realizada
            </button>
          </div>
        </div>
      `).join('');

      //Determina o Status do grupo
      const statusGrupo = getStatusDoGrupo(grupo.passageiros);
      
      // Monta o card principal do grupo
      htmlGrupos += `
        <div class="grupo-viagem">
          <div class="grupo-header">
            <div class="grupo-header-esquerda">
              <div class="grupo-destino">            
                🏙️ ${grupo.cidade} - ${grupo.local}
              </div>
              ${grupo.horario_atendimento ? `<div class="grupo-horario"> 🕐 ${grupo.horario_atendimento}</div>` : ''}
            </div>
            ${grupo.horarioSaida && grupo.horarioSaida !== 'sem-horario' ? `<span style="margin-left: auto; background: #ccff00; padding: 4px 12px; border-radius: 6px; color: #000; font-weight: bold;">⚠️ Saída: ${grupo.horarioSaida}</span>` : ''} 
          </div>
          
          ${avisoFeriasGrupo}
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 2px 1px; background: #f8f9fa; border-radius: 8px;">
            <span style="font-size: 14px; color: #1e3a5f; font-weight: 600;">
              ${grupo.motorista ? `🚗 Motorista: ${grupo.motorista}` : ''}
            </span>
            ${getBadgeStatus(statusGrupo)}
          </div>

          ${passageirosHTML}
        </div>
      `;
    });

    // Coloca tudo na tela com a classe de Grid
    listaViagens.innerHTML = `<div class="lista-viagens-grid">${htmlGrupos}</div>`;

  } catch (error) {
    console.error('Erro ao carregar viagens:', error);
    listaViagens.innerHTML = `<div class="empty-state" style="color: red;"><p>Erro ao carregar: ${error.message}</p></div>`;
  }
}

// Busca uma viagem pelo id e preenche o formulário com seus dados
async function buscarViagem(id) {
  try {
    // Busca no servidor uma viagem com esse id
    const response = await fetch(`${API_URL}/viagens/${id}`);
    // Converte a resposta em objeto
    const viagem = await response.json();
    
    // Preenche cada campo do formulário.  * o "||" evita escrever "null" no campo
    document.getElementById('viagem-id').value = viagem.id;
    document.getElementById('data_viagem').value = viagem.data_viagem;
    document.getElementById('quem_autorizou').value = viagem.quem_autorizou || '';
    document.getElementById('nome_pessoa').value = viagem.nome_pessoa;
    document.getElementById('endereco').value = viagem.endereco || '';
    document.getElementById('telefone1').value = viagem.telefone1 || '';
    document.getElementById('telefone2').value = viagem.telefone2 || '';
    document.getElementById('cidade_destino').value = viagem.cidade_destino || '';
    document.getElementById('local_destino').value = viagem.local_destino || '';
    document.getElementById('horario_atendimento').value = viagem.horario_atendimento || '';
    document.getElementById('horario_saida').value = viagem.horario_saida || '';
    document.getElementById('observacoes').value = viagem.observacoes || '';
    document.getElementById('nome_motorista').value = viagem.nome_motorista || '';
    document.getElementById('status').value = viagem.status || 'agendada';
  } catch (error) {
    // Se falhar, avisa o usuário (sem travar a janela)
    alert('Erro ao carregar dados da viagem');
  }
}

// Salva a viagem do formulário: cria ou atualiza uma existente
async function salvarViagem(e) {
  // Impede o comportamento padrão do formulário (recarregar a página)
  e.preventDefault();
  
  // Lê o id escondido: se tiver valor, estamos editando; se estiver vazio, criando
  const id = document.getElementById('viagem-id').value;

  // Reune todos os valores do formulário em um único objeto
  const data = {
    data_viagem: document.getElementById('data_viagem').value,
    quem_autorizou: document.getElementById('quem_autorizou').value,
    nome_pessoa: document.getElementById('nome_pessoa').value,
    endereco: document.getElementById('endereco').value,
    telefone1: document.getElementById('telefone1').value,
    telefone2: document.getElementById('telefone2').value,
    cidade_destino: document.getElementById('cidade_destino').value,
    local_destino: document.getElementById('local_destino').value,
    horario_atendimento: document.getElementById('horario_atendimento').value,
    horario_saida: document.getElementById('horario_saida').value,
    observacoes: document.getElementById('observacoes').value,
    nome_motorista: document.getElementById('nome_motorista').value || null,
    // Por pré definição inicia "Agendada"
    status: document.getElementById('status').value || 'agendada'
  };
  
  try {
    // Se tem id, o endereço inclui o id (editar); senão, é endereço geral (criar)
    const url = id ? `${API_URL}/viagens/${id}` : `${API_URL}/viagens`;
    // PUT atualiza uma viagem existente; POST cria uma nova
    const method = id ? 'PUT' : 'POST';
    
    // Envia os dados para o servidor
    const response = await fetch(url, {
      method: method,   // PUT ou POST
      headers: { 'Content-Type': 'application/json' },    // Avisa que estamos enviando JSON
      body: JSON.stringify(data)    // Transforma o objeto em texto JSON
    });
    
    // Lê a resposta do servidor
    const result = await response.json();
    
    // Verifica se deu tudo certo
    if (response.ok) {
      // Primeiro fecha o MODAL
      fecharModal();
      // Mostra o AVISO de sucesso (sem travar com o alert)
      notificar(result.message, 'sucesso');
      // Recarrega a lista de viagens do dia
      carregarViagensDia();
      // Avisa o calendário para se atualizar
      atualizarCalendarioSeAberto();

    } else {
      // Se o servidor recusou, mostra o motivo
      notificar((result.error || result.message), 'erro');
    }

  } catch (error) {
    // Se nem chegou no servidor
    notificar('erro');
  }
}

// Chamar para "Editar" de cada cartão: abre o Modal já preenchido
async function editarViagem(id) {
  // Reaproveita a função de abrir o modal, passando o id da viagem
  abrirModal(id);
}

// Muda o status da viagem (Agendada, Realizada ou Cancelada)
async function mudarStatusViagem(id, novoStatus) {
  const mensagens = {
    'cancelada': 'Deseja marcar esta viagem como CANCELADA?',
    'realizada': 'Deseja marcar esta viagem como REALIZADA?'
  };
  
  const confirmou = await confirmar(mensagens[novoStatus]);
  if (!confirmou) return;
  
  try {
    // Busca a viagem completa primeiro
    const viagemResponse = await fetch(`${API_URL}/viagens/${id}`);
    const viagem = await viagemResponse.json();

    console.log(' Viagem antes:', viagem);

    // Atualiza apenas o status, mantendo todos os outros campos
    const dadosAtualizados = {
      ...viagem,
      status: novoStatus
    };

    console.log('📤 Enviando:', dadosAtualizados);

    // Envia a viagem completa como o novo status
    const response = await fetch(`${API_URL}/viagens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosAtualizados)
    });
    
    const result = await response.json();

    console.log('📥 Resposta:', result);
    
    if (response.ok) {
      notificar(`Viagem marcada como ${novoStatus.toUpperCase()}`, 'sucesso');
      carregarViagensDia();
      atualizarCalendarioSeAberto();
    } else {
      notificar('Erro ao atualizar status: ' + (result.error || result.message), 'erro');
    }
  } catch (error) {
    console.error('Erro de rede:', error);
    notificar('Erro de conexão com o servidor.', 'erro');
  }
}

// Determina o status "mais relevante" do grupo
function getStatusDoGrupo(passageiros) {
  const temCancelada = passageiros.some(p => p.status === 'cancelada');
  const temAgendada = passageiros.some(p => p.status === 'agendada');
  
  if (temCancelada) return 'cancelada';
  if (temAgendada) return 'agendada';
  return 'realizada';
}

// Retorna o HTML do badge de status
function getBadgeStatus(status) {
  const estilos = {
    'cancelada': 'background: #dc3545; color: white; letter-spacing: 2px;',
    'agendada': 'background: #ffc107; color: #000; letter-spacing: 2px;',
    'realizada': 'background: #28a745; color: white; letter-spacing: 2px;'
  };
  
  const icones = {
    'cancelada': '❌',
    'agendada': '📅',
    'realizada': '✅'
  };
  
  const labels = {
    'cancelada': 'CANCELADA',
    'agendada': 'AGENDADA',
    'realizada': 'REALIZADA'
  };
  
  // Se não vier status, assume agendada
  const statusFinal = status || 'agendada';

  return `
    <span style="
      ${estilos[statusFinal]};
      padding: 4px 12px;
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 700;
      letter-spacing: 1px;
      display: incline-flex;
      align-items: center;
      gap: 6px;
      border: 2px solid rgba(255,255,255,0.3);
    ">
      ${icones[statusFinal]} ${labels[statusFinal]}
    </span>
  `;
}

// Deleta permanentemente a viagem do banco
async function deletarViagem(id) {
  const confirmou = await confirmar('⚠️ ATENÇÃO: Deseja DELETAR PERMANENTEMENTE esta viagem? Esta ação não pode ser desfeita.');
  if (!confirmou) return;
  
  try {
    const response = await fetch(`${API_URL}/viagens/${id}`, { method: 'DELETE' });
    
    if (response.ok) {
      notificar('Viagem deletada permanentemente', 'sucesso');
      fecharModal();
      carregarViagensDia();
      atualizarCalendarioSeAberto();
    } else {
      notificar('Erro ao deletar viagem', 'erro');
    }
  } catch (error) {
    console.error('Erro de rede:', error);
    notificar('Erro de conexão com o servidor.', 'erro');
  }
}

// ====================================================================================
// MODAL DE VIAGEM (abrir e fechar)
// ====================================================================================

// Abre o Modal. Sem argumento = nova viagem. Com id = editar viagem
function abrirModal(idViagem = null) {
  // Pega o Modal e o formulário
  const modal = document.getElementById('modalViagem');
  const form = document.getElementById('formViagem');
  
  // Resetar o formulário
  form.reset();
  
  // Garantir que todos os campos estejam habilitados
  form.querySelectorAll('input, textarea, select').forEach((campo) => {
    campo.disabled = false;   // Libera o campo
    campo.readOnly = false;   // Permite digitar
  });

  // Pega o título do Modal e os grupos que só aparecem ao editar
  const tituloModal = document.getElementById('titulo-modal');
  const grupoMotorista = document.getElementById('grupo-motorista');
  const grupoStatus = document.getElementById('grupo-status');

  // Se veio um id, estamos EDITANDO
  if (idViagem) {
  tituloModal.textContent = '✏️ Editar Viagem';
  grupoMotorista.style.display = 'block';
  grupoStatus.style.display = 'block';
  buscarViagem(idViagem);
  
  // Adiciona botão de deletar no modal (remove se já existir)
  const btnDeletarExistente = document.getElementById('btn-deletar-viagem');
  if (btnDeletarExistente) btnDeletarExistente.remove();
  
  const btnDeletar = document.createElement('button');
  btnDeletar.id = 'btn-deletar-viagem';
  btnDeletar.type = 'button';
  btnDeletar.className = 'btn';
  btnDeletar.style.cssText = 'background: #dc3545; color: white; margin-left: auto;';
  btnDeletar.textContent = '🗑️ Deletar Permanentemente';
  btnDeletar.onclick = () => deletarViagem(idViagem);
  
  // Adiciona o botão no final das ações do modal
  const modalAcoes = document.querySelector('.modal-acoes');
  if (modalAcoes) {
    modalAcoes.insertBefore(btnDeletar, modalAcoes.firstChild);
  }
} else {
  // Modo criação: remove botão de deletar se existir
  const btnDeletarExistente = document.getElementById('btn-deletar-viagem');
  if (btnDeletarExistente) btnDeletarExistente.remove();
  
  tituloModal.textContent = '➕ Cadastrar Nova Viagem';
  grupoMotorista.style.display = 'none';
  grupoStatus.style.display = 'none';
  document.getElementById('viagem-id').value = '';
  
  const dataSelecionada = pegarDataSelecionada();
  if (dataSelecionada) {
    document.getElementById('data_viagem').value = dataSelecionada;
    
    const motoristasDeFerias = listarMotoristasDeFerias(dataSelecionada);
    if (motoristasDeFerias.length > 0) {
      mostrarAlertaMotoristasFerias(motoristasDeFerias, formatarDataBrasil(dataSelecionada));
    }
  }
}

  // Mostrar o Modal na tela
  modal.style.display = 'block';

  // FOCO NO ELECTRON
  // Simula o "acordar" da janela que acontece quando o calendário é fechado
  setTimeout(() => {
    const primeiroCampo = document.getElementById('data_viagem');
    if (primeiroCampo) {
      // A sequência abaixo para destravar inputs no Electron
      primeiroCampo.blur();       // 1. Tira qualquer foco "fantasma"
      document.body.focus();      // 2. Foca no corpo da página (reseta o estado)
      primeiroCampo.focus();      // 3. Foca no campo desejado
      primeiroCampo.click();      // 4. Simula um clique para garantir o cursor
    }
  }, 150); // 150ms é o tempo ideal para o Electron processar a exibição do modal
}

// Fechar Modal de viagem
function fecharModal() {
  // Pega o Modal
  const modal = document.getElementById('modalViagem');
  // Se existir, esconde
  if (modal) modal.style.display = 'none';
}

// Fechar o Modal se o clique foi no fundo escuro
function fecharModalSeForFundo(event) {
  // event.target é o elemento que recebeu o clique
  if (event.target.id === 'modalViagem') {
    fecharModal();
  }
}

// ====================================================================================
// FÉRIAS DOS MOTORISTAS
// ====================================================================================

// Busca todas as férias no servidor e guarda no cacheFerias
async function carregarFerias() {
  try {
    // Pede ao servidor a lista
    const response = await fetch(`${API_URL}/ferias`);
    // Guarda a lista na variável global
    cacheFerias = await response.json();
    // Atualiza a lista exibida no Modal de férias
    renderizarListaFerias();

  } catch (error) {
    // Se falhar, só registra no console (a tela principal continua funcionando)
    console.error('Erro ao carregar férias:', error);
  }
}

// Desenha a lista de férias dentro do Modal de férias
function renderizarListaFerias() {
  // Pega a área da lista
  const lista = document.getElementById('lista-ferias');
  // Se o Modal não existir nesta tela, sai sem fazer nada
  if (!lista) return; // Segurança caso o modal não exista

  // Se não há nenhum registro, mostra uma mensagem simples
  if (cacheFerias.length === 0) {
    lista.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 10px;">Nenhum registro de férias.</p>';
    return;
  }

  // Para cada registro de férias, monta uma linha com nome, datas e botão de excluir
  lista.innerHTML = cacheFerias.map(f => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #fd7e14;">
      <div>
        <strong>${f.nome_motorista}</strong><br>
        <small>${formatarDataBrasil(f.data_inicio)} até ${formatarDataBrasil(f.data_fim)}</small>
        ${f.observacoes ? `<br><small style="color:#666">${f.observacoes}</small>` : ''}
      </div>
      <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="excluirFerias(${f.id})">🗑️</button>
    </div>
  `).join('');
}

// Abre o Modal de férias
function abrirModalFerias() {
  // Limpa o formulário de férias (se existir)
  const form = document.getElementById('formFerias');
  if (form) form.reset();
  // Mostra o Modal
  const modal = document.getElementById('modalFerias');
  if (modal) modal.style.display = 'block';
  // Recarrega a lista para garantir que está atualizada
  carregarFerias();
}

// Fecha o Modal de férias
function fecharModalFerias() {
  const modal = document.getElementById('modalFerias');
  if (modal) modal.style.display = 'none';
}

// Salva um novo período de férias
async function salvarFerias(e){
  // Impede o formulário de recarregar a página
  e.preventDefault();

  // Pega os valores EXATOS dos IDs do HTML
  const data = {
    nome_motorista: document.getElementById('nome_motorista_ferias').value.trim(),
    data_inicio: document.getElementById('data_inicio_ferias').value,
    data_fim: document.getElementById('data_fim_ferias').value,
    observacoes: document.getElementById('obs_ferias').value.trim()
  };

  try {
    // Envia para o servidor criar o registro
    const response = await fetch(`${API_URL}/ferias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    // Lê a resposta
    const result = await response.json();

    // Se deu certo
    if (response.ok) {
      fecharModalFerias();
      document.getElementById('formFerias').reset();
      notificar(result.message, 'sucesso');
      await carregarViagensDia();   // Recarrega (isso também recarrega as férias)
      atualizarCalendarioSeAberto();
      
    } else {
      // Se o servidor recusou, mostra o motivo
      notificar((result.error || 'Verifique os dados'), 'erro');
    }
  } catch (error) {
    // Erro de Rede
    console.error('Erro de rede:', error);
    notificar('Erro de conexão ao salvar férias.', 'erro');
  }
}

// Exclui um registro de Férias
async function excluirFerias(id) {
  // Pergunta se tem certeza 
  const confirmou = await confirmar('Remover este registro de férias?');
  // Se responder "Não", para aqui
  if (!confirmou) return;

  try {
    // Pede ao servidor para apagar
    const response = await fetch(`${API_URL}/ferias/${id}`, { method: 'DELETE' });
    // Se apagou, atualiza as telas
    if (response.ok) {
      await carregarViagensDia();
      atualizarCalendarioSeAberto();
    }
  } catch (error) {
    notificar('Erro ao excluir.', 'erro');
  }
}

// Diz se um motorista está de férias (devolvendo true or false)
function motoristaEstaDeFerias(nomeMotorista, dataViagem) {
  //Sem nome de motorista, não há ninguém de férias
  if (!nomeMotorista) return false;
  // some() devolve true se algum registro de férias combinar com as condições
  return cacheFerias.some((f) =>
    // Compara os nomes ignorando maiusculas/minusculas
    f.nome_motorista.toLowerCase() === nomeMotorista.toLowerCase() &&
    // Verifica se a data está entre o início e o fim (datas ISO comparam como o texto)
    dataViagem >= f.data_inicio && dataViagem <= f.data_fim
  );
}

// Lista todos os motoristas que estão de férias em um data (sem repetir nomes)
function listarMotoristasDeFerias(data) {
  // Sem data ou sem férias cadastradas, devolve lista vazia
  if (!data || cacheFerias.length === 0) return [];

  // Converte o texto da data para um objeto de data real
  const dataSelecionada = new Date(data + 'T00:00:00');

  // Filtra só as férias que incluem a data escolhida
  const motoristasDeFerias = cacheFerias
  .filter(f => {
    const inicio = new Date(f.data_inicio + 'T00:00:00');   // Inicio das Férias
    const fim = new Date(f.data_fim + 'T00:00:00');   // Fim das Férias
    return dataSelecionada >= inicio && dataSelecionada <= fim;   // está dentro ?
  })
  // Transforma cada registro em um objeto simples com nome e data final
  .map((f) => ({ nome: f.nome_motorista, dataFim: f.data_fim }));
  
  // Set guarda valores únicos: usamos para lembrar quais nomes já apareceram: Remove duplicatas
  const nomesUnicos = new Set();
  // Mantém só a primeira ocorrência de cada nome
  return motoristasDeFerias.filter((m) => {
    if (nomesUnicos.has(m.nome)) return false;
    nomesUnicos.add(m.nome);
    return true;
  });
}

// Mostra o Modal de alerta com os motorista de férias (Alerta Personalizado)
function mostrarAlertaMotoristasFerias(motoristasDeFerias, dataFormatada) {
  // Pega os elementos do Modal de alerta
  const modal = document.getElementById('modalAlerta');
  const titulo = document.getElementById('alerta-titulo');
  const mensagem = document.getElementById('alerta-mensagem');
  
  // Se for só um motorista, mostra uma mensagem direta
  if (motoristasDeFerias.length === 1) {
    const m = motoristasDeFerias[0];
    titulo.textContent = m.nome;
    mensagem.textContent = `Está de Férias/Folga até ${formatarDataBrasil(m.dataFim)}`;
  } else {
    // Se forem vários, mostra uma lista numerada
    titulo.textContent = 'Motoristas de Férias';
    let msgHTML = `<strong>Data:</strong> ${dataFormatada}<br><br>`;
    motoristasDeFerias.forEach((m, index) => {
      msgHTML += `${index + 1}. <strong>${m.nome}</strong> - até ${formatarDataBrasil(m.dataFim)}<br>`;
    });
    mensagem.innerHTML = msgHTML;
  }
  
  // Exibe o Modal de alerta
  modal.style.display = 'block';
}

// Fechar o Modal de alerta
function fecharModalAlerta() {
  document.getElementById('modalAlerta').style.display = 'none';
}

// ====================================================================================
// GERAR IMAGEM DO DIA
// ====================================================================================

// Gera um arquivo PNG com as viagens do dia selecionado
async function gerarImagemDia() {
  // Lê a data selecionada
  const data = pegarDataSelecionada();
  
  try {
    // Busca as viagens do dia
    const response = await fetch(`${API_URL}/viagens/data/${data}`);
    let viagens = await response.json();

    // Filtra viagens canceladas (Não devem aparecerer na imagem)
    viagens = viagens.filter(v => v.status !== 'cancelada');
    
    // Se não há viagens, avisa e para
    if (viagens.length === 0) {
      notificar('Não há viagens agendadas para este dia!', 'aviso');
      return;
    }

    // Escreve a data no cabeçalho da imagem
    document.getElementById('data-imagem').textContent = formatarDataBrasil(data);
    
    // Preenche o conteúdo da imagem com os cartões (sem botões, sem aviso de férias)
    const conteudo = document.getElementById('conteudo-imagem');
    // Layout igual ao da tela principal
    conteudo.innerHTML = viagens.map(viagem => `
      <div class="viagem-item ${viagem.status === 'cancelada' ? 'cancelada' : ''}" data-id="${viagem.id}">
        <div class="viagem-destino-linha">
          🏙️ ${viagem.cidade_destino} - ${viagem.local_destino} - ${formatarHora(viagem.horario_atendimento)}
        </div>
        <div class="viagem-nome">👤 ${viagem.nome_pessoa}</div>
        ${viagem.endereco ? `<div class="viagem-info"><strong>📍 Endereço:</strong> ${viagem.endereco}</div>` : ''}
        ${viagem.telefone1 ? `<div class="viagem-info"><strong>📞 Tel:</strong> ${viagem.telefone1}${viagem.telefone2 ? ` | ${viagem.telefone2}` : ''}</div>` : ''}
        ${viagem.observacoes ? `<div class="viagem-info"><strong>📝 Obs:</strong> ${viagem.observacoes}</div>` : ''}
        ${viagem.horario_saida ? `<div class="viagem-saida">⚠️ Saída: ${formatarHora(viagem.horario_saida)}</div>` : ''}
        ${viagem.nome_motorista ? `<div class="viagem-info"><strong>🚗 Motorista:</strong> ${viagem.nome_motorista}</div>` : ''}
        ${viagem.quem_autorizou ? `<div class="viagem-autorizado">Autorizado por: ${viagem.quem_autorizou}</div>` : ''}
      </div>
    `).join('');

    // Espera 300ms (3s) para o navegador terminar de desenhar antes de fotografar
    await new Promise(resolve => setTimeout(resolve, 300));

    // Confere se a biblioteca html2canvas (que tira a "foto") foi carregada
    if (typeof html2canvas === 'undefined') {
      notificar('❌ Biblioteca html2canvas não carregada.', 'erro');
      return;
    }

    // Pega a área que será tranformada em imagem
    const elemento = document.getElementById('area-imagem-caderno');
    if (!elemento) {
      notificar('❌ Elemento de imagem não encontrado.', 'erro');
      return;
    }

    // Tira o "print" da área (Scale 2 = o dobro da qualidade)
    const canvas = await html2canvas(elemento, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });
    
    // Converter a foto para um endereço de imagem PNG
    const imagem = canvas.toDataURL('image/png');
    // Cria um link invisível para baixar o arquivo
    const link = document.createElement('a');
    // Nome do arquivo: viagens-20261014.png (removeos "-" da data)
    link.download = `viagens-${data.replace(/-/g, '')}.png`;
    // Endereço do arquivo
    link.href = imagem;
    // "Crica" no link para iniciar o download
    link.click();
    
    // Avisa que deu certo
    notificar('Imagem gerada com sucesso!', 'sucesso');
    
  } catch (error) {
    // Registra e mostra o erro
    console.error('Erro ao gerar imagem:', error);
    notificar('Erro ao gerar imagem: ' + error.message, 'erro');
  }
}

// ====================================================================================
// ATUALIZAR (HARD RESET) - botão "Atualizar"
// ====================================================================================

// Fechar o Modal, limpa o formulário e recarrega a lista
async function hardReset() {
  console.log('🔄 Executando hard reset...');

  // Pega a lista, o formulário e o Modal
  const listaViagens = document.getElementById('lista-viagens');
  const form = document.getElementById('formViagem');
  
  //Fechar modal de viagem, se estiver aberto
  fecharModal();

  // Limpa o formulário, se existir
  if (form) form.reset();

  //Mostra o estado do carregamento
  listaViagens.innerHTML = '<div class="empty-state"><div class="icone">🔄</div><p>Atualizando lista...</p></div>';

  // Aguardar
  await new Promise(resolve => setTimeout(resolve, 200));

  //Recarregar viagens
  await carregarViagensDia();  
}

// ====================================================================================
// SISTEMA DE ABAS E RELATÓRIOS
// ====================================================================================

// Troca entre as abas
function trocarAba(abaNome) {
  // Remove classe ativa de todas as abas e conteúdos
  document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('ativa'));
  document.querySelectorAll('.aba-conteudo').forEach(conteudo => conteudo.classList.remove('ativa'));
  
  // Adiciona classe ativa na aba clicada
  const btnAtiva = document.querySelector(`.aba-btn[onclick="trocarAba('${abaNome}')"]`);
  if (btnAtiva) btnAtiva.classList.add('ativa');
  
  const conteudoAtivo = document.getElementById(`aba-${abaNome}`);
  if (conteudoAtivo) conteudoAtivo.classList.add('ativa');
  
  // Se for a aba de relatórios, carrega os dados
  if (abaNome === 'relatorios') {
    setTimeout(() => atualizarRelatorios(), 100);
  }
}

// Atualiza todos os relatórios
async function atualizarRelatorios() {
  try {
    console.log('Carregando relatórios...');
    
    // Busca todas as viagens
    const response = await fetch(`${API_URL}/viagens`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const viagens = await response.json();
    console.log('Viagens carregadas:', viagens.length);
    
    const anoAtual = new Date().getFullYear();
    
    // Filtra viagens do ano atual
    const viagensAno = viagens.filter(v => {
      if (!v.data_viagem) return false;
      const dataViagem = new Date(v.data_viagem);
      return dataViagem.getFullYear() === anoAtual;
    });
    
    console.log('Viagens do ano:', viagensAno.length);
    
    // Conta viagens realizadas e pendentes
    const realizadas = viagensAno.filter(v => v.status === 'realizada').length;
    const pendentes = viagensAno.filter(v => v.status === 'agendada').length;
    
    // Atualiza cards
    const elRealizadas = document.getElementById('total-realizadas');
    const elPendentes = document.getElementById('total-pendentes');
    const elAnoAtual = document.getElementById('ano-atual');
    
    if (elRealizadas) elRealizadas.textContent = realizadas;
    if (elPendentes) elPendentes.textContent = pendentes;
    if (elAnoAtual) elAnoAtual.textContent = anoAtual;
    
    // Gera gráficos (com verificação se os elementos existem)
    const canvasMotoristas = document.getElementById('grafico-motoristas');
    const canvasDestinos = document.getElementById('grafico-destinos');
    
    if (canvasMotoristas) {
      gerarGraficoMotoristas(viagensAno);
    } else {
      console.warn('Canvas de motoristas não encontrado');
    }
    
    if (canvasDestinos) {
      gerarGraficoDestinos(viagensAno);
    } else {
      console.warn('Canvas de destinos não encontrado');
    }
    
    console.log('Relatórios carregados com sucesso!');
    
  } catch (error) {
    console.error('Erro ao atualizar relatórios:', error);
    notificar('Erro ao carregar relatórios: ' + error.message, 'erro');
  }
}

// Gráfico de Viagens por Motorista
function gerarGraficoMotoristas(viagens) {
  const canvas = document.getElementById('grafico-motoristas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Conta viagens por motorista
  const contagem = {};
  viagens.forEach(v => {
    if (v.nome_motorista) {
      contagem[v.nome_motorista] = (contagem[v.nome_motorista] || 0) + 1;
    }
  });
  
  // Prepara dados para o gráfico
  const labels = Object.keys(contagem);
  const dados = Object.values(contagem);
  
  // Destrói gráfico anterior se existir
  if (window.graficoMotoristas) {
    window.graficoMotoristas.destroy();
  }
  
  // Cria novo gráfico
  window.graficoMotoristas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Viagens',
        data: dados,
        backgroundColor: [
          '#28a745', '#007bff', '#dc3545', '#ffc107', 
          '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// Gráfico de Viagens por Destino
function gerarGraficoDestinos(viagens) {
  const canvas = document.getElementById('grafico-destinos');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Conta viagens por destino (cidade + local)
  const contagem = {};
  viagens.forEach(v => {
    const destino = `${v.cidade_destino || ''} - ${v.local_destino || ''}`.trim();
    if (destino && destino !== '-') {
      contagem[destino] = (contagem[destino] || 0) + 1;
    }
  });
  
  // Prepara dados
  const labels = Object.keys(contagem);
  const dados = Object.values(contagem);
  
  // Destrói gráfico anterior
  if (window.graficoDestinos) {
    window.graficoDestinos.destroy();
  }
  
  // Cria gráfico de pizza
  window.graficoDestinos = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dados,
        backgroundColor: [
          '#28a745', '#007bff', '#dc3545', '#ffc107', 
          '#17a2b8', '#6f42c1', '#fd7e14', '#20c997',
          '#e83e8c', '#6610f2', '#20c997', '#fd7e14'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: {
              size: 11
            }
          }
        }
      }
    }
  });
}

// ====================================================================================
// INICIALIZAÇÃO
// ====================================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('App carregado!');
  
  // Pega a data de hoje no formato "AAAA-MM-DD"
  const hoje = new Date().toISOString().split('T')[0];

  // Pega o campo de data e coloca a data de hoje nele
  const campoData = document.getElementById('data-selecionada');
  if (campoData) {
    campoData.value = hoje;
    console.log('Data selecionada:', hoje);
  }

  // Atualiza o texto grande com a data de hoje
  atualizarTextoData(hoje);

  // Carregar as viagens do dia, e também as férias
  carregarViagensDia();

  // Quando o usuário trocar a data no campo...
  if (campoData) {
    campoData.addEventListener('change', (e) => {
      atualizarTextoData(e.target.value);
      carregarViagensDia();
    });
  }

  // Liga o envio do formulário de viagem à função salvarViagem
  const formViagem = document.getElementById('formViagem');
  if (formViagem) formViagem.addEventListener('submit', salvarViagem);

  // Liga o envio do formulário de férias à função salvarFerias
  const formFerias = document.getElementById('formFerias');
  if (formFerias) formFerias.addEventListener('submit', salvarFerias);

  // Quando o calendário (outra janela) escolher uma data, o Electron nos avisa
  if (window.electronAPI && window.electronAPI.onDataSelecionada) {
    window.electronAPI.onDataSelecionada((data) => {
      if (campoData) campoData.value = data;
      atualizarTextoData(data);
      carregarViagensDia();
    });
  }

  // Fechar o Modal de alerta ao clicar fora
  const modalAlerta = document.getElementById('modalAlerta');
  if (modalAlerta) {
    modalAlerta.addEventListener('click', (event) => {
      if (event.target === modalAlerta) fecharModalAlerta();
    });
  }

  // Define o ano atual nos relatórios
  const elAnoAtual = document.getElementById('ano-atual');
  if (elAnoAtual) {
    elAnoAtual.textContent = new Date().getFullYear();
  }

  const campoTel1 = document.getElementById('telefone1');
  const campoTel2 = document.getElementById('telefone2');

  if (campoTel1) {
    IMask(campoTel1, {
      mask: '(00) 00000-0000'
    });
  }

  if (campoTel2) {
    IMask(campoTel2, {
      mask: '(00) 00000-0000'
    });
  }
});