var database = require("../database/config");

function autenticar(email, senha, token) {
    var instrucaoSql = `
        SELECT 
            u.id_usuario,
            u.nome,
            u.email,
            u.senha,
            e.id_empresa,
            e.razao_social,
            t.token
        FROM usuario AS u
        JOIN empresa AS e 
            ON u.fk_empresa = e.id_empresa
        JOIN token_acesso AS t 
            ON t.fk_id_usuario = u.id_usuario
        WHERE u.email = '${email}'
          AND u.senha = '${senha}'
          AND t.token = '${token}'
          AND t.ativo = 1
          AND t.data_expiracao > NOW()
        LIMIT 1;
    `;
    return database.executar(instrucaoSql);
}

//=========================== Models dashboard de Usuário adm (InfraFlow) ==========================================

async function cadastrar(razao, cnpj, emailEmpresa, telefone, tecnico, emailUser, senha, token) {
    console.log("Iniciando processo de cadastro completo...");

    try {
        let insertContato = `
            INSERT INTO tipo_contato (telefone, email)
            VALUES ('${telefone}', '${emailEmpresa}');
        `;
        let resultadoContato = await database.executar(insertContato);
        let idTipoContato = resultadoContato.insertId;

        let insertEmpresa = `
            INSERT INTO empresa (razao_social, cnpj, status, fk_tipo_contato)
            VALUES ('${razao}', '${cnpj}', 1, ${idTipoContato});
        `;
        let resultadoEmpresa = await database.executar(insertEmpresa);
        let idEmpresa = resultadoEmpresa.insertId;

        let insertUsuario = `
            INSERT INTO usuario (nome, email, senha, fk_id_tipo_usuario, fk_empresa)
            VALUES ('${tecnico}', '${emailUser}', '${senha}', 2, ${idEmpresa});
        `;
        let resultadoUsuario = await database.executar(insertUsuario);
        let idUsuario = resultadoUsuario.insertId;

        let insertToken = `
            INSERT INTO token_acesso (data_criacao, data_expiracao, ativo, token, fk_id_usuario)
            VALUES (NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 1, '${token}', ${idUsuario});
        `;
        await database.executar(insertToken);

        console.log("Cadastro concluído com sucesso!");
        return { mensagem: "Cadastro completo realizado com sucesso!", idUsuario: idUsuario }; 
    } catch (erro) {
        console.log("Erro ao cadastrar:", erro.sqlMessage || erro);
        throw erro;
    }
}

function listarEmpresas() {
    var instrucaoSql = `
        SELECT e.id_empresa, 
               e.razao_social, 
               e.cnpj,  
               u.nome, 
               CASE WHEN e.status = 1 THEN 'Ativo' ELSE 'Inativo' END AS status
          FROM empresa AS e
          JOIN usuario AS u 
            ON e.id_empresa = u.fk_empresa;
    `;
    return database.executar(instrucaoSql);
}

function pesquisarUser(pesquisa) {
    var instrucaoSql = `
        SELECT e.id_empresa, 
               e.razao_social, 
               e.cnpj,  
               u.nome, 
               CASE WHEN e.status = 1 THEN 'Ativo' ELSE 'Inativo' END AS status
          FROM empresa AS e
          JOIN usuario AS u 
            ON e.id_empresa = u.fk_empresa
         WHERE u.nome LIKE '${pesquisa}%';
    `;
    return database.executar(instrucaoSql);
}

//=========================== Models dashboard de Usuário comum ==========================================

function cadastrarUser(nome, email, senha, tipo_user) {
    var instrucaoSql = `
        INSERT INTO usuario (nome, email, senha, fk_id_tipo_usuario, fk_empresa)
        VALUES ('${nome}', '${email}', '${senha}', ${tipo_user}, 1);
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar,
    cadastrar,
    listarEmpresas,
    cadastrarUser,
    pesquisarUser
};
