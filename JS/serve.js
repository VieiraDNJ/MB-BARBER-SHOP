require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../JS/db');


const app = express();

// --- CONFIGURAÇÃO DE MIDDLEWARES (UMA ÚNICA VEZ) ---
app.use(cors()); // Libera o acesso para o seu Frontend (Live Server)
app.use(express.json());
app.use(bodyParser.json());

/* ________________________ FUNÇÕES DE VALIDAÇÃO (TOP) ______________________________ */

function validarCPF(cpf) {
    if (!cpf) return false;
    const cpfLimpo = cpf.replace(/[^\d]+/g, '');
    if (cpfLimpo.length !== 11 || !!cpfLimpo.match(/(\d)\1{10}/)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpfLimpo.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    return resto === parseInt(cpfLimpo.substring(10, 11));
}

// VALIDAÇÃO DE SENHA FORTE
function validarSenha(senha) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(senha);
}

// VALIDAÇÃO DE E-MAIL
function validarEmail(email) {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// VALIDAÇÃO DE TELEFONE
function validarTelefone(tel) {
    if (!tel) return false;
    const telLimpo = tel.replace(/\D/g, ''); 
    return telLimpo.length >= 10 && telLimpo.length <= 11;
}

// ==========================================
// 1. ROTA DE CADASTRO 
// ==========================================
app.post('/registrar', (req, res) => {
    const { nome, cpf, tel, email, senha } = req.body;

    if (!validarCPF(cpf)) {
        return res.status(400).json({ message: "CPF inválido! Por favor, informe um CPF válido." });
    }
    if (!validarEmail(email)) {
        return res.status(400).json({ message: "E-mail inválido! Use o formato: nome@email.com" });
    }
    if (!validarTelefone(tel)) {
        return res.status(400).json({ message: "Telefone inválido! Digite o DDD + número." });
    }
    if (!validarSenha(senha)) {
        return res.status(400).json({ 
            message: "A senha não atende aos requisitos de segurança: Mínimo de 8 caracteres, contendo letras maiúsculas, minúsculas, números e au menos um símbolo especial (@, #, $, etc.)."
        });
    }

    const sql = 'INSERT INTO clientes (nome, cpf, telefone, email, senha) VALUES (?, ?, ?, ?, ?)';
    
    db.query(sql, [nome, cpf, tel, email, senha], (err, result) => {
        if (err) {
            console.error("Erro detalhado no banco:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                const sqlMsg = err.sqlMessage.toLowerCase();
                if (sqlMsg.includes('email')) {
                    return res.status(400).json({ message: "Este e-mail já está cadastrado! Use outro ou faça login." });
                }
                if (sqlMsg.includes('cpf')) {
                    return res.status(400).json({ message: "Este CPF já está cadastrado em nosso sistema." });
                }
                if (sqlMsg.includes('telefone') || sqlMsg.includes('tel')) {
                    return res.status(400).json({ message: "Este número de telefone já está cadastrado." });
                }
                return res.status(400).json({ message: "Dados duplicados (CPF, E-mail ou Telefone) já constam no sistema." });
            }
            return res.status(500).json({ message: "Erro interno no servidor ao cadastrar." });
        }
        res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
    });
});

// ==========================================
// 2. ROTA DE LOGIN (VERSÃO BLINDADA)
// ==========================================
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const emailLower = email.toLowerCase().trim();

    // ADICIONADO: AND status = 'Ativo' na query dos barbeiros
    const sqlBarbeiro = "SELECT id, nome, email, cargo, senha FROM barbeiros WHERE LOWER(email) = ? AND senha = ? AND status = 'Ativo'";
    
    db.query(sqlBarbeiro, [emailLower, senha], (err, resultsBarbeiro) => {
        if (resultsBarbeiro && resultsBarbeiro.length > 0) {
            return res.status(200).json({ success: true, user: resultsBarbeiro[0] });
        }

        // Se não for barbeiro ATIVO, busca em clientes
        const sqlCliente = "SELECT id, nome, email, 'Cliente' as cargo, senha FROM clientes WHERE LOWER(email) = ? AND senha = ?";
        db.query(sqlCliente, [emailLower, senha], (err, resultsCliente) => {
            if (resultsCliente && resultsCliente.length > 0) {
                return res.status(200).json({ success: true, user: resultsCliente[0] });
            }

            res.status(401).json({ message: "E-mail ou senha incorretos ou usuário inativo." });
        });
    });
});
// ==========================================
// 3. ROTA: SOLICITAR RECUPERAÇÃO (CORRIGIDA)
// ==========================================
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    db.query('SELECT * FROM clientes WHERE LOWER(email) = LOWER(?)', [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro no servidor" });
        if (results.length === 0) return res.status(404).json({ message: "E-mail não encontrado" });

        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); 

        db.query('UPDATE clientes SET reset_token = ?, reset_expires = ? WHERE email = ?', 
        [token, expires, results[0].email], (err) => {
            if (err) return res.status(500).json({ message: "Erro ao salvar token" });

            // 🔄 Atualizado para porta 587 para evitar bloqueio de rede local/Firewall
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: results[0].email,
                subject: 'Recuperação de Senha - MB Barber Shop',
                html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <h1>Recuperação de Senha</h1>
                        <p>Você solicitou a redefinição de senha para sua conta na MB Barber Shop.</p>
                        <p>Clique no botão abaixo para redefinir (válido por 1 hora):</p>
                        <a href="http://127.0.0.1:5500/HTML/redefinir.html?token=${token}"
                           style="background-color: #f17a12; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                             Redefinir Senha
                        </a>
                    </div>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("❌ ERRO DO NODEMAILER NO TERMINAL:", error);
                    return res.status(500).json({ message: "Erro ao enviar e-mail. Verifique sua senha de app." });
                }
                res.status(200).json({ message: "E-mail enviado!" });
            });
        });
    });
});

