const API_BASE_URL = `http://${window.location.hostname}:3000`;

// =========================================================
// VARIÁVEL GLOBAL DO GRÁFICO
// =========================================================

let meuGrafico = null;


// =========================================================
// CARREGAR BARBEIROS
// =========================================================

async function carregarFiltroBarbeiros() {
    try {
        const resposta = await fetch(`${API_BASE_URL}/barbeiros/ativos`);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar barbeiros.");
        }

        const barbeiros = await resposta.json();

        // Filtro do Desempenho Financeiro
        const selectDesempenho = document.getElementById("filtroBarbeiroDesempenho");

        // Filtro dos Atendimentos Recentes
        const selectAtendimentos = document.getElementById("filtroBarbeiro");

        // -----------------------------------------------------
        // DESEMPENHO FINANCEIRO
        // -----------------------------------------------------

        if (selectDesempenho) {
            selectDesempenho.innerHTML = `
                <option value="todos">Todos os Barbeiros</option>
            `;

            barbeiros.forEach(b => {
                const option = document.createElement("option");

                option.value = b.id;
                option.textContent = b.nome;

                selectDesempenho.appendChild(option);
            });
        }

        // -----------------------------------------------------
        // ATENDIMENTOS RECENTES
        // -----------------------------------------------------

        if (selectAtendimentos) {
            selectAtendimentos.innerHTML = `
                <option value="todos">Todos os Barbeiros</option>
            `;

            barbeiros.forEach(b => {
                const option = document.createElement("option");

                option.value = b.id;
                option.textContent = b.nome;

                selectAtendimentos.appendChild(option);
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar barbeiros:", erro);
    }
}


// =========================================================
// CARREGAR SERVIÇOS
// =========================================================

async function carregarFiltroServicos() {
    const selectServico = document.getElementById("filtroServico");

    if (!selectServico) return;

    try {
        const resposta = await fetch(`${API_BASE_URL}/servicos`);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar serviços.");
        }

        const servicos = await resposta.json();

        selectServico.innerHTML = `
            <option value="todos">Todos os Serviços</option>
        `;

        servicos.forEach(servico => {
            const option = document.createElement("option");

            option.value = servico.id_servicos;
            option.textContent = servico.nome;

            selectServico.appendChild(option);
        });

    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro);
    }
}


// =========================================================
// ATENDIMENTOS RECENTES
// =========================================================

