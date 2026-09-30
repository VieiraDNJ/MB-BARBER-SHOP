const API_BASE_URL = `http://${window.location.hostname}:3000`;

/* ________________________ CARREGAR SERVIÇOS DO BANCO ______________________________ */
async function carregarServicos() {
    const selectCortes = document.getElementById('cortes');
    if (!selectCortes) return;

    try {
        const response = await fetch(`${API_BASE_URL}/servicos`);
        const servicos = await response.json();

        selectCortes.innerHTML = '<option value="" disabled selected>Escolha seu corte...</option>';
        
        servicos.forEach(s => {
            const option = document.createElement('option');
            option.value = s.nome; 
            option.dataset.preco = s.preco; 
            option.textContent = `${s.nome} - R$ ${parseFloat(s.preco).toFixed(2)}`;
            selectCortes.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
    }
}

/* ________________________ CARREGAR BARBEIROS DO BANCO ______________________________ */
async function carregarBarbeiros() {
    const selectBarbeiro = document.getElementById('barbeiro');
    if (!selectBarbeiro) return;

    try {
        const response = await fetch(`${API_BASE_URL}/barbeiros`);
        const barbeiros = await response.json();

        selectBarbeiro.innerHTML = '<option value="" disabled selected>Selecione um profissional</option>';
        
        // Adicione este filtro:
        barbeiros.forEach(b => {
            if (b.nome !== 'Administrador') { // Filtra pelo nome
                selectBarbeiro.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
            }
        });
    } catch (error) {
        console.error("Erro ao carregar barbeiros:", error);
    }
}

// --- CONFIGURAÇÃO INICIAL ---
window.addEventListener('DOMContentLoaded', async () => {
    const inputData = document.getElementById('data');
    if (inputData) {
        const hoje = new Date();
        inputData.setAttribute('min', hoje.toISOString().split('T')[0]);
    }
    
    await carregarServicos();
    await carregarBarbeiros();
});

/* ________________________ SUBMIT DO FORMULÁRIO ______________________________ */
const formAgendamento = document.getElementById('formulario');

if (formAgendamento) {
    formAgendamento.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validação de horário no ato do clique
        const dataSelecionada = document.getElementById('data').value;
        const horarioSelecionado = document.getElementById('horarios').value;
        const agora = new Date();
        const hojeISO = agora.toISOString().split('T')[0];

        if (dataSelecionada === hojeISO) {
            const [horaEscolha, minEscolha] = horarioSelecionado.split(':').map(Number);
            if (horaEscolha < agora.getHours() || (horaEscolha === agora.getHours() && minEscolha <= agora.getMinutes())) {
                alert("⚠️ Erro: Este horário já passou! Escolha um horário futuro.");
                return;
            }
        }

        // 2. Validação de Login
        const dadosUsuario = JSON.parse(localStorage.getItem('user'));
        if (!dadosUsuario) {
            alert("Você precisa estar logado!");
            window.location.href = 'login.html';
            return;
        }

        // 3. Montagem dos dados
        const selectCortes = document.getElementById('cortes');
        const opcaoSelecionada = selectCortes.options[selectCortes.selectedIndex];

        const dadosAgendamento = {
            cliente_id: dadosUsuario.id,
            data: dataSelecionada,
            horario: horarioSelecionado,
            servico: selectCortes.value,
            barbeiro_id: document.getElementById('barbeiro').value,
            valor_servico: opcaoSelecionada.dataset.preco 
        };

        // 4. Envio ao Banco
        try {
            const response = await fetch(`${API_BASE_URL}/agendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAgendamento)
            });

            if (response.ok) {
                alert("Agendamento realizado com sucesso!");
                window.location.href = '../HTML/index.html';
            } else {
                const erro = await response.json();
                alert("Erro: " + (erro.message || "Falha ao agendar"));
            }
        } catch (error) {
            alert("Erro ao conectar com o servidor.");
        }
    });
}

/* ________________________ LÓGICA DE HORÁRIOS DISPONÍVEIS ______________________________ */
async function atualizarHorariosDisponiveis() {
    const dataVal = document.getElementById('data').value;
    const barbeiroVal = document.getElementById('barbeiro').value;
    const selectHorarios = document.getElementById('horarios');

    // Se não tiver data ou barbeiro, bloqueia e limpa o select
    if (!dataVal || !barbeiroVal) {
        selectHorarios.disabled = true;
        return;
    }

    selectHorarios.disabled = false;

    try {
        const response = await fetch(`${API_BASE_URL}/horarios-ocupados?data=${dataVal}&barbeiro=${barbeiroVal}`);
        if (!response.ok) throw new Error("Erro ao buscar horários");
        
        const horariosOcupados = await response.json(); 

        const agora = new Date();
        const hojeISO = agora.toISOString().split('T')[0];
        const opcoes = selectHorarios.querySelectorAll('option');

        opcoes.forEach(opcao => {
            if (opcao.value === "") return;

            // 1. Reset: Garante que a opção comece limpa e habilitada antes de checar
            opcao.disabled = false;
            opcao.textContent = opcao.value; 

            // 2. Verifica se está ocupado: usa substring(0,5) para comparar "17:00" com "17:00:00"
            const ocupado = horariosOcupados.some(h => h.toString().substring(0, 5) === opcao.value);
            
            // 3. Verifica se o horário já passou (apenas para a data de hoje)
            const [hora, min] = opcao.value.split(':').map(Number);
            const passou = (dataVal === hojeISO && (hora < agora.getHours() || (hora === agora.getHours() && min <= agora.getMinutes())));

            // 4. Aplica o estado
            if (ocupado || passou) {
                opcao.disabled = true;
                opcao.textContent = `${opcao.value} ${ocupado ? '(Ocupado)' : '(Indisponível)'}`;
            }
        });
    } catch (error) {
        console.error("Erro ao verificar horários:", error);
    }
}

// Mantendo seus event listeners
document.getElementById('data').addEventListener('change', atualizarHorariosDisponiveis);
document.getElementById('barbeiro').addEventListener('change', atualizarHorariosDisponiveis);

// Dentro do seu agendamento.js
async function carregarBarbeiros() {
    try {
        const res = await fetch('http://localhost:3000/barbeiros/ativos');
        const barbeiros = await res.json();
        
        const select = document.getElementById('barbeiro');
        select.innerHTML = '<option value="" disabled selected>Escolha seu barbeiro...</option>';
        
        barbeiros.forEach(b => {
            select.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
        });
    } catch (err) {
        console.error("Erro ao carregar barbeiros:", err);
    }
}

// Chame a função quando a página carregar
document.addEventListener('DOMContentLoaded', carregarBarbeiros);