// ==========================================
// 4. ROTA: ATUALIZAR A SENHA (VERSÃO FINAL)
// ==========================================
app.post('/update-password', (req, res) => {
    const { token, novaSenha } = req.body;

    // 1. Buscamos pelo token e verificamos se ele ainda é válido (não expirou)
    db.query('SELECT id FROM clientes WHERE reset_token = ? AND reset_expires > NOW()', [token], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro no banco de dados" });
        
        // Se o token não existe ou já foi usado (limpo), results.length será 0
        if (results.length === 0) {
            return res.status(400).json({ message: "Token inválido ou já utilizado!" });
        }

        const clienteId = results[0].id; // Pegamos o ID do cliente encontrado

        // 2. Atualizamos a senha e JÁ LIMPA O TOKEN (isso invalida o link automaticamente)
        const updateSql = 'UPDATE clientes SET senha = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?';
        
        db.query(updateSql, [novaSenha, clienteId], (err) => {
            if (err) {
                console.error("Erro no update:", err);
                return res.status(500).json({ message: "Erro ao atualizar senha no banco" });
            }
            
            // Sucesso! O usuário não conseguirá usar esse mesmo link novamente.
            res.status(200).json({ message: "Senha atualizada com sucesso!" });
        });
    });
});

// =======================================================
// ✨ ROTA: LISTAR BARBEIROS
// =======================================================
app.get('/barbeiros', (req, res) => {
    db.query('SELECT id, nome FROM barbeiros WHERE status = "Ativo" ORDER BY nome ASC', (err, results) => {
        if (err) return res.status(500).json({ message: "Erro ao buscar barbeiros" });
        res.json(results);
    });
});

// =======================================================
// ✨ ROTA: LISTAR SERVIÇOS DO BANCO
// =======================================================
app.get('/servicos', (req, res) => {
    db.query('SELECT id_servicos, nome, preco FROM servicos ORDER BY nome ASC', (err, results) => {
        if (err) {
            console.error("Erro ao buscar serviços:", err);
            return res.status(500).json({ message: "Erro ao buscar serviços do catálogo." });
        }
        res.json(results);
    });
});

