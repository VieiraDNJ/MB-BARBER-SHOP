const API_BASE_URL = `http://${window.location.hostname}:3000`;

let meuGrafico = null;
let todosAtendimentosBarbeiro = [];


// ======================================================
// CARREGAR DADOS DO BARBEIRO
// ======================================================

async function carregarDadosBarbeiro() {
    const usuario = JSON.parse(localStorage.getItem('user'));

    if (!usuario) {
        console.error("Usuário não encontrado no localStorage.");
        return;
    }

    const barbeiroId = usuario.id_barbeiro || usuario.barbeiro_id || usuario.id;

    if (!barbeiroId) {
        console.error("ID do barbeiro não encontrado.");
        alert("Não foi possível identificar o barbeiro logado.");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/agendamentos?barbeiro=${barbeiroId}`
        );

        if (!response.ok) {
            throw new Error("Erro ao buscar os atendimentos.");
        }

        todosAtendimentosBarbeiro = await response.json();

        console.log(
            "Atendimentos do barbeiro:",
            todosAtendimentosBarbeiro
        );

        carregarFiltroServicos();

        atualizarResumoBarbeiro(
            todosAtendimentosBarbeiro
        );

        renderizarGraficoBarbeiro(
            todosAtendimentosBarbeiro
        );

        renderizarTabelaAtendimentos(
            todosAtendimentosBarbeiro
        );

    } catch (error) {
        console.error(
            "Erro ao carregar dados do barbeiro:",
            error
        );
    }
}


// ======================================================
// RESUMO / CARDS
// ======================================================

function atualizarResumoBarbeiro(atendimentos) {
    let totalFaturamento = 0;
    let totalConcluidos = 0;
    let totalPendentes = 0;

    atendimentos.forEach(agendamento => {
        const status = agendamento.status
            ? agendamento.status.trim()
            : '';

        const valor = parseFloat(
            agendamento.valor_servico || 0
        );

        if (status === 'Concluído') {
            totalFaturamento += valor;
            totalConcluidos++;
        }

        if (status === 'Pendente') {
            totalPendentes++;
        }
    });

    document.getElementById('resumoCortes').innerText =
        totalConcluidos;

    document.getElementById('resumoFaturamento').innerText =
        `R$ ${totalFaturamento.toFixed(2).replace('.', ',')}`;

    document.getElementById('resumoPendentes').innerText =
        totalPendentes;
}


// ======================================================
// TABELA DE ATENDIMENTOS
// ======================================================

function renderizarTabelaAtendimentos(atendimentos) {
    const tabela = document.getElementById(
        'tabelaAgendamentos'
    );

    if (!tabela) {
        return;
    }

    tabela.innerHTML = '';

    if (atendimentos.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-secondary">
                    Nenhum atendimento encontrado.
                </td>
            </tr>
        `;

        return;
    }

    atendimentos.forEach(agendamento => {
        const status = agendamento.status
            ? agendamento.status.trim()
            : '';

        const valor = parseFloat(
            agendamento.valor_servico || 0
        );

        const dataFormatada = agendamento.data_agendamento
            ? new Date(
                agendamento.data_agendamento
            ).toLocaleDateString('pt-BR', {
                timeZone: 'UTC'
            })
            : '-';

        let acoesHTML = '';

        if (status === 'Pendente') {
            acoesHTML = `
                <select
                    onchange="alterarStatusBarbeiro(${agendamento.id}, this.value)"
                    class="form-select form-select-sm bg-dark text-white border-secondary">

                    <option value="">Alterar...</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Faltou">Faltou</option>
                    <option value="Cancelado">Cancelado</option>

                </select>
            `;
        } else {
            acoesHTML = `
                <span class="text-secondary small fw-bold">
                    Finalizado
                </span>
            `;
        }

        tabela.innerHTML += `
            <tr>
                <td>${dataFormatada}</td>
                <td>${agendamento.horario || '-'}</td>
                <td>${agendamento.nome_cliente || 'Cliente'}</td>
                <td>${agendamento.servico || '-'}</td>
                <td>R$ ${valor.toFixed(2).replace('.', ',')}</td>

                <td>
                    <span class="badge bg-${getStatusColorBarbeiro(status)}">
                        ${status}
                    </span>
                </td>

                <td class="text-center">
                    ${acoesHTML}
                </td>
            </tr>
        `;
    });
}


// ======================================================
// FILTRO DE SERVIÇOS
// ======================================================

function carregarFiltroServicos() {
    const select = document.getElementById(
        'filtroServico'
    );

    if (!select) {
        return;
    }

    const servicos = [
        ...new Set(
            todosAtendimentosBarbeiro
                .map(agendamento =>
                    (agendamento.servico || '').trim()
                )
                .filter(servico => servico)
        )
    ].sort();

    select.innerHTML = `
        <option value="todos">
            Todos os Serviços
        </option>
    `;

    servicos.forEach(servico => {
        const option = document.createElement('option');

        option.value = servico;
        option.textContent = servico;

        select.appendChild(option);
    });
}


// ======================================================
// FILTROS DOS ATENDIMENTOS
// ======================================================