async function carregarDadosAdmin() {

    const dataInicioElement = document.getElementById("dataInicio");
    const dataFimElement = document.getElementById("dataFim");
    const barbeiroElement = document.getElementById("filtroBarbeiro");
    const servicoElement = document.getElementById("filtroServico");
    const statusElement = document.getElementById("filtroStatus");

    const dataInicio = dataInicioElement ? dataInicioElement.value : "";
    const dataFim = dataFimElement ? dataFimElement.value : "";
    const barbeiro = barbeiroElement ? barbeiroElement.value : "todos";
    const servico = servicoElement ? servicoElement.value : "todos";
    const statusFiltro = statusElement ? statusElement.value : "todos";

    // -----------------------------------------------------
    // VALIDAÇÃO DAS DATAS
    // -----------------------------------------------------

    if (dataInicio && dataFim && dataFim < dataInicio) {
        alert("❌ A data final não pode ser anterior à data inicial!");
        return;
    }

    // -----------------------------------------------------
    // MONTA URL
    // -----------------------------------------------------

    let url = `${API_BASE_URL}/admin/agendamentos?barbeiro=${barbeiro}`;

    if (dataInicio) {
        url += `&inicio=${dataInicio}`;
    }

    if (dataFim) {
        url += `&fim=${dataFim}`;
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Erro ao buscar agendamentos.");
        }

        let agendamentos = await response.json();

        // -----------------------------------------------------
        // FILTRO DE SERVIÇO
        // -----------------------------------------------------

        if (servico && servico !== "todos") {
            agendamentos = agendamentos.filter(ag => {
                return String(ag.servico_id) === String(servico);
            });
        }

        // -----------------------------------------------------
        // FILTRO DE STATUS
        // -----------------------------------------------------

        if (statusFiltro && statusFiltro !== "todos") {
            agendamentos = agendamentos.filter(ag => {
                return (ag.status || "").trim() === statusFiltro;
            });
        }

        // -----------------------------------------------------
        // TABELA
        // -----------------------------------------------------

        const tabela = document.getElementById("tabelaAgendamentos");

        if (!tabela) return;

        tabela.innerHTML = "";

        const cargoUsuario =
            (localStorage.getItem("cargo") || "").toUpperCase();

        agendamentos.forEach(ag => {

            const statusAtual = ag.status
                ? ag.status.trim()
                : "";

            const barbeiroNome =
                ag.nome_barbeiro || "Não informado";

            const valorServico =
                parseFloat(ag.valor_servico || 0);

            const dataFormatada =
                new Date(ag.data_agendamento)
                    .toLocaleDateString("pt-BR", {
                        timeZone: "UTC"
                    });

            // -------------------------------------------------
            // BOTÃO EXCLUIR
            // -------------------------------------------------

            const acaoExcluir =
                cargoUsuario === "ADMIN"
                    ? `
                        <td class="text-center">
                            <i
                                class="bi bi-trash btn-delete"
                                style="cursor:pointer; color:#dc3545;"
                                onclick="excluirAgendamento(${ag.id})">
                            </i>
                        </td>
                    `
                    : `
                        <td class="text-center">-</td>
                    `;

            // -------------------------------------------------
            // AÇÕES DE STATUS
            // -------------------------------------------------

            let acoesHTML = "";

            if (statusAtual === "Pendente") {

                acoesHTML = `
                    <select
                        onchange="alterarStatus(${ag.id}, this.value)"
                        class="form-select form-select-sm bg-dark text-white border-secondary">

                        <option value="">
                            Alterar...
                        </option>

                        <option value="Concluído">
                            Concluído
                        </option>

                        <option value="Faltou">
                            Faltou
                        </option>

                        <option value="Cancelado">
                            Cancelado
                        </option>

                    </select>
                `;

            } else {

                acoesHTML = `
                    <span class="text-secondary small fw-bold">
                        Finalizado
                    </span>
                `;
            }

            // -------------------------------------------------
            // ADICIONAR LINHA
            // -------------------------------------------------

            tabela.innerHTML += `
                <tr>

                    <td>
                        ${dataFormatada}
                    </td>

                    <td>
                        ${ag.horario || ""}
                    </td>

                    <td>
                        ${ag.nome_cliente || "Cliente"}
                    </td>

                    <td>
                        ${ag.servico || "Não informado"}
                    </td>

                    <td>
                        ${barbeiroNome}
                    </td>

                    <td>
                        R$ ${valorServico.toFixed(2)}
                    </td>

                    <td>
                        <span class="badge bg-${getStatusColor(statusAtual)}">
                            ${statusAtual}
                        </span>
                    </td>

                    <td>
                        ${acoesHTML}
                    </td>

                    ${acaoExcluir}

                </tr>
            `;
        });

    } catch (error) {
        console.error("Erro ao carregar atendimentos:", error);
    }
}


// =========================================================
// APLICAR FILTRO DO DESEMPENHO FINANCEIRO
// =========================================================

