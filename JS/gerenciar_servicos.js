const API_BASE_URL = `http://${window.location.hostname}:3000`;

let servicoSelecionado = null;
let modalEditar = null;


// =======================================================
// VERIFICAR ACESSO
// =======================================================

function verificarAcesso() {
    const cargo = localStorage.getItem("cargo");

    if (cargo !== "Admin") {
        alert("Acesso permitido somente para administradores.");
        window.location.href = "login.html";
        return false;
    }

    return true;
}


// =======================================================
// CARREGAR SERVIÇOS
// =======================================================

async function carregarServicos() {
    const tabela = document.getElementById("tabelaServicos");

    try {
        const resposta = await fetch(`${API_BASE_URL}/servicos`);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar os serviços.");
        }

        const servicos = await resposta.json();

        tabela.innerHTML = "";

        if (servicos.length === 0) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center">
                        Nenhum serviço cadastrado.
                    </td>
                </tr>
            `;
            return;
        }

        servicos.forEach(servico => {
            const linha = document.createElement("tr");

            linha.innerHTML = `
                <td>${escaparHTML(servico.nome)}</td>

                <td class="preco">
                    R$ ${formatarPreco(servico.preco)}
                </td>

                <td>
                    <button
                        type="button"
                        class="btn btn-warning btn-sm btn-editar"
                        onclick="abrirModal(${servico.id_servicos}, '${escaparAtributo(servico.nome)}', ${Number(servico.preco)})">
                        <i class="bi bi-pencil"></i>
                        Editar
                    </button>
                </td>
            `;

            tabela.appendChild(linha);
        });

    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    Erro ao carregar os serviços.
                </td>
            </tr>
        `;
    }
}


// =======================================================
// ABRIR MODAL
// =======================================================

function abrirModal(id, nome, preco) {
    console.log("Abrindo serviço:", id, nome, preco);

    servicoSelecionado = id;

    document.getElementById("nomeServico").value = nome;
    document.getElementById("precoServico").value = Number(preco).toFixed(2);

    const elementoModal = document.getElementById("modalEditar");

    modalEditar = bootstrap.Modal.getOrCreateInstance(elementoModal);

    modalEditar.show();
}


// =======================================================
// FECHAR MODAL
// =======================================================

function fecharModal() {
    const elementoModal = document.getElementById("modalEditar");

    const modal = bootstrap.Modal.getInstance(elementoModal);

    if (modal) {
        modal.hide();
    }

    servicoSelecionado = null;

    document.getElementById("nomeServico").value = "";
    document.getElementById("precoServico").value = "";
}


// =======================================================
// SALVAR ALTERAÇÃO
// =======================================================

async function salvarServico() {
    if (!servicoSelecionado) {
        alert("Nenhum serviço selecionado.");
        return;
    }

    const precoInput = document.getElementById("precoServico");
    const preco = Number(precoInput.value);

    if (precoInput.value === "" || isNaN(preco) || preco < 0) {
        alert("Informe um preço válido.");
        precoInput.focus();
        return;
    }

    const adminNome =
        localStorage.getItem("nome") ||
        localStorage.getItem("nomeUsuario") ||
        "Administrador";

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/admin/servicos/${servicoSelecionado}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    preco: preco,
                    adminNome: adminNome
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.message || "Erro ao atualizar o serviço."
            );
        }

        fecharModal();

        mostrarMensagem(
            dados.message || "Preço atualizado com sucesso!",
            "sucesso"
        );

        carregarServicos();

    } catch (erro) {
        console.error("Erro ao salvar serviço:", erro);

        mostrarMensagem(
            erro.message || "Erro ao atualizar o preço.",
            "erro"
        );
    }
}


// =======================================================
// FORMATAR PREÇO
// =======================================================

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


// =======================================================
// MENSAGEM
// =======================================================

function mostrarMensagem(texto, tipo) {
    const mensagem = document.getElementById("mensagem");

    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;

    setTimeout(() => {
        mensagem.className = "mensagem";
        mensagem.textContent = "";
    }, 4000);
}


// =======================================================
// PROTEÇÃO HTML
// =======================================================

function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}


// =======================================================
// PROTEÇÃO DO ATRIBUTO
// =======================================================

function escaparAtributo(texto) {
    return String(texto)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/`/g, "\\`");
}


// =======================================================
// INICIALIZAÇÃO
// =======================================================

window.addEventListener("DOMContentLoaded", () => {
    if (!verificarAcesso()) {
        return;
    }

    carregarServicos();
});