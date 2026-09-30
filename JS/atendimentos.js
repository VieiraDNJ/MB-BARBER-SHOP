/* ________________________ CARREGAR ATENDIMENTOS (CLIENTE) ______________________________ */
async function carregarAtendimentos() {
    const dadosUsuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!dadosUsuario) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // 🔄 Rota atualizada para usar o filtro por query string correto do seu backend
        const response = await fetch(`http://localhost:3000/admin/agendamentos?cliente_id=${dadosUsuario.id}`);
        const agendamentos = await response.json();

        const corpoTabela = document.getElementById('listaAgendamentosCliente');
        if (!corpoTabela) return;
        
        corpoTabela.innerHTML = '';

        if (agendamentos.length === 0) {
            corpoTabela.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #aaa;">Nenhum agendamento encontrado.</td></tr>';
            return;
        }

        agendamentos.forEach(ag => {
            const statusAtual = ag.status ? ag.status.trim() : "Pendente";
            
            // 🔄 Propriedade atualizada para puxar o nome textual resolvido pelo INNER JOIN
            const nomeBarbeiro = ag.nome_barbeiro || "Não informado"; 

            // Se o status for 'Pendente', mostra o botão. Se não, mostra que está Finalizado/Finalizado
            const btnCancelar = statusAtual.toLowerCase() === 'pendente' 
                ? `<button onclick="cancelarMeuAgendamento(${ag.id})" class="btn btn-sm btn-outline-danger">Cancelar</button>` 
                : `<span style="color: #8c8c8c;" class="small fw-bold">Finalizado</span>`;

            const dataFormatada = new Date(ag.data_agendamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            // Mantive seus estilos inline originais de estilização da tabela
            corpoTabela.innerHTML += `
                <tr style="background-color: white; color: #333; border-bottom: 1px solid #333;">
                    <td style="padding: 15px; border-right: 1px solid #333; font-weight: 500;">${dataFormatada}</td>
                    <td style="padding: 15px; border-right: 1px solid #333;">${ag.horario}</td>
                    <td style="padding: 15px; border-right: 1px solid #333;">${ag.servico}</td>
                    <td style="padding: 15px; border-right: 1px solid #333;">${nomeBarbeiro}</td> <td style="padding: 15px; border-right: 1px solid #333; font-weight: bold;">R$ ${parseFloat(ag.valor_servico).toFixed(2)}</td>
                    <td style="padding: 15px; border-right: 1px solid #333; text-align: center;">
                        <span class="badge bg-${corStatus(statusAtual)}" style="padding: 8px 12px; min-width: 90px;">
                            ${statusAtual}
                        </span>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        ${btnCancelar}
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Erro ao carregar atendimentos:", err);
    }
}

/* ________________________ CANCELAR AGENDAMENTO ______________________________ */
async function cancelarMeuAgendamento(id) { // 🔄 Nome corrigido sem o "e" extra
    if (!confirm("Deseja realmente cancelar este agendamento?")) return;

    try {
        const response = await fetch('http://localhost:3000/admin/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, status: 'Cancelado' })
        });

        if (response.ok) {
            alert("Agendamento cancelado com sucesso!");
            carregarAtendimentos(); // Recarrega a lista para atualizar o status na tela
        } else {
            alert("Erro ao tentar cancelar o agendamento.");
        }
    } catch (err) {
        alert("Erro ao conectar com o servidor.");
    }
}

/* ________________________ UTILITÁRIO DE COR DO STATUS ______________________________ */
function corStatus(status) {
    if (!status) return 'secondary';
    const s = status.toLowerCase().trim();
    if (s === 'pendente') return 'warning text-dark';
    if (s === 'concluído' || s === 'concluido') return 'success';
    if (s === 'cancelado') return 'secondary';
    return 'danger'; // Para o status 'Faltou'
}

window.onload = carregarAtendimentos;