async function aplicarFiltroDesempenhoAdmin() {

    const dataInicioElement =
        document.getElementById("dataInicioDesempenho");

    const dataFimElement =
        document.getElementById("dataFimDesempenho");

    const barbeiroElement =
        document.getElementById("filtroBarbeiroDesempenho");

    const dataInicio =
        dataInicioElement ? dataInicioElement.value : "";

    const dataFim =
        dataFimElement ? dataFimElement.value : "";

    const barbeiro =
        barbeiroElement
            ? barbeiroElement.value
            : "todos";

    // -----------------------------------------------------
    // VALIDAÇÃO
    // -----------------------------------------------------

    if (dataInicio && dataFim && dataFim < dataInicio) {

        alert(
            "❌ A data final não pode ser anterior à data inicial!"
        );

        return;
    }

    // -----------------------------------------------------
    // URL
    // -----------------------------------------------------

    let url =
        `${API_BASE_URL}/admin/agendamentos?barbeiro=${barbeiro}`;

    if (dataInicio) {
        url += `&inicio=${dataInicio}`;
    }

    if (dataFim) {
        url += `&fim=${dataFim}`;
    }

    try {

        const resposta = await fetch(url);

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar dados do desempenho."
            );
        }

        const agendamentos = await resposta.json();

        // -----------------------------------------------------
        // CALCULAR DADOS FINANCEIROS
        // -----------------------------------------------------

        let totalValor = 0;
        let totalCortesConcluidos = 0;

        const faturamentoPorBarbeiro = {};

        agendamentos.forEach(ag => {

            const status =
                ag.status
                    ? ag.status.trim()
                    : "";

            const nomeBarbeiro =
                ag.nome_barbeiro ||
                "Não informado";

            const valor =
                parseFloat(
                    ag.valor_servico || 0
                );

            // Somente concluídos entram no faturamento
            if (status === "Concluído") {

                totalValor += valor;

                totalCortesConcluidos++;

                faturamentoPorBarbeiro[nomeBarbeiro] =
                    (faturamentoPorBarbeiro[nomeBarbeiro] || 0)
                    + valor;
            }
        });

        // -----------------------------------------------------
        // ATUALIZAR CARD DE CORTES
        // -----------------------------------------------------

        const resumoCortes =
            document.getElementById("resumoCortes");

        if (resumoCortes) {
            resumoCortes.innerText =
                totalCortesConcluidos;
        }

        // -----------------------------------------------------
        // ATUALIZAR CARD DE FATURAMENTO
        // -----------------------------------------------------

        const resumoFaturamento =
            document.getElementById("resumoFaturamento");

        if (resumoFaturamento) {

            resumoFaturamento.innerText =
                `R$ ${totalValor.toFixed(2)}`;
        }

        // -----------------------------------------------------
        // BARBEIRO EM DESTAQUE
        // -----------------------------------------------------

        const barbeirosOrdenados =
            Object.entries(
                faturamentoPorBarbeiro
            ).sort(
                (a, b) => b[1] - a[1]
            );

        const barbeiroDestaque =
            barbeirosOrdenados.length > 0
                ? barbeirosOrdenados[0][0]
                : "-";

        const resumoBarbeiro =
            document.getElementById(
                "resumoBarbeiro"
            );

        if (resumoBarbeiro) {

            resumoBarbeiro.innerText =
                barbeiroDestaque;
        }

        // -----------------------------------------------------
        // ATUALIZAR GRÁFICO
        // -----------------------------------------------------

        renderizarGrafico(agendamentos);

    } catch (erro) {

        console.error(
            "Erro ao aplicar filtro de desempenho:",
            erro
        );

        alert(
            "❌ Erro ao carregar o desempenho financeiro."
        );
    }
}


// =========================================================
// LIMPAR FILTRO DO DESEMPENHO
// =========================================================

function limparFiltroDesempenhoAdmin() {

    const dataInicio =
        document.getElementById(
            "dataInicioDesempenho"
        );

    const dataFim =
        document.getElementById(
            "dataFimDesempenho"
        );

    const barbeiro =
        document.getElementById(
            "filtroBarbeiroDesempenho"
        );

    if (dataInicio) {
        dataInicio.value = "";
    }

    if (dataFim) {
        dataFim.value = "";
    }

    if (barbeiro) {
        barbeiro.value = "todos";
    }

    aplicarFiltroDesempenhoAdmin();
}


// =========================================================
// LIMPAR FILTROS DOS ATENDIMENTOS
// =========================================================

function limparFiltrosAtendimentosAdmin() {

    const dataInicio =
        document.getElementById("dataInicio");

    const dataFim =
        document.getElementById("dataFim");

    const barbeiro =
        document.getElementById("filtroBarbeiro");

    const servico =
        document.getElementById("filtroServico");

    const status =
        document.getElementById("filtroStatus");

    if (dataInicio) {
        dataInicio.value = "";
    }

    if (dataFim) {
        dataFim.value = "";
    }

    if (barbeiro) {
        barbeiro.value = "todos";
    }

    if (servico) {
        servico.value = "todos";
    }

    if (status) {
        status.value = "todos";
    }

    carregarDadosAdmin();
}

