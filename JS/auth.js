function verificarSessao() {
    const container = document.getElementById('auth-container');
    const dados = localStorage.getItem('usuarioLogado');

    // Se não achar o lugar de colocar o nome ou se estiver na tela de login, para aqui
    if (!container || window.location.pathname.includes("login.html")) return;

    if (dados) {
        try {
            const usuario = JSON.parse(dados);
            const nomeSimples = usuario.nome.split(' ')[0];

            container.innerHTML = `
                <div class="dropdown">
                    <button class="btn dropdown-toggle d-flex align-items-center" type="button" id="userMenu" data-bs-toggle="dropdown" aria-expanded="false" style="border: none; background: transparent; padding: 0;">
                        <ion-icon name="person-circle-outline" style="font-size: 32px; color: #f17a12; margin-right: 8px;"></ion-icon>
                        <span style="color: white; font-weight: 500;">Olá, ${nomeSimples}</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu" style="background-color: #3b3a3d; border: 1px solid #444;">
                        <li><a class="dropdown-item text-white" href="meus_agendamentos.html">Meus Agendamentos</a></li>
                        <li><hr class="dropdown-divider" style="background-color: #555;"></li>
                        <li><a class="dropdown-item text-danger" href="#" id="btnLogout">Sair</a></li>
                    </ul>
                </div>
            `;

            document.getElementById('btnLogout').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('usuarioLogado');
                window.location.href = 'index.html';
            });
        } catch (e) {
            console.error("Erro ao ler dados do localStorage", e);
        }
    }
}

/**
 Verifica se o usuário pode acessar a página de agendamento
 */
function verificarLoginParaAgendar() {
    const dados = localStorage.getItem('usuarioLogado');

    if (dados) {
        // Se houver dados, ele está logado. Segue para o agendamento.
        window.location.href = 'agendamento.html';
    } else {
        // Se não estiver logado, avisa e manda para o login
        alert('Você precisa estar logado para agendar um horário!!');
        window.location.href = 'login.html';
    }
}

// Tenta rodar assim que carregar
window.addEventListener('load', verificarSessao);

// ... (mantenha suas funções verificarSessao e verificarLoginParaAgendar como estão) ...

/**
 * FUNÇÃO MATEMÁTICA PARA VALIDAR CPF
 */
function validarCPF(cpf) {
    // Remove pontos e traços para trabalhar só com os números
    cpf = cpf.replace(/[^\d]+/g, '');

    // Verifica se tem 11 dígitos ou se são números repetidos (ex: 111.111.111-11)
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

    let soma = 0, resto;

    // Cálculo do 1º dígito verificador
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    // Cálculo do 2º dígito verificador
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

// Escutador para o formulário de cadastro
window.addEventListener('load', () => {
    // 1. Inicia a sessão (Olá, Fulano)
    verificarSessao();

    // 2. Configura a trava do formulário de cadastro
    const formCadastro = document.getElementById('formCadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', function(e) {
            const campoCPF = document.getElementById('cpf');
            
            if (campoCPF && !validarCPF(campoCPF.value)) {
                e.preventDefault(); // Trava o envio
                alert('❌ O CPF informado é inválido. Por favor, confira os dados.');
                campoCPF.focus();
            }
        });
    }
});

/* ________________________ VALIDAÇÃO DE SENHA EM TEMPO REAL ______________________________ */
const regPasswordInput = document.querySelector('#reg-password');

// Mapeia os IDs dos requisitos
const reqElements = {
    length: document.getElementById('req-length'),
    upper: document.getElementById('req-upper'),
    lower: document.getElementById('req-lower'),
    number: document.getElementById('req-number'),
    special: document.getElementById('req-special')
};

if (regPasswordInput) {
    regPasswordInput.addEventListener('input', () => {
        const val = regPasswordInput.value;

        // Função para atualizar o status visual
        const updateStatus = (element, isValid) => {
            if (isValid) {
                element.classList.replace('invalid', 'valid');
                element.innerHTML = element.innerHTML.replace('✖', '✔');
            } else {
                element.classList.replace('valid', 'invalid');
                element.innerHTML = element.innerHTML.replace('✔', '✖');
            }
        };

        // Aplica as validações
        // ... dentro do seu eventListener de input ...
        updateStatus(reqElements.length, val.length >= 8);
        updateStatus(reqElements.upper, /[A-Z]/.test(val));
        updateStatus(reqElements.lower, /[a-z]/.test(val));
        updateStatus(reqElements.number, /[0-9]/.test(val));

        // Esta linha agora valida QUALQUER caractere especial
        updateStatus(reqElements.special, /[\W_]/.test(val));
    });
}