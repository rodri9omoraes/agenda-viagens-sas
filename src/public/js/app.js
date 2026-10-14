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

// Mostra uma mensagem rápida no canto da tela
// Tipo pode ser 'Sucesso', 'Erro' ou 'Aviso'
function notificar(mensagem, tipo ='sucesso'){
  // Cores diferentes para cada tipo de mensagem
  const cores = { sucesso: '#28a745', erro: '#dc3545', aviso: '#fd7e14' };
  // Cria um elemento <div> novo (solto, fora da página)
  const aviso = document.createElement('div');
  // Define o texto que vai aparecer dentro do aviso
  aviso.textContent = mensagem;
  // Define o estilo: posição fixa no canto superior direito, cor, tamanho...
  aviso.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    padding: 12px 18px; border-radius: 8px; color: #fff;
    font-size: 15px; font-weight: bold; max-width: 340px;
    box-shadow: ${cores[tipo] || cores.sucesso};
  `;
  // Coloca o aviso dentro da página
  document.body.appendChild(aviso);
  // Remove o aviso depois de 3s (3000 ms)
  setTimeout(() => { aviso.remove(); }, 3000);
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
        <p style="margin: 0 0 18px; font-size: 16px;></p>
        <button class="btn btn-danger" data-resposta="sim">Sim</button>
        <button class="btn btn-secondary" data-resposta="nao"><Não</button>
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

// Buscar as viagens da data escolhida e apresenta-la na tela

async function carregarViagensDia() {
  // Pega a data selecionada
  const data = pegarDataSelecionada;
  // Pega a área da tela onde a lista é inserida
  const listaViagens = document.getElementById('lista-viagens');

  // Garante que as férias estejam carreagadas antes de desenhar os avisos
  await carregarFerias();

  // Se não há data, pede para o usuário selecionar uma  
  if (!data) {
    listaViagens.innerHTML = `<div class="empty-state"><div class="icone">📋</div><p>Selecione uma data</p></div>`;
    return;
  }
  
  try {
    // Chama no servidor as viagens daquela data
    const response = await fetch(`${API_URL}/viagens/data/${data}`);
    // Se o servidor respondeu com erro, lança o erro e vai para o catch
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    //Converte a resposta de texto JSON para uma lista de viagens
    const viagens = await response.json();
    
    // Se a lista veio vazia, mostra "nenhuma viagem"
    if (viagens.length === 0) {
      listaViagens.innerHTML = `
        <div class="empty-state">
          <div class="icone">📭</div>
          <p>Nenhuma viagem agendada para ${formatarDataBrasil(data)}</p>
        </div>`;
      return;
    }

    // Para cada viagem, monta um card
    const html = viagens.map((viagem) => {
      // Inicia sem nenhum aviso
      let avisoFerias = '';
      // Se a viagem tem motorista e ele está de férias nessa data, cria o aviso
      if (viagem.nome_motorista && motoristaEstaDeFerias(viagem.nome_motorista, data)){
        avisoFerias = `
        <div style="background:#fff3cd; color:#856404; padding:8px; border-radius:6px; margin-top:10px; font-size:14px; font-weight:bold;">
            ⚠️ ATENÇÃO: ${viagem.nome_motorista} está de FÉRIAS neste período!
        </div>`;
      }
      // Devolve o card pronto, com os botões de editar/cancelar
      return montarCardViagem(viagem, { comAcoes: true, avisoFerias });
    }).join(''); //join(') junta todos os cartões em um único texto

    //Coloca todos os cartões na tela de uma vez
    listaViagens.innerHTML = html;
    
  } catch (error) {
    // Registra o erro no console
    console.error('Erro ao carregar viagens:', error);
    // Mostra o erro na tela
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
      notificar('✅ ' + result.message, 'sucesso');
      // Recarrega a lista de viagens do dia
      carregarViagensDia();
      // Avisa o calendário para se atualizar
      atualizarCalendarioSeAberto();

    } else {
      // Se o servidor recusou, mostra o motivo
      notificar('❌ Erro: ' + (result.error || result.message), 'erro');
    }

  } catch (error) {
    // Se nem chegou no servidor
    notificar('❌ Erro de conexão.', 'erro');
  }
}

// Chamar para "Editar" de cada cartão: abre o Modal já preenchido
async function editarViagem(id) {
  // Reaproveita a função de abrir o modal, passando o id da viagem
  abrirModal(id);
}

// Chamada pelo botão "Cancelar" da cada cartão
async function cancelarViagem(id) {
  // Confirma se realmente deseja cancelar/excluir a viagem
  const confirmou = await confirmar('Deseja realmente cancelar esta viagem?');
  // Se responder "Não", não faz nada
  if (!confirmou) return;
  
  try {
    // Pede ao servidor para cancelar (DELETE) a viagem
    const response = await fetch(`${API_URL}/viagens/${id}`, { method: 'DELETE' });
    
    // Verifica o tipo da resposta (JSON ou Texto Simples)
    const contentType = response.headers.get("content-type");
    // Variável que vai guardar o resultado já convertido
    let result;
    // Se veio como JSON, lê como JSON
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      // Senão, lê como texto e guarda dentro de um objeto como "message"
      const text = await response.text();
      result = { message: text };
    }

    //Se deu certo
    if (response.ok) {
      notificar('✅ ' + result.message, 'sucesso');
    } else {
      // Registra o problema no console e avisa o usuário
      console.warn('Servidor retornou erro, mas pode ter deletado:', result);
      notificar('⚠️ Viagem removida da lista, mas houve um erro ao salvar no disco. Reinicie o app se necessário.');
    }
    // Nos dois casos, recarrega a lista para mostrar o estado atual
    carregarViagensDia();
    // Atualiza o calendario
    atualizarCalendarioSeAberto();

  } catch (error) {
    // Registra o erro de rede no console 
    console.error('Erro de rede:', error);
    // Avisa o usuário
    notificar('❌ Erro de conexão com o servidor.', 'erro');
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
  } else {
    // Senão, estamos CRIANDO
    tituloModal.textContent = '➕ Cadastrar Nova Viagem';
    grupoMotorista.style.display = 'none';    // Esconde o campo motorista
    grupoStatus.style.display = 'none';     // Esconde o campo status
    document.getElementById('viagem-id').value = '';    //Garante que o ID esteja vazio
    
    // Usa a data que está selecionada na tela como data da nova viagem
    const dataSelecionada = pegarDataSelecionada();

    if (dataSelecionada) {
      // Preenche a data no formulário
      document.getElementById('data_viagem').value = dataSelecionada;

      //Verificar se há motoristas de férias nessa data
      const motoristasDeFerias = listarMotoristasDeFerias(dataSelecionada);

      // Se houver, mostra o alerta personalizado
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
      notificar('✅ ' + result.message, 'sucesso');
      await carregarViagensDia();   // Recarrega (isso também recarrega as férias)
      atualizarCalendarioSeAberto();
      
    } else {
      // Se o servidor recusou, mostra o motivo
      notificar('❌ Erro ao salvar: ' + (result.error || 'Verifique os dados'), 'erro');
    }
  } catch (error) {
    // Erro de Rede
    console.error('Erro de rede:', error);
    notificar('❌ Erro de conexão ao salvar férias.', 'erro');
  }
}

// Exclui um registro de Férias
async function excluirFerias(id) {
  // Pergunta se tem certeza 
  const confirmou = await confirmar('Remover este registro de férias?');
  // Se responder "Não", para aqui
  if (!confirm) return;

  try {
    // Pede ao servidor para apagar
    const response = await fetch(`${API_URL}/ferias/${id}`, { method: 'DELETE' });
    // Se apagou, atualiza as telas
    if (response.ok) {
      await carregarViagensDia();
      atualizarCalendarioSeAberto();
    }
  } catch (error) {
    notificar('❌ Erro ao excluir.', 'erro');
  }
}


//*****************************Linha 519******************************************* Parei aqui */

// ====================================================================================
// INICIALIZAÇÃO

document.addEventListener('DOMContentLoaded', () => {
  console.log('App carregado!');
  
  const hoje = new Date().toISOString().split('T')[0];
  const campoData = document.getElementById('data-selecionada');
  const textoData = document.getElementById('data-atual');
  
  if (campoData) campoData.value = hoje;
  if (textoData) textoData.textContent = formatarDataBrasil(hoje);
  
  carregarFerias();

  carregarViagensDia();

  if (campoData) {
    campoData.addEventListener('change', (e) => {
      if (textoData) textoData.textContent = formatarDataBrasil(e.target.value);
      carregarViagensDia();
    });
  }

  const form = document.getElementById('formViagem');
  if (form) form.addEventListener('submit', salvarViagem);

  if (window.electronAPI && window.electronAPI.onDataSelecionada) {
    window.electronAPI.onDataSelecionada((data) => {
      if (campoData) campoData.value = data;
      if (textoData) textoData.textContent = formatarDataBrasil(data);
      carregarViagensDia();
    });
  }
});

// ================================================================
// MODAL
/*
function fecharModal() {
  document.getElementById('modalViagem').style.display = 'none';
}*/

//FUNÇAO DE "HARD RESET" - BOtão Atualizar
async function hardReset() {
  console.log('🔄 Executando hard reset...');

  const listaViagens = document.getElementById('lista-viagens');
  const form = document.getElementById('formViagem');
  const modal = document.getElementById('modalViagem');

  //Fechar modal se estiver aberto
  if (modal) {
    modal.style.display = 'none';
  }

  if (form) {
    form.reset();
    const campos = form.querySelectorAll('input, textarea, select');
    campos .forEach(campo => {
      campo.disabled = false;
      campo.readOnly = false;
      campo.removeAttribute('disabled');
      campo.removeAttribute('readonly');
      campo.style.pointerEvents = 'auto';
    });
  }

  //Mostra o estado do carregamento
  listaViagens.innerHTML = '<div class="empty-state"><div class="icone">🔄</div><p>Atualizando lista...</p></div>';

  // Aguardar
  await new Promise(resolve => setTimeout(resolve, 200));

  //Recarregar viagens
  await carregarViagensDia();  
}

// ================================================================
// GERAR IMAGEM

async function gerarImagemDia() {
  const data = document.getElementById('data-selecionada').value;
  
  try {
    const response = await fetch(`${API_URL}/viagens/data/${data}`);
    const viagens = await response.json();
    
    if (viagens.length === 0) {
      alert('Não há viagens agendadas para este dia!');
      return;
    }

    document.getElementById('data-imagem').textContent = formatarDataBrasil(data);
    
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

    await new Promise(resolve => setTimeout(resolve, 300));

    if (typeof html2canvas === 'undefined') {
      alert('❌ Biblioteca html2canvas não carregada.');
      return;
    }

    const elemento = document.getElementById('area-imagem-caderno');
    if (!elemento) {
      alert('❌ Elemento de imagem não encontrado.');
      return;
    }

    const canvas = await html2canvas(elemento, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });
    
    const imagem = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `viagens-${data.replace(/-/g, '')}.png`;
    link.href = imagem;
    link.click();
    
    alert('✅ Imagem gerada com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar imagem:', error);
    alert('❌ Erro ao gerar imagem: ' + error.message);
  }
}


// ================================================================
// GERENCIAMENTO DE FÉRIAS



// Função para avisar se o motorista da viagem está de férias
async function verificarFeriasMotorista(nomeMotorista, dataViagem) {
  if (!nomeMotorista) return false;
  const emFerias = cacheFerias.some(f => 
    f.nome_motorista.toLowerCase() === nomeMotorista.toLowerCase() &&
    dataViagem >= f.data_inicio && dataViagem <= f.data_fim
  );
  return emFerias;
}

// Atualiza a função carregarViagensDia para incluir o aviso
async function carregarViagensDia() {
  const data = document.getElementById('data-selecionada').value;
  const listaViagens = document.getElementById('lista-viagens');
  
  await carregarFerias(); // Garante que temos as férias em memória

  if (!data) {
    listaViagens.innerHTML = `<div class="empty-state"><div class="icone">📋</div><p>Selecione uma data</p></div>`;
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/viagens/data/${data}`);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const viagens = await response.json();
    
    if (viagens.length === 0) {
      listaViagens.innerHTML = `<div class="empty-state"><div class="icone">📭</div><p>Nenhuma viagem agendada para ${formatarDataBrasil(data)}</p></div>`;
      return;
    }

    // Monta o HTML verificando férias
    const htmlViagens = await Promise.all(viagens.map(async (viagem) => {
      let avisoFerias = '';
      if (viagem.nome_motorista) {
        const estaDeFerias = await verificarFeriasMotorista(viagem.nome_motorista, data);
        if (estaDeFerias) {
          avisoFerias = `<div style="background: #fff3cd; color: #856404; padding: 8px; border-radius: 6px; margin-top: 10px; font-size: 14px; font-weight: bold;">
            ⚠️ ATENÇÃO: ${viagem.nome_motorista} está de FÉRIAS neste período!
          </div>`;
        }
      }

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
        ${avisoFerias} <!-- AVISO DE FÉRIAS AQUI -->
        <div class="viagem-acoes">
          <button class="btn btn-secondary" onclick="editarViagem(${viagem.id})">✏️ Editar</button>
          ${viagem.status !== 'cancelada' ? `<button class="btn btn-danger" onclick="cancelarViagem(${viagem.id})">❌ Cancelar</button>` : ''}
        </div>
      </div>`;
    }));

    listaViagens.innerHTML = htmlViagens.join('');
    
  } catch (error) {
    console.error('Erro ao carregar viagens:', error);
    listaViagens.innerHTML = `<div class="empty-state" style="color: red;"><p>Erro ao carregar: ${error.message}</p></div>`;
  }
}

//Listar TODOS os Motoristas de férias
function listarMotoristasDeFerias(data) {
  if (!data || cacheFerias.length === 0) return [];

  const dataSelecionada = new Date(data + 'T00:00:00'); // Converter para data real

  const motoristasDeFerias = cacheFerias
  .filter(f => {
    const inicio = new Date(f.data_inicio + 'T00:00:00');
    const fim = new Date(f.data_fim + 'T00:00:00');
    return dataSelecionada >= inicio && dataSelecionada <= fim;
  })
  .map(f => ({
    nome: f.nome_motorista,
    dataFim: f.data_fim
  }));
  
  //Remove duplicatas
  const nomesUnicos = new Set();
  return motoristasDeFerias.filter(m => {
    if (nomesUnicos.has(m.nome)) return false;
    nomesUnicos.add(m.nome);
    return true;
  });
}

/* =========================================================================== */
// Modal de alerta personalizado

function mostrarAlertaMotoristasFerias(motoristasDeFerias, dataFormatada) {
  const modal = document.getElementById('modalAlerta');
  const titulo = document.getElementById('alerta-titulo');
  const mensagem = document.getElementById('alerta-mensagem');
  
  if (motoristasDeFerias.length === 1) {
    const m = motoristasDeFerias[0];
    titulo.textContent = m.nome;
    mensagem.textContent = `Está de Férias/Folga até ${formatarDataBrasil(m.dataFim)}`;
  } else {
    titulo.textContent = 'Motoristas de Férias';
    let msgHTML = `<strong>Data:</strong> ${dataFormatada}<br><br>`;
    motoristasDeFerias.forEach((m, index) => {
      msgHTML += `${index + 1}. <strong>${m.nome}</strong> - até ${formatarDataBrasil(m.dataFim)}<br>`;
    });
    mensagem.innerHTML = msgHTML;
  }
  
  modal.style.display = 'block';
}

function fecharModalAlerta() {
  document.getElementById('modalAlerta').style.display = 'none';
}

// Fechar ao clicar fora
window.onclick = function(event) {
  const modal = document.getElementById('modalAlerta');
  if (event.target === modal) {
    fecharModalAlerta();
  }
}