// =======================================================
// ROTA: ALTERAR PREÇO DE SERVIÇO - ADMIN
// =======================================================

app.put('/admin/servicos/:id', (req, res) => {
    const { id } = req.params;
    const { preco, adminNome } = req.body;

    // Validação do preço
    if (preco === undefined || preco === null || preco === '' || isNaN(Number(preco))) {
        return res.status(400).json({
            message: "Informe um preço válido."
        });
    }

    const novoPreco = Number(preco);

    if (novoPreco < 0) {
        return res.status(400).json({
            message: "O preço não pode ser negativo."
        });
    }

    // 1. Busca o serviço atual para registrar no log
    const sqlBusca = `
        SELECT id_servicos, nome, preco
        FROM servicos
        WHERE id_servicos = ?
    `;

    db.query(sqlBusca, [id], (err, results) => {
        if (err) {
            console.error("Erro ao buscar serviço:", err);
            return res.status(500).json({
                message: "Erro ao buscar o serviço."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Serviço não encontrado."
            });
        }

        const servico = results[0];

        // 2. Atualiza somente o preço
        const sqlUpdate = `
            UPDATE servicos
            SET preco = ?
            WHERE id_servicos = ?
        `;

        db.query(sqlUpdate, [novoPreco, id], (err) => {
            if (err) {
                console.error("Erro ao atualizar preço:", err);
                return res.status(500).json({
                    message: "Erro ao atualizar o preço do serviço."
                });
            }

            // 3. Registra a alteração nos logs
            const nomeAdmin = adminNome || "Administrador";

            registrarLog(
                nomeAdmin,
                "ALTERAÇÃO DE SERVIÇO",
                `Serviço: ${servico.nome} | Preço anterior: R$ ${Number(servico.preco).toFixed(2)} | Novo preço: R$ ${novoPreco.toFixed(2)}`
            );

            res.json({
                success: true,
                message: "Preço do serviço atualizado com sucesso!"
            });
        });
    });
});

// ==========================================
// 5. ROTA DE AGENDAMENTO
// ==========================================

app.post('/agendar', (req, res) => {
    const { cliente_id, data, horario, barbeiro_id, servico, servico_id, valor_servico } = req.body;

    const checkSql = `
        SELECT id
        FROM agendamentos
        WHERE data_agendamento = ?
        AND horario = ?
        AND barbeiro_id = ?
        AND status != "Cancelado"
    `;

    db.query(checkSql, [data, horario, barbeiro_id], (err, results) => {
        if (err) {
            console.error("Erro na verificação:", err);
            return res.status(400).json({ error: err.message });
        }

        if (results.length > 0) {
            return res.status(400).json({
                message: "Este horário já está reservado com este barbeiro!"
            });
        }

        function salvarAgendamento(idServico) {
            const sqlInsert = `
                INSERT INTO agendamentos
                (cliente_id, data_agendamento, horario, barbeiro_id, servico_id, valor_servico, status)
                VALUES (?, ?, ?, ?, ?, ?, "Pendente")
            `;

            db.query(
                sqlInsert,
                [cliente_id, data, horario, barbeiro_id, idServico, valor_servico],
                (err, result) => {
                    if (err) {
                        console.error("Erro no INSERT:", err);
                        return res.status(400).json({ error: err.message });
                    }

                    res.json({
                        success: true,
                        message: "Agendado com sucesso!"
                    });
                }
            );
        }

        // Se o frontend já enviar o ID do serviço
        if (servico_id) {
            salvarAgendamento(servico_id);
            return;
        }

        // Se o frontend enviar o nome do serviço
        if (servico) {
            const sqlServico = `
                SELECT id_servicos
                FROM servicos
                WHERE nome = ?
                LIMIT 1
            `;

            db.query(sqlServico, [servico], (err, resultadosServico) => {
                if (err) {
                    console.error("Erro ao buscar serviço:", err);
                    return res.status(500).json({
                        error: "Erro ao buscar o serviço."
                    });
                }

                if (resultadosServico.length === 0) {
                    return res.status(400).json({
                        message: "Serviço não encontrado."
                    });
                }

                const idServico = resultadosServico[0].id_servicos;

                salvarAgendamento(idServico);
            });

            return;
        }

        return res.status(400).json({
            message: "Serviço não informado."
        });
    });
});

