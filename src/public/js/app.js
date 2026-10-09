const API_URL = 'http://localhost:3001/api';

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('App carregado!');
  
  const hoje = new Date().toISOString().split('T')[0];
  const campoData = document.getElementById('data-selecionada');
  const textoData = document.getElementById('data-atual');
  
  if (campoData) campoData.value = hoje;
  if (textoData) textoData.textContent = formatarDataBrasil(hoje);
  
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

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function formatarDataBrasil(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dataObj = new Date(ano, mes - 1, dia);
  return `${diasSemana[dataObj.getDay()]}, ${dia} de ${meses[parseInt(mes) - 1]} de ${ano}`;
}

function formatarHora(hora) {
  if (!hora) return '--:--';
  return hora;
}

// ============================================
// CARREGAR VIAGENS DO DIA
// ============================================
async function carregarViagensDia() {
  const data = document.getElementById('data-selecionada').value;
  const listaViagens = document.getElementById('lista-viagens');
  
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

    listaViagens.innerHTML = viagens.map(viagem => `
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
        <div class="viagem-acoes">
          <button class="btn btn-secondary" onclick="editarViagem(${viagem.id})">✏️ Editar</button>
          ${viagem.status !== 'cancelada' ? `<button class="btn btn-danger" onclick="cancelarViagem(${viagem.id})">❌ Cancelar</button>` : ''}
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Erro ao carregar viagens:', error);
    listaViagens.innerHTML = `<div class="empty-state" style="color: red;"><p>Erro ao carregar: ${error.message}</p></div>`;
  }
}

// ============================================
// MODAL
// ============================================
function abrirModal(idViagem = null) {
  const modal = document.getElementById('modalViagem');
  const form = document.getElementById('formViagem');
  
  // 1. Resetar o formulário
  form.reset();
  
  // 2. Garantir que todos os campos estejam habilitados
  const campos = form.querySelectorAll('input, textarea, select');
  campos.forEach(campo => {
    campo.disabled = false;
    campo.readOnly = false;
    campo.removeAttribute('disabled');
    campo.removeAttribute('readonly');
  });

  const tituloModal = document.getElementById('titulo-modal');
  const grupoMotorista = document.getElementById('grupo-motorista');
  const grupoStatus = document.getElementById('grupo-status');

  if (idViagem) {
    tituloModal.textContent = '✏️ Editar Viagem';
    grupoMotorista.style.display = 'block';
    grupoStatus.style.display = 'block';
    buscarViagem(idViagem);
  } else {
    tituloModal.textContent = '➕ Cadastrar Nova Viagem';
    grupoMotorista.style.display = 'none';
    grupoStatus.style.display = 'none';
    
    const dataSelecionada = document.getElementById('data-selecionada');
    if (dataSelecionada && dataSelecionada.value) {
      document.getElementById('data_viagem').value = dataSelecionada.value;
    }
    document.getElementById('viagem-id').value = '';
  }

  // 3. Mostrar o modal
  modal.style.display = 'block';

  // 4. 🔥 TRUQUE DO FOCO NO ELECTRON 🔥
  // Simula o "acordar" da janela que acontece quando o calendário é fechado
  setTimeout(() => {
    const primeiroCampo = document.getElementById('data_viagem');
    if (primeiroCampo) {
      // A sequência abaixo é mágica para destravar inputs no Electron
      primeiroCampo.blur();       // 1. Tira qualquer foco "fantasma"
      document.body.focus();      // 2. Foca no corpo da página (reseta o estado)
      primeiroCampo.focus();      // 3. Foca no campo desejado
      primeiroCampo.click();      // 4. Simula um clique para garantir o cursor
    }
  }, 150); // 150ms é o tempo ideal para o Electron processar a exibição do modal
}

function fecharModal() {
  document.getElementById('modalViagem').style.display = 'none';
}

async function buscarViagem(id) {
  try {
    const response = await fetch(`${API_URL}/viagens/${id}`);
    const viagem = await response.json();
    
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
    alert('Erro ao carregar dados da viagem');
  }
}

async function salvarViagem(e) {
  e.preventDefault();
  
  const id = document.getElementById('viagem-id').value;
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
    status: document.getElementById('status').value || 'agendada'
  };
  
  try {
    const url = id ? `${API_URL}/viagens/${id}` : `${API_URL}/viagens`;
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('✅ ' + result.message);
      fecharModal();
      carregarViagensDia();
    } else {
      alert('❌ Erro: ' + (result.error || result.message));
    }
  } catch (error) {
    alert('❌ Erro de conexão.');
  }
}

async function editarViagem(id) {
  abrirModal(id);
}

async function cancelarViagem(id) {
  if (!confirm('Deseja realmente cancelar esta viagem?')) return;
  
  try {
    const response = await fetch(`${API_URL}/viagens/${id}`, { method: 'DELETE' });
    
    // Tenta ler como JSON, se falhar lê como texto
    const contentType = response.headers.get("content-type");
    let result;
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { message: text };
    }

    if (response.ok) {
      alert('✅ ' + result.message);
      carregarViagensDia(); // Apenas recarrega a lista, sem resetar tudo
    } else {
      // Se o servidor retornou erro (ex: 500), mas a viagem foi deletada da memória
      console.warn('Servidor retornou erro, mas pode ter deletado:', result);
      alert('⚠️ Viagem removida da lista, mas houve um erro ao salvar no disco. Reinicie o app se necessário.');
      carregarViagensDia();
    }
  } catch (error) {
    console.error('Erro de rede:', error);
    alert('❌ Erro de conexão com o servidor.');
  }
}

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

// ============================================
// GERAR IMAGEM
// ============================================
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

// ============================================
// CONTROLE DO MODAL (CORRIGIDO PARA O BUG DE FOCO)
// ============================================

function fecharModalSeForFundo(event) {
  // Só fecha se clicar exatamente no fundo escuro (fora da caixa branca)
  if (event.target.id === 'modalViagem') {
    fecharModal();
  }
}

function fecharModal() {
  const modal = document.getElementById('modalViagem');
  // Hack visual para garantir que o overlay pare de interceptar cliques no Electron
  modal.style.display = 'none';
  modal.style.visibility = 'hidden';
  
  setTimeout(() => {
    modal.style.visibility = 'visible';
  }, 10);
}

function abrirModal(idViagem = null) {
  const modal = document.getElementById('modalViagem');
  const form = document.getElementById('formViagem');
  
  form.reset();
  
  const campos = form.querySelectorAll('input, textarea, select');
  campos.forEach(campo => {
    campo.disabled = false;
    campo.readOnly = false;
    campo.removeAttribute('disabled');
    campo.removeAttribute('readonly');
  });

  const tituloModal = document.getElementById('titulo-modal');
  const grupoMotorista = document.getElementById('grupo-motorista');
  const grupoStatus = document.getElementById('grupo-status');

  if (idViagem) {
    tituloModal.textContent = '✏️ Editar Viagem';
    grupoMotorista.style.display = 'block';
    grupoStatus.style.display = 'block';
    buscarViagem(idViagem);
  } else {
    tituloModal.textContent = '➕ Cadastrar Nova Viagem';
    grupoMotorista.style.display = 'none';
    grupoStatus.style.display = 'none';
    
    const dataSelecionada = document.getElementById('data-selecionada');
    if (dataSelecionada && dataSelecionada.value) {
      document.getElementById('data_viagem').value = dataSelecionada.value;
    }
    document.getElementById('viagem-id').value = '';
  }

  // 1. Mostrar o modal
  modal.style.display = 'block';

  // 2. 🔥 TRUQUE DO FOCO NO ELECTRON 🔥
  // Chama o processo principal para "acordar" a janela (simula abrir/fechar calendário)
  if (window.electronAPI && window.electronAPI.forcarFoco) {
    window.electronAPI.forcarFoco();
  }

  // 3. Focar no primeiro campo
  setTimeout(() => {
    const primeiroCampo = document.getElementById('data_viagem');
    if (primeiroCampo) {
      primeiroCampo.focus();
    }
  }, 150);
}


// ============================================
// GERENCIAMENTO DE FÉRIAS
// ============================================
let cacheFerias = [];

async function carregarFerias() {
  try {
    const response = await fetch(`${API_URL}/ferias`);
    cacheFerias = await response.json();
    renderizarListaFerias();
  } catch (error) {
    console.error('Erro ao carregar férias:', error);
  }
}

function renderizarListaFerias() {
  const lista = document.getElementById('lista-ferias');
  if (!lista) return; // Segurança caso o modal não exista

  if (cacheFerias.length === 0) {
    lista.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 10px;">Nenhum registro de férias.</p>';
    return;
  }

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

function abrirModalFerias() {
  const form = document.getElementById('formFerias');
  if (form) form.reset();
  const modal = document.getElementById('modalFerias');
  if (modal) modal.style.display = 'block';
  carregarFerias();
}

function fecharModalFerias() {
  const modal = document.getElementById('modalFerias');
  if (modal) modal.style.display = 'none';
}

// Evento de Submit do Formulário de Férias
const formFerias = document.getElementById('formFerias');
if (formFerias) {
  formFerias.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Pega os valores EXATOS dos IDs do HTML
    const data = {
      nome_motorista: document.getElementById('nome_motorista_ferias').value.trim(),
      data_inicio: document.getElementById('data_inicio_ferias').value,
      data_fim: document.getElementById('data_fim_ferias').value,
      observacoes: document.getElementById('obs_ferias').value.trim()
    };

    console.log('📤 Enviando para API:', data);

    try {
      const response = await fetch(`${API_URL}/ferias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      console.log('📥 Resposta da API:', result);

      if (response.ok) {
        alert('✅ ' + result.message);
        fecharModalFerias();
        carregarFerias();
        formFerias.reset();
        
        // Avisa o calendário para atualizar
        if (window.electronAPI && window.electronAPI.atualizarCalendario) {
          window.electronAPI.atualizarCalendario();
        }
      } else {
        alert('❌ Erro ao salvar: ' + (result.error || 'Verifique os dados'));
      }
    } catch (error) {
      console.error('Erro de rede:', error);
      alert('❌ Erro de conexão ao salvar férias.');
    }
  });
}

async function excluirFerias(id) {
  if (!confirm('Remover este registro de férias?')) return;
  try {
    const response = await fetch(`${API_URL}/ferias/${id}`, { method: 'DELETE' });
    if (response.ok) {
      carregarFerias();
      if (window.electronAPI && window.electronAPI.atualizarCalendario) {
        window.electronAPI.atualizarCalendario();
      }
    }
  } catch (error) {
    alert('❌ Erro ao excluir.');
  }
}

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
// (SUBSTITUA a função carregarViagensDia antiga por esta nova versão):
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

// Função auxiliar para avisar o calendário para recarregar
function atualizarCalendarioSeAberto() {
  if (window.electronAPI && window.electronAPI.atualizarCalendario) {
    window.electronAPI.atualizarCalendario();
  }
}