const API_BASE_URL = `http://${window.location.hostname}:3000`; // 🔄 LINHA ESSENCIAL: Descobre o IP sozinho!

/*________________________ LÓGICA DE TRANSIÇÃO (LOGIN/REGISTRO/ESQUECI) ______________________________ */
const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const forgotLink = document.querySelector('.remember-forgot a');
const backToLogin = document.querySelector('.back-to-login');

// Ao clicar em "Registrar"
if (registerLink) {
    registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.remove('forgot-active'); 
        wrapper.classList.add('active');           
    });
}

// Ao clicar em "Login" (dentro da tela de registro)
if (loginLink) {
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.remove('active');
    });
}

// Ao clicar em "Esqueceu a Senha?"
if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.remove('active');        
        wrapper.classList.add('forgot-active');    
    });
}

// Ao clicar em "Voltar para o Login" (dentro da recuperação)
if (backToLogin) {
    backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.remove('forgot-active');
    });
}

/*________________________ LÓGICA DE LOGIN (IP AJUSTADO) ______________________________ */
const loginForm = document.querySelector('.form-box.login form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Pega os valores dos inputs
        const inputs = loginForm.querySelectorAll('input');
        const email = inputs[0].value;
        const senha = inputs[1].value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email, 
                    senha: senha 
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Bem-vindo, ${data.user.nome}!`);

                localStorage.clear();
                
                // Salva os dados no localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('usuarioLogado', JSON.stringify(data.user));
                localStorage.setItem('cargo', data.user.cargo);
                
                // Redirecionamento condicional baseado no cargo retornado pelo servidor
                // Certifique-se que o texto aqui ('Admin', 'Barbeiro') 
                // seja exatamente igual ao que vem do seu banco de dados
                if (data.user.cargo === 'Admin') {
                    window.location.href = '../HTML/admin.html';
                } 
                else if (data.user.cargo === 'Barbeiro') {
                    window.location.href = '../HTML/dashboard_barbeiro.html';
                }
                else {
                    // Se for 'Cliente' ou qualquer outro, vai para o index
                    window.location.href = '../HTML/index.html'; 
                }
            } else {
                // Exibe a mensagem de erro enviada pelo servidor (ex: "Senha incorreta")
                alert(data.message || "E-mail ou senha incorretos.");
            }
        } catch (error) {
            console.error("Erro no login:", error);
            alert("Erro ao conectar com o servidor. Verifique a conexão.");
        }
    });
}

/*________________________ LÓGICA DE CADASTRO (CORRIGIDA) ______________________________ */
const registerForm = document.querySelector('.form-box.register form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputs = registerForm.querySelectorAll('input');
        const dados = {
            nome: inputs[0].value,
            cpf: inputs[1].value,
            tel: inputs[2].value,
            email: inputs[3].value,
            senha: inputs[4].value
        };

        try {
            // 🔄 CORREÇÃO AQUI: Mudado de /login para /registrar batendo no endpoint correto
            const response = await fetch(`${API_BASE_URL}/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            const data = await response.json();

            if (response.ok) {
                alert("Cadastro realizado com sucesso! Agora você pode fazer o login.");
                wrapper.classList.remove('active'); 
                registerForm.reset(); 
            } else {
                alert(data.message || "Erro ao cadastrar.");
            }
        } catch (error) {
            alert("Erro de conexão com o servidor. Verifique o seu backend e as configurações de rede.");
        }
    });
}

/*________________________ ENVIO DE RECUPERAÇÃO (IP AJUSTADO) ______________________________ */
const forgotForm = document.querySelector('.forgot-password form');

if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = forgotForm.querySelector('input[type="email"]');
        
        // 🔄 CORREÇÃO AQUI: O .trim() remove qualquer espaço ou quebra de linha invisível nas pontas!
        const email = emailInput.value.trim(); 

        try {
            //COMPUTADOR NOTEBOOK
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });


            // LER A MENSAGEM REAL ENVIADA PELO SERVER
            const data = await response.json();

            if (response.ok) {
                alert("Verifique seu e-mail! Enviamos um link de recuperação.");
                emailInput.value = ""; 
            } else {
                // 🔄 Melhorado para exibir o motivo real retornado pelo servidor (ex: "E-mail não encontrado")
                alert(data.message || "E-mail não encontrado na nossa base.");
            }
        } catch (error) {
            alert("Erro ao conectar com o servidor.");
        }
    });
}

/*___________________ MÁSCARAS (CPF E TELEFONE) ___________________________________ */
const cpfField = document.querySelector('#cpf');
if (cpfField) {
    cpfField.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ""); 
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        e.target.value = value;
    });
}

const telField = document.querySelector('#tel');
if (telField) {
    telField.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ""); 
        if (value.length > 0) {
            value = value.replace(/^(\d{2})(\d)/, "($1) $2");
            if (value.length > 13) { 
                value = value.replace(/(\d{5})(\d{4})$/, "$1-$2");
            } else { 
                value = value.replace(/(\d{4})(\d{4})$/, "$1-$2");
            }
        }
        e.target.value = value;
    });
}