// ==========================================
// 6. ROTAS ADMINISTRATIVAS - AGENDAMENTOS
// ==========================================

app.get('/admin/agendamentos', (req, res) => {
    const { inicio, fim, barbeiro, servico, cliente_id } = req.query;

    let sql = `
        SELECT
            a.id,
            a.cliente_id,
            a.data_agendamento,
            a.data_criacao,
            a.horario,
            a.barbeiro_id,
            a.servico_id,
            s.nome AS servico,
            a.valor_servico,
            a.status,
            c.nome AS nome_cliente,
            b.nome AS nome_barbeiro
        FROM agendamentos a
        INNER JOIN clientes c ON a.cliente_id = c.id
        INNER JOIN barbeiros b ON a.barbeiro_id = b.id
        LEFT JOIN servicos s ON a.servico_id = s.id_servicos
        WHERE 1=1
    `;

    const params = [];

    if (cliente_id) {
        sql += ' AND a.cliente_id = ?';
        params.push(cliente_id);
    }

    if (inicio && fim) {
        sql += ' AND a.data_agendamento BETWEEN ? AND ?';
        params.push(inicio, fim);
    } else if (inicio) {
        sql += ' AND a.data_agendamento = ?';
        params.push(inicio);
    }

    if (barbeiro && barbeiro !== 'todos') {
        sql += ' AND a.barbeiro_id = ?';
        params.push(barbeiro);
    }

    if (servico && servico !== 'todos') {
        sql += ' AND a.servico_id = ?';
        params.push(servico);
    }

    sql += ' ORDER BY a.data_agendamento DESC, a.horario ASC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Erro na busca administrativa:", err);
            return res.status(500).json(err);
        }

        res.json(results);
    });
});

app.delete('/admin/excluir/:id', (req, res) => {
    const id = req.params.id;

    // 1. Busca os dados antes de excluir para registrar no log
    const sqlBusca = `
        SELECT
            c.nome AS nome_cliente,
            s.nome AS nome_servico
        FROM agendamentos a
        INNER JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id_servicos
        WHERE a.id = ?
    `;

    db.query(sqlBusca, [id], (err, results) => {
        if (err) {
            console.error("Erro ao buscar agendamento para exclusão:", err);

            return res.status(500).json({
                message: "Erro ao buscar o registro para exclusão."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Agendamento não encontrado."
            });
        }

        const cliente = results[0].nome_cliente;
        const servico = results[0].nome_servico || "N/A";

        // 2. Exclui o agendamento
        db.query(
            'DELETE FROM agendamentos WHERE id = ?',
            [id],
            (err) => {
                if (err) {
                    console.error("Erro ao excluir agendamento:", err);

                    return res.status(500).json({
                        message: "Erro ao excluir o agendamento."
                    });
                }

                // 3. Registra o log
                registrarLog(
                    "Administrador",
                    "EXCLUSÃO AGENDAMENTO",
                    `Cliente: ${cliente} | Serviço: ${servico} | Agendamento ID: ${id} removido.`
                );

                res.json({
                    success: true,
                    message: "Agendamento excluído com sucesso!"
                });
            }
        );
    });
});