// =========================================================
// APLICAR FILTROS DOS ATENDIMENTOS RECENTES
// =========================================================

function aplicarFiltrosAtendimentosAdmin() {
    carregarDadosAdmin();
}


// =========================================================
// RENDERIZAR GRÁFICO
// =========================================================

function renderizarGrafico(dados) {

    const canvas =
        document.getElementById(
            "graficoFaturamento"
        );

    if (!canvas) return;

    const ctx =
        canvas.getContext("2d");

    const faturamentoPorBarbeiro = {};

    dados.forEach(ag => {

        const status =
            ag.status
                ? ag.status.trim()
                : "";

        if (status === "Concluído") {

            const nome =
                ag.nome_barbeiro ||
                "Não informado";

            const valor =
                parseFloat(
                    ag.valor_servico || 0
                );

            faturamentoPorBarbeiro[nome] =
                (faturamentoPorBarbeiro[nome] || 0)
                + valor;
        }
    });

    const nomes =
        Object.keys(
            faturamentoPorBarbeiro
        );

    const valores =
        Object.values(
            faturamentoPorBarbeiro
        );

    // -----------------------------------------------------
    // DESTRUIR GRÁFICO ANTERIOR
    // -----------------------------------------------------

    if (meuGrafico) {
        meuGrafico.destroy();
    }

    // -----------------------------------------------------
    // CRIAR NOVO GRÁFICO
    // -----------------------------------------------------

    meuGrafico = new Chart(ctx, {

        type: "bar",

        data: {

            labels: nomes,

            datasets: [

                {
                    label:
                        "Faturamento por Barbeiro (R$)",

                    data: valores,

                    backgroundColor:
                        "#f17a12",

                    borderRadius: 5
                }

            ]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            scales: {

                y: {
                    beginAtZero: true,

                    ticks: {
                        color: "#fff"
                    }
                },

                x: {
                    ticks: {
                        color: "#fff"
                    }
                }
            },

            plugins: {

                legend: {

                    labels: {
                        color: "#fff"
                    }
                }
            }
        }
    });
}


// =========================================================
// EXCLUIR AGENDAMENTO
// =========================================================

async function excluirAgendamento(id) {

    if (
        !confirm(
            "⚠️ Tem certeza que deseja excluir permanentemente este agendamento?"
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/excluir/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (response.ok) {

            alert(
                "✅ Registro excluído com sucesso!"
            );

            carregarDadosAdmin();

            aplicarFiltroDesempenhoAdmin();

        } else {

            alert(
                "Erro ao excluir o registro."
            );
        }

    } catch (error) {

        console.error(
            "Erro na exclusão:",
            error
        );

        alert(
            "Erro ao conectar com o servidor."
        );
    }
}


// =========================================================
// EXPORTAR PARA EXCEL
// =========================================================

function exportarExcel() {

    const tabela =
        document.querySelector("table");

    if (
        !tabela ||
        tabela.querySelectorAll(
            "tbody tr"
        ).length === 0
    ) {

        alert(
            "Não há dados para exportar!"
        );

        return;
    }

    const wb =
        XLSX.utils.table_to_book(
            tabela,
            {
                sheet: "Relatório MB"
            }
        );

    const dataAtual =
        new Date()
            .toLocaleDateString("pt-BR")
            .replace(/\//g, "-");

    XLSX.writeFile(
        wb,
        `Relatorio_MB_Barber_${dataAtual}.xlsx`
    );
}


// =========================================================
// ALTERAR STATUS
// =========================================================

async function alterarStatus(
    id,
    novoStatus
) {

    if (!novoStatus) return;

    const usuarioString =
        localStorage.getItem(
            "usuarioLogado"
        );

    const usuarioLogado =
        usuarioString
            ? JSON.parse(usuarioString)
            : null;

    const nomeUsuario =
        usuarioLogado
            ? usuarioLogado.nome
            : "Administrador";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        id: id,

                        status: novoStatus,

                        adminNome: nomeUsuario
                    })
                }
            );

        if (response.ok) {

            carregarDadosAdmin();

            aplicarFiltroDesempenhoAdmin();

        } else {

            alert(
                "Erro ao alterar o status."
            );
        }

    } catch (error) {

        console.error(
            "Erro ao alterar status:",
            error
        );
    }
}