function aplicarFiltrosBarbeiro() {
    const dataInicio =
        document.getElementById('dataInicio').value;

    const dataFim =
        document.getElementById('dataFim').value;

    const servico =
        document.getElementById('filtroServico').value;

    const status =
        document.getElementById('filtroStatus').value;

    const atendimentosFiltrados =
        todosAtendimentosBarbeiro.filter(agendamento => {

            const data = agendamento.data_agendamento
                ? new Date(
                    agendamento.data_agendamento
                ).toISOString().split('T')[0]
                : '';

            const atendeDataInicio =
                !dataInicio || data >= dataInicio;

            const atendeDataFim =
                !dataFim || data <= dataFim;

            const atendeServico =
                servico === 'todos' ||
                (agendamento.servico || '').trim() === servico;

            const atendeStatus =
                status === 'todos' ||
                (agendamento.status || '').trim() === status;

            return (
                atendeDataInicio &&
                atendeDataFim &&
                atendeServico &&
                atendeStatus
            );
        });

    renderizarTabelaAtendimentos(
        atendimentosFiltrados
    );
}


function limparFiltrosBarbeiro() {
    document.getElementById('dataInicio').value = '';
    document.getElementById('dataFim').value = '';
    document.getElementById('filtroServico').value = 'todos';
    document.getElementById('filtroStatus').value = 'todos';

    renderizarTabelaAtendimentos(
        todosAtendimentosBarbeiro
    );
}


// ======================================================
// FILTRO DO DESEMPENHO FINANCEIRO
// ======================================================

function aplicarFiltroDesempenho() {
    const dataInicio = document.getElementById('dataInicioDesempenho').value;
    const dataFim = document.getElementById('dataFimDesempenho').value;

    const atendimentosFiltrados = todosAtendimentosBarbeiro.filter(agendamento => {
        const data = agendamento.data_agendamento
            ? new Date(agendamento.data_agendamento).toISOString().split('T')[0]
            : '';

        const atendeDataInicio = !dataInicio || data >= dataInicio;
        const atendeDataFim = !dataFim || data <= dataFim;

        return atendeDataInicio && atendeDataFim;
    });

    atualizarCardsDesempenho(atendimentosFiltrados);
    renderizarGraficoBarbeiro(atendimentosFiltrados);
}

function atualizarCardsDesempenho(atendimentos) {
    let totalFaturamento = 0;
    let totalConcluidos = 0;

    atendimentos.forEach(agendamento => {
        const status = agendamento.status
            ? agendamento.status.trim()
            : '';

        if (status === 'Concluído') {
            totalConcluidos++;
            totalFaturamento += parseFloat(
                agendamento.valor_servico || 0
            );
        }
    });

    document.getElementById('resumoCortes').innerText = totalConcluidos;

    document.getElementById('resumoFaturamento').innerText =
        `R$ ${totalFaturamento.toFixed(2).replace('.', ',')}`;
}


function limparFiltroDesempenho() {
    document.getElementById('dataInicioDesempenho').value = '';
    document.getElementById('dataFimDesempenho').value = '';

    atualizarResumoBarbeiro(todosAtendimentosBarbeiro);
    renderizarGraficoBarbeiro(todosAtendimentosBarbeiro);
}


// ======================================================
// GRÁFICO DE FATURAMENTO
// ======================================================

function renderizarGraficoBarbeiro(atendimentos) {
    const canvas =
        document.getElementById(
            'graficoFaturamento'
        );

    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext('2d');

    if (meuGrafico) {
        meuGrafico.destroy();
    }

    const usuario =
        JSON.parse(localStorage.getItem('user'));

    const nomeBarbeiro =
        usuario?.nome || 'Meu Faturamento';

    let totalFaturamento = 0;
    let totalConcluidos = 0;

    atendimentos.forEach(agendamento => {
        const status = agendamento.status
            ? agendamento.status.trim()
            : '';

        if (status === 'Concluído') {
            totalFaturamento += parseFloat(
                agendamento.valor_servico || 0
            );

            totalConcluidos++;
        }
    });

    meuGrafico = new Chart(ctx, {
        type: 'bar',

        data: {
            labels: [nomeBarbeiro],

            datasets: [{
                label: `Meu Faturamento - ${totalConcluidos} atendimento(s)`,
                data: [totalFaturamento],
                backgroundColor: '#f17a12',
                borderRadius: 5
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                y: {
                    beginAtZero: true,

                    ticks: {
                        color: '#fff'
                    }
                },

                x: {
                    ticks: {
                        color: '#fff'
                    }
                }
            },

            plugins: {
                legend: {
                    labels: {
                        color: '#fff'
                    }
                }
            }
        }
    });
}


// ======================================================
// CORES DOS STATUS
// ======================================================

function getStatusColorBarbeiro(status) {
    if (!status) {
        return 'primary';
    }

    const statusNormalizado =
        status.toLowerCase().trim();

    if (
        statusNormalizado === 'concluído' ||
        statusNormalizado === 'concluido'
    ) {
        return 'success';
    }

    if (statusNormalizado === 'pendente') {
        return 'warning text-dark';
    }

    if (statusNormalizado === 'faltou') {
        return 'danger';
    }

    if (statusNormalizado === 'cancelado') {
        return 'secondary';
    }

    return 'primary';
}


// ======================================================
// ALTERAR STATUS DO ATENDIMENTO
// ======================================================

async function alterarStatusBarbeiro(id, novoStatus) {
    if (!novoStatus) {
        return;
    }

    const usuario =
        JSON.parse(localStorage.getItem('user'));

    const nomeBarbeiro =
        usuario?.nome || 'Barbeiro';

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/status`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    id: id,
                    status: novoStatus,
                    adminNome: nomeBarbeiro
                })
            }
        );

        if (response.ok) {
            alert('Status atualizado com sucesso!');
            await carregarDadosBarbeiro();
        } else {
            alert('Não foi possível alterar o status.');
        }

    } catch (error) {
        console.error(
            'Erro ao alterar status:',
            error
        );

        alert(
            'Erro ao conectar com o servidor.'
        );
    }
}