app.put('/admin/status', (req, res) => {
    const { id, status, adminNome } = req.body;

    const autorDaAcao = adminNome ? adminNome : "Cliente (via sistema)";

    // 1. Busca o cliente e o serviço do agendamento para o log
    const sqlBusca = `
        SELECT
            c.nome AS nome_cliente,
            s.nome AS nome_servico
        FROM agendamentos a
        INNER JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id_servicos
        WHERE a.id = ?
    `;

    db.query(sqlBusca, [id], (err, results) => {

        if (err) {
            console.error("Erro ao buscar dados do agendamento para o log:", err);

            return res.status(500).json({
                message: "Erro ao buscar os dados do agendamento."
            });
        }

        const cliente = results.length > 0
            ? results[0].nome_cliente
            : "Desconhecido";

        const servico = results.length > 0
            ? results[0].nome_servico
            : "N/A";

        // 2. Atualiza o status
        db.query(
            'UPDATE agendamentos SET status = ? WHERE id = ?',
            [status, id],
            (err) => {

                if (err) {
                    console.error("Erro ao atualizar status:", err);

                    return res.status(500).json({
                        message: "Erro ao atualizar"
                    });
                }

                // 3. Registra o log
                registrarLog(
                    autorDaAcao,
                    'ALTERAÇÃO STATUS',
                    `Cliente: ${cliente} | Serviço: ${servico} | Novo Status: ${status}`
                );

                res.json({
                    success: true,
                    message: "Status atualizado com sucesso!"
                });
            }
        );
    });
});