// =========================================================
// CORES DOS STATUS
// =========================================================

function getStatusColor(status) {

    if (!status) {
        return "primary";
    }

    const s =
        status
            .toLowerCase()
            .trim();

    if (
        s === "concluído" ||
        s === "concluido"
    ) {
        return "success";
    }

    if (s === "pendente") {
        return "warning text-dark";
    }

    if (s === "faltou") {
        return "danger";
    }

    if (s === "cancelado") {
        return "secondary";
    }

    return "primary";
}


// =========================================================
// BLOQUEAR HORÁRIO
// =========================================================

async function enviarBloqueio() {

    const barbeiroElement =
        document.getElementById(
            "bloqueioBarbeiro"
        );

    const dataElement =
        document.getElementById(
            "bloqueioData"
        );

    if (!barbeiroElement || !dataElement) {
        return;
    }

    const barbeiroId =
        barbeiroElement.value;

    const data =
        dataElement.value;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/bloquear`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        barbeiro_id:
                            barbeiroId,

                        data: data
                    })
                }
            );

        if (response.ok) {

            alert(
                "Dia bloqueado com sucesso!"
            );

            location.reload();

        } else {

            alert(
                "Erro ao bloquear."
            );
        }

    } catch (error) {

        console.error(
            "Erro ao bloquear:",
            error
        );

        alert(
            "Erro ao conectar com o servidor."
        );
    }
}


// =========================================================
// CARREGAR LOGS
// =========================================================

async function carregarLogs() {

    const listaLogs =
        document.getElementById(
            "lista-logs"
        );

    if (!listaLogs) return;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/logs`
            );

        if (!response.ok) {
            throw new Error(
                "Erro ao buscar logs"
            );
        }

        const logs =
            await response.json();

        if (logs.length === 0) {

            listaLogs.innerHTML =
                `
                <li class="list-group-item bg-dark text-light">
                    Nenhum log encontrado.
                </li>
                `;

            return;
        }

        listaLogs.innerHTML =
            logs.map(log => `

                <li class="list-group-item bg-dark text-light border-secondary log-item">

                    <small class="text-warning">
                        ${log.data_formatada}
                    </small>

                    <br>

                    <strong>
                        ${log.admin_usuario}
                    </strong>:

                    ${log.acao}

                    <br>

                    <span class="text-info">
                        ${log.detalhes}
                    </span>

                </li>

            `).join("");

    } catch (error) {

        console.error(
            "Erro ao carregar logs:",
            error
        );

        listaLogs.innerHTML =
            `
            <li class="list-group-item bg-danger text-light">
                Erro ao carregar logs.
            </li>
            `;
    }
}

// =========================================================
// EXPORTAR DESEMPENHO FINANCEIRO PARA EXCEL
// =========================================================

