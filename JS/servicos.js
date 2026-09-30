
const API_BASE_URL = 'http://localhost:3000'; 

document.addEventListener("DOMContentLoaded", () => {
    carregarCatalogoServicos();
});

async function carregarCatalogoServicos() {
    const container = document.getElementById("container-servicos");
    
    try {
        // Busca os serviços direto da rota do seu backend
        const response = await fetch(`${API_BASE_URL}/servicos`);
        if (!response.ok) throw new Error("Erro ao buscar serviços do banco.");
        
        const servicos = await response.json();
        
        // Se o banco estiver vazio
        if (servicos.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-white-50">Nenhum serviço cadastrado no momento.</p></div>`;
            return;
        }

        // Limpa a mensagem de "Carregando..."
        container.innerHTML = "";

        // Mapeia e renderiza os cards automaticamente na tela
        servicos.forEach(servico => {
            const cardHtml = `
                <div class="col-md-4 mb-4">
                  <div class="card h-100 bg-dark border-secondary text-white">
                      <div class="card-body d-flex flex-column justify-content-between"><br>
                        <h5 class="card-title text-warning">${servico.nome}</h5><br>
                        <p class="card-text">
                          <span class="service-item">Valor do serviço: <span class="price"> R$ ${parseFloat(servico.preco).toFixed(2).replace('.', ',')}</span></span>
                        </p><br>
                        <button onclick="verificarLoginParaAgendar()" class="btn btn-primary w-100" style="background-color: #f17a12; border: none;">Agende agora</button>
                      </div>
                  </div>
                </div>
            `;
            container.insertAdjacentHTML("beforeend", cardHtml);
        });

    } catch (error) {
        console.error("Erro:", error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-danger">Não foi possível carregar os serviços. Verifique se o servidor backend está rodando!</p>
            </div>
        `;
    }
}