app.get('/meus-agendamentos/:cliente_id', (req, res) => {
    const { cliente_id } = req.params;
    const sql = `SELECT a.*, b.nome AS nome_barbeiro 
                 FROM agendamentos a 
                 INNER JOIN barbeiros b ON a.barbeiro_id = b.id 
                 WHERE a.cliente_id = ? 
                 ORDER BY a.data_agendamento DESC`;
    
    db.query(sql, [cliente_id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/horarios-ocupados', (req, res) => {
    const { data, barbeiro } = req.query;

    const sql = 'SELECT horario FROM agendamentos WHERE data_agendamento = ? AND barbeiro_id = ? AND status != "Cancelado"';
    
    db.query(sql, [data, barbeiro], (err, results) => {
        if (err) return res.status(500).json(err);
        
        let ocupados = results.map(row => row.horario);
        
        // Se houver algum registro com "BLOQUEIO", retornamos todos os horários como ocupados
        if (ocupados.includes("BLOQUEIO")) {
            return res.json(["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]);
        }
        
        res.json(ocupados);
    });
});

app.post('/admin/bloquear', (req, res) => {
    const { barbeiro_id, data, horario, adminNome, adminId } = req.body;

    // 1. Verificamos se o admin tem permissão
    const checkAdminSql = 'SELECT cargo FROM barbeiros WHERE id = ?';
    db.query(checkAdminSql, [adminId], (err, results) => {
        if (err || results.length === 0 || results[0].cargo !== 'Admin') {
            return res.status(403).json({ message: "Acesso negado." });
        }

        // 2. Buscamos o NOME do barbeiro para o log
        db.query('SELECT nome FROM barbeiros WHERE id = ?', [barbeiro_id], (err, barResult) => {
            const nomeBarbeiro = barResult.length > 0 ? barResult[0].nome : "ID: " + barbeiro_id;

            // 3. Inserimos o bloqueio
            const sql = `INSERT INTO agendamentos (cliente_id, data_agendamento, horario, barbeiro_id, servico, valor_servico, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const values = [null, data, horario, Number(barbeiro_id), "Folga/Bloqueio", 0, "Bloqueado"];

            db.query(sql, values, (err, result) => {
                if (err) return res.status(500).json({ message: "Erro ao salvar bloqueio: " + err.message });
                
                // 4. Formata data e hora para o log (Forma segura sem alterar o dia)
                const [ano, mes, dia] = data.split('-'); 
                const dataFormatada = `${dia}/${mes}/${ano}`;
                const horaFormatada = horario.substring(0, 5);

                // 5. Registra o log formatado
                registrarLog(
                    adminNome || "Admin", 
                    'BLOQUEIO HORARIO', 
                    `${nomeBarbeiro} bloqueado em ${dataFormatada} às ${horaFormatada}`
                );
                
                res.status(200).json({ message: "Bloqueado com sucesso!" });
            });
        });
    });
});

// ROTA PARA LISTAR BLOQUEIOS (Com limpeza automática de vencidos e registro de log)
app.get('/bloqueios', (req, res) => {
    // 1. Busca os registros vencidos (data anterior a hoje)
    const sqlSelectVencidos = `SELECT b.nome as barbeiro_nome, a.data_agendamento, a.horario 
                              FROM agendamentos a 
                              JOIN barbeiros b ON a.barbeiro_id = b.id 
                              WHERE a.status = 'Bloqueado' AND a.data_agendamento < CURDATE()`;

    db.query(sqlSelectVencidos, (err, vencidos) => {
        if (err) {
            console.error("Erro na busca de vencidos:", err);
        } else if (vencidos && vencidos.length > 0) {
            // Processa logs um por um
            vencidos.forEach(v => {
                const dataFormatada = new Date(v.data_agendamento).toLocaleDateString('pt-BR');
                registrarLog("Sistema", "EXPIRAÇÃO BLOQUEIO", `${v.barbeiro_nome} teve bloqueio expirado em ${dataFormatada} às ${v.horario.substring(0,5)}`);
            });

            // Executa o DELETE separadamente para garantir que não trave
            db.query("DELETE FROM agendamentos WHERE status = 'Bloqueado' AND data_agendamento < CURDATE()", (err) => {
                if (err) console.error("Erro ao deletar vencidos:", err);
            });
        }

        // 2. Busca os bloqueios futuros
        const sql = `SELECT a.id, DATE_FORMAT(a.data_agendamento, '%d/%m/%Y') as data, 
                     TIME_FORMAT(a.horario, '%H:%i') as horario, b.nome as nome_barbeiro 
                     FROM agendamentos a 
                     JOIN barbeiros b ON a.barbeiro_id = b.id 
                     WHERE a.status = 'Bloqueado' AND a.data_agendamento >= CURDATE()
                     ORDER BY a.data_agendamento ASC, a.horario ASC`;
        
        db.query(sql, (err, results) => {
            if (err) return res.status(500).json({ error: "Erro ao buscar bloqueios" });
            res.json(results);
        });
    });
});

// ROTA PARA DELETAR BLOQUEIO (Com log de liberação corrigido)
app.delete('/bloqueios/:id', (req, res) => {
    const { id } = req.params;

    // Usamos JOIN para buscar o nome do barbeiro na tabela correta
    const selectSql = `
        SELECT b.nome as barbeiro_nome, a.data_agendamento, a.horario 
        FROM agendamentos a 
        JOIN barbeiros b ON a.barbeiro_id = b.id 
        WHERE a.id = ?`;

    db.query(selectSql, [id], (err, results) => {
        if (err) {
            console.error("Erro ao buscar bloqueio para log:", err);
            return res.status(500).json({ message: "Erro ao buscar bloqueio" });
        }
        
        if (results.length > 0) {
            const { barbeiro_nome, data_agendamento, horario } = results[0];
            
            // Realiza a deleção
            db.query('DELETE FROM agendamentos WHERE id = ? AND status = "Bloqueado"', [id], (err, result) => {
                if (err) {
                    console.error("Erro ao deletar bloqueio:", err);
                    return res.status(500).json({ message: "Erro ao deletar" });
                }

                const dataFormatada = new Date(data_agendamento).toLocaleDateString('pt-BR');
                const horaFormatada = horario.substring(0, 5);
                
                // CRIA O LOG DE LIBERAÇÃO
                registrarLog("Administrador", "LIBERAÇÃO DE HORÁRIO", `${barbeiro_nome} liberado em ${dataFormatada} às ${horaFormatada}`);
                
                res.json({ message: "Bloqueio removido com sucesso!" });
            });
        } else {
            res.status(404).json({ message: "Bloqueio não encontrado" });
        }
    });
});

app.get('/admin/logs', (req, res) => {
    // Buscamos exatamente as colunas que você tem na imagem
    const sql = "SELECT admin_usuario, acao, detalhes, DATE_FORMAT(data_log, '%d/%m/%Y %H:%i') as data_formatada FROM logs ORDER BY id DESC LIMIT 50";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erro na busca de logs:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ==========================================
// 7. LOGS SISTEMA
// ==========================================
function registrarLog(adminNome, acao, detalhes) {
    // Note que usamos NOW() e os nomes batem com a sua tabela
    const sql = "INSERT INTO logs (admin_usuario, acao, detalhes) VALUES (?, ?, ?)";
    
    db.query(sql, [adminNome, acao, detalhes], (err) => {
        if (err) {
            console.error("Erro ao gravar log no banco:", err);
        }
    });
}

// ==========================================
// 8. ROTA DE CONTATO (VIA NODEMAILER)
// ==========================================
app.post('/enviar-contato', (req, res) => {
    const { nome, email, mensagem } = req.body;

    const transporterContato = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,  
        to: process.env.EMAIL_USER,    
        replyTo: email,                   
        subject: `💈 Novo Feedback - ${nome}`,
        html: `
            <div style="font-family: sans-serif; background: #f4f4f4; padding: 20px; border-radius: 10px;">
                <h2 style="color: #fd6506;">MB Barber Shop - Novo Contato</h2>
                <p><strong>Nome do Cliente:</strong> ${nome}</p>
                <p><strong>E-mail de Retorno:</strong> ${email}</p>
                <hr style="border: 1px solid #ddd;">
                <p><strong>Mensagem Enviada:</strong></p>
                <p style="background: white; padding: 15px; border-radius: 5px;">${mensagem}</p>
            </div>
        `
    };

    transporterContato.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Erro ao enviar e-mail de contato:", error);
            return res.status(500).json({ message: "Erro ao enviar e-mail." });
        }
        res.json({ success: true, message: "E-mail enviado com sucesso!" });
    });
});

// ==========================================
// 9. CRIAS ACESSOS BARBEIROS
// ==========================================
// Listar todos os usuários da equipe
app.get('/equipe', (req, res) => {
    db.query('SELECT id, nome, email, status, cargo FROM barbeiros', (err, results) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar equipe" });
        res.json(results);
    });
});

app.put('/equipe/status/:id', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    // 1. Primeiro buscamos o nome do barbeiro usando o ID
    db.query('SELECT nome FROM barbeiros WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ error: "Erro ao buscar usuário" });
        }

        const nomeBarbeiro = results[0].nome;

        // 2. Agora executamos o UPDATE
        db.query('UPDATE barbeiros SET status = ? WHERE id = ?', [status, id], (err) => {
            if (err) return res.status(500).json({ error: "Erro ao atualizar status" });

            // 3. Registramos o log usando o NOME encontrado
            registrarLog(
                "Administrador", 
                "ALTERAÇÃO DE ACESSO", 
                `Usuário ${nomeBarbeiro} alterado para ${status}`
            );
            
            res.json({ success: true });
        });
    });
});

app.post('/equipe/criar', (req, res) => {
    const { nome, cpf, data_nascimento, email, telefone, cargo, senha } = req.body;
    
    const sql = `INSERT INTO barbeiros (nome, cpf, data_nascimento, email, telefone, cargo, senha, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Ativo')`;
    
    db.query(sql, [nome, cpf, data_nascimento, email, telefone, cargo, senha], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erro ao criar usuário" });
        }
        registrarLog("Administrador", "CRIAR USUÁRIO", `Novo ${cargo} criado: ${nome}`);
        res.json({ success: true });
    });
});

// ROTA PARA BUSCAR APENAS BARBEIROS ATIVOS
app.get('/barbeiros/ativos', (req, res) => {
    const sql = "SELECT id, nome FROM barbeiros WHERE cargo = 'Barbeiro' AND status = 'Ativo'";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar barbeiros" });
        res.json(results);
    });
});


// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
app.listen(3000, '0.0.0.0', () => {
    console.log("-----------------------------------------");
    console.log("🚀 Servidor MB Barber Shop Ativo!");
    console.log("📍 IP Local: http://localhost:3000");
    console.log("📧 E-mail de Contato Configurado");
    console.log("-----------------------------------------");
});