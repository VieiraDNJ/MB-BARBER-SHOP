// Configuração da API
const API_BASE_URL = 'http://localhost:3000';

// Lista global de horários disponíveis
const listaTotal = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

// Função para carregar barbeiros no select
async function carregarBarbeiros() {
    try {
        const res = await fetch(`${API_BASE_URL}/barbeiros`);
        const data = await res.json();
        const select = document.getElementById('bloqueioBarbeiro');
        if (select) {
            select.innerHTML = '<option value="">Selecione um barbeiro</option>';
            
            // FILTRO ADICIONADO: Pula se o nome for Administrador
            data.forEach(b => { 
                if (b.nome !== 'Administrador') { 
                    select.innerHTML += `<option value="${b.id}">${b.nome}</option>`; 
                }
            });
        }
    } catch (err) {
        console.error("Erro ao carregar barbeiros:", err);
    }
}

// Função para listar os bloqueios existentes
async function carregarBloqueios() {
    try {
        const res = await fetch(`${API_BASE_URL}/bloqueios`);
        const data = await res.json();
        const tbody = document.getElementById('tabelaBloqueios');
        if (tbody) {
            tbody.innerHTML = '';
            data.forEach(b => {
                tbody.innerHTML += `<tr>
                    <td>${b.nome_barbeiro}</td>
                    <td>${b.data}</td>
                    <td>${b.horario}</td>
                    <td><button class="btn btn-sm btn-outline-success" onclick="liberarBloqueio(${b.id})"><i class="bi bi-check-circle"></i> Liberar</button></td>
                </tr>`;
            });
        }
    } catch (err) {
        console.error("Erro ao carregar bloqueios:", err);
    }
}

// Função para verificar se há agendamentos antes de bloquear
async function verificarAgendamentos(barbeiro_id, data) {
    try {
        const res = await fetch(`${API_BASE_URL}/agendamentos?barbeiro_id=${barbeiro_id}&data=${data}`);
        const agendamentos = await res.json();
        
        if (agendamentos.length > 0) {
            let msg = `⚠️ Atenção: Este barbeiro possui ${agendamentos.length} agendamento(s) para este dia:\n\n`;
            agendamentos.forEach(a => {
                msg += `- ${a.horario} | Cliente: ${a.cliente_nome}\n`;
            });
            msg += "\nVocê deseja continuar e bloquear mesmo assim?";
            return confirm(msg); // Retorna true se o admin clicar em "OK"
        }
        return true; // Nenhum agendamento, pode bloquear
    } catch (err) {
        console.error("Erro ao verificar agenda:", err);
        return true; // Em caso de erro, permite seguir para não travar o admin
    }
}

// Função para liberar (deletar) um bloqueio
async function liberarBloqueio(id) {
    if (!confirm("Deseja liberar este horário?")) return;
    try {
        await fetch(`${API_BASE_URL}/bloqueios/${id}`, { method: 'DELETE' });
        carregarBloqueios();
    } catch (err) {
        console.error("Erro ao liberar bloqueio:", err);
    }
}

// Lógica de envio do formulário
const formBloqueio = document.getElementById('formBloqueio');
if (formBloqueio) {
    formBloqueio.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userString = localStorage.getItem('user');
        const usuario = userString ? JSON.parse(userString) : null;
        const adminId = usuario?.id || localStorage.getItem('usuarioId') || localStorage.getItem('id');
        const adminNome = usuario?.nome || localStorage.getItem('nomeUsuario') || localStorage.getItem('nome');
        const cargo = usuario?.cargo || localStorage.getItem('cargo');

        if (!adminId) {
            alert("Erro: Administrador não identificado. Faça login novamente.");
            return;
        }

        const barbeiro_id = document.getElementById('bloqueioBarbeiro').value;
        const data = document.getElementById('bloqueioData').value;
        const inicio = document.getElementById('horarioInicio').value;
        const fim = document.getElementById('horarioFim').value;

        // VALIDAÇÃO DE DATA: Impede datas passadas
        const hoje = new Date().toISOString().split('T')[0];
        if (data < hoje) {
            alert("❌ Erro: Não é permitido bloquear datas passadas.");
            return;
        }

        // VERIFICAÇÃO DE AGENDAMENTOS EXISTENTES
        const podeProsseguir = await verificarAgendamentos(barbeiro_id, data);
        if (!podeProsseguir) return; 

        if (!barbeiro_id || !data || !inicio || !fim) {
            alert("Por favor, preencha todos os campos.");
            return;
        }

        const idxInicio = listaTotal.indexOf(inicio);
        const idxFim = listaTotal.indexOf(fim);
        
        if (idxInicio === -1 || idxFim === -1 || idxInicio > idxFim) {
            alert("Intervalo de horário selecionado é inválido.");
            return;
        }

        const horarios = listaTotal.slice(idxInicio, idxFim + 1);

        for (const h of horarios) {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/bloquear`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        barbeiro_id: Number(barbeiro_id), 
                        data: data, 
                        horario: h, 
                        adminId: Number(adminId), 
                        adminNome: adminNome,
                        cargo: cargo
                    })
                });

                if (response.status === 403) {
                    alert(`Acesso negado ao bloquear o horário ${h}.`);
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Erro desconhecido");
                }
            } catch (err) {
                console.error("Erro no envio:", err);
                alert(`Falha ao bloquear horário ${h}: ${err.message}`);
                return;
            }
        }

        alert("Bloqueios realizados com sucesso!");
        formBloqueio.reset();
        carregarBloqueios();
    });
}
// 1. Carregar lista de Barbeiros Ativos no Select
async function carregarSelectBarbeiros() {
    try {
        const res = await fetch('http://localhost:3000/barbeiros/ativos');
        const barbeiros = await res.json();
        
        const select = document.getElementById('bloqueioBarbeiro'); // ID correto do seu HTML
        
        // Limpa e adiciona a opção padrão
        select.innerHTML = '<option value="">Selecione o barbeiro</option>';
        
        barbeiros.forEach(b => {
            select.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
        });
    } catch (err) {
        console.error("Erro ao carregar barbeiros:", err);
    }
}

// 2. Chamar ao carregar a página
document.addEventListener('DOMContentLoaded', carregarSelectBarbeiros);

// Inicialização e trava visual do calendário
const inputData = document.getElementById('bloqueioData');
if (inputData) {
    const hoje = new Date().toISOString().split('T')[0];
    inputData.setAttribute('min', hoje);
}

carregarBarbeiros();
carregarBloqueios();