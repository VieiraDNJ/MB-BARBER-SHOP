// --- MÁSCARAS ---
    function mascaraCPF(campo) {
        let valor = campo.value.replace(/\D/g, '');
        if (valor.length > 11) valor = valor.slice(0, 11);
        campo.value = valor
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    function mascaraData(campo) {
        let valor = campo.value.replace(/\D/g, '');
        if (valor.length > 8) valor = valor.slice(0, 8);
        if (valor.length >= 5) campo.value = valor.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
        else if (valor.length >= 3) campo.value = valor.replace(/(\d{2})(\d)/, '$1/$2');
        else campo.value = valor;
    }

    // --- VALIDAÇÃO DE CPF ---
    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        return resto === parseInt(cpf.substring(10, 11));
    }

    // --- FUNÇÕES DE API ---
    async function carregarEquipe() {
        try {
            const res = await fetch('http://localhost:3000/equipe');
            const data = await res.json();
            const tbody = document.getElementById('listaEquipe');
            tbody.innerHTML = data.map(u => `
                <tr>
                    <td>${u.nome}</td>
                    <td>${u.cargo}</td>
                    <td><span class="badge ${u.status === 'Ativo' ? 'bg-success' : 'bg-danger'}">${u.status}</span></td>
                    <td>
                        <button class="btn btn-sm ${u.status === 'Ativo' ? 'btn-danger' : 'btn-success'}" 
                                onclick="alterarStatus(${u.id}, '${u.status === 'Ativo' ? 'Inativo' : 'Ativo'}')">
                            ${u.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (err) { console.error("Erro ao carregar equipe:", err); }
    }

    async function alterarStatus(id, novoStatus) {
        if(id == 4) { alert("Você não pode inativar o administrador principal!"); return; }
        try {
            const res = await fetch(`http://localhost:3000/equipe/status/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });
            if(res.ok) carregarEquipe();
            else alert("Erro ao atualizar status.");
        } catch (err) { console.error("Erro na requisição:", err); }
    }

    // --- CADASTRO ---
    document.getElementById('formCadastro').addEventListener('submit', async (e) => {
        e.preventDefault();

        const cpfInput = document.getElementById('cpf').value;
        if (!validarCPF(cpfInput)) {
            alert("CPF inválido!");
            return;
        }

        const dataInput = document.getElementById('data_nascimento').value;
        const partes = dataInput.split('/');
        const dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;

        const dados = {
            nome: document.getElementById('nome').value,
            cpf: cpfInput,
            data_nascimento: dataFormatada,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value,
            cargo: document.getElementById('cargo').value,
            senha: document.getElementById('senha').value
        };

        const res = await fetch('http://localhost:3000/equipe/criar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await res.json();

        if(res.ok) {
            alert("Usuário cadastrado com sucesso!");
            document.getElementById('formCadastro').reset();
            carregarEquipe();
        } else {
            alert(result.error || "Erro ao cadastrar. Verifique se o CPF ou E-mail já existem.");
        }
    });

    carregarEquipe();