async function exportarDesempenhoExcel() {

    const dataInicio =
        document.getElementById("dataInicioDesempenho")?.value || "";

    const dataFim =
        document.getElementById("dataFimDesempenho")?.value || "";

    const barbeiro =
        document.getElementById("filtroBarbeiroDesempenho")?.value || "todos";

    if (dataInicio && dataFim && dataFim < dataInicio) {
        alert("❌ A data final não pode ser anterior à data inicial!");
        return;
    }

    let url =
        `${API_BASE_URL}/admin/agendamentos?barbeiro=${barbeiro}`;

    if (dataInicio) {
        url += `&inicio=${dataInicio}`;
    }

    if (dataFim) {
        url += `&fim=${dataFim}`;
    }

    try {

        const resposta = await fetch(url);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar dados para exportação.");
        }

        const agendamentos = await resposta.json();

        // Somente atendimentos concluídos
        const dadosExcel = agendamentos
            .filter(ag => (ag.status || "").trim() === "Concluído")
            .map(ag => ({
                "Data":
                    new Date(ag.data_agendamento)
                        .toLocaleDateString("pt-BR", {
                            timeZone: "UTC"
                        }),

                "Horário":
                    ag.horario || "",

                "Cliente":
                    ag.nome_cliente || "",

                "Serviço":
                    ag.servico || "",

                "Barbeiro":
                    ag.nome_barbeiro || "",

                "Valor":
                    parseFloat(ag.valor_servico || 0),

                "Status":
                    ag.status || ""
            }));

        if (dadosExcel.length === 0) {
            alert("⚠️ Não há atendimentos concluídos para exportar.");
            return;
        }

        // Criar planilha
        const worksheet =
            XLSX.utils.json_to_sheet(dadosExcel);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Desempenho Financeiro"
        );

        // Nome do arquivo
        let nomeArquivo = "Desempenho_Financeiro";

        if (dataInicio && dataFim) {
            nomeArquivo += `_${dataInicio}_a_${dataFim}`;
        } else if (dataInicio) {
            nomeArquivo += `_a_partir_de_${dataInicio}`;
        } else if (dataFim) {
            nomeArquivo += `_ate_${dataFim}`;
        }

        if (barbeiro !== "todos") {
            const select =
                document.getElementById(
                    "filtroBarbeiroDesempenho"
                );

            const nomeBarbeiro =
                select.options[
                    select.selectedIndex
                ]?.text || "";

            if (nomeBarbeiro) {
                nomeArquivo += `_${nomeBarbeiro.replace(/\s+/g, "_")}`;
            }
        }

        nomeArquivo += ".xlsx";

        // Baixar arquivo
        XLSX.writeFile(
            workbook,
            nomeArquivo
        );

    } catch (erro) {

        console.error(
            "Erro ao exportar desempenho:",
            erro
        );

        alert(
            "❌ Erro ao gerar a planilha Excel."
        );
    }
}


// =========================================================
// INICIALIZAÇÃO
// =========================================================

window.onload = async function() {

    const cargoUsuario =
        (
            localStorage.getItem(
                "cargo"
            ) || ""
        ).toUpperCase();

    // -----------------------------------------------------
    // ELEMENTOS CONTROLADOS PELO CARGO
    // -----------------------------------------------------

    const btnBloquear =
        document.getElementById(
            "btn-bloquear"
        );

    const secaoLogs =
        document.getElementById(
            "secao-logs"
        );

    const menuLogs =
        document.getElementById(
            "menu-item-logs"
        );

    const menuEquipe =
        document.getElementById(
            "menu-item-equipe"
        );

    // -----------------------------------------------------
    // CONTROLE DE ACESSO
    // -----------------------------------------------------

    if (cargoUsuario !== "ADMIN") {

        if (btnBloquear) {
            btnBloquear.style.display =
                "none";
        }

        if (secaoLogs) {
            secaoLogs.style.display =
                "none";
        }

        if (menuLogs) {
            menuLogs.style.display =
                "none";
        }

        if (menuEquipe) {
            menuEquipe.style.display =
                "none";
        }

        console.log(
            "🔒 Acesso limitado: Modo Barbeiro."
        );

    } else {

        console.log(
            "👑 Acesso de Administrador detectado!"
        );

        if (btnBloquear) {
            btnBloquear.style.display =
                "inline-block";
        }

        if (secaoLogs) {
            secaoLogs.style.display =
                "block";
        }

        if (menuLogs) {

            menuLogs.style.display =
                "block";

            menuLogs.classList.remove(
                "d-none"
            );
        }

        carregarLogs();
    }

    // -----------------------------------------------------
    // CARREGAR FILTROS
    // -----------------------------------------------------

    await carregarFiltroBarbeiros();

    await carregarFiltroServicos();

    // -----------------------------------------------------
    // CARREGAR ATENDIMENTOS
    // -----------------------------------------------------

    carregarDadosAdmin();

    // -----------------------------------------------------
    // CARREGAR DESEMPENHO FINANCEIRO
    // -----------------------------------------------------

    aplicarFiltroDesempenhoAdmin();
};