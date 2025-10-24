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

function cadastrar(razao, cnpj, emailEmpresa, telefone, tecnico, emailUser, senha, token) {
    console.log("Iniciando processo de cadastro completo...");

    var insertContato = `
        INSERT INTO tipo_contato (telefone, email)
        VALUES ('${telefone}', '${emailEmpresa}');
    `;

    return database.executar(insertContato)
        .then(function (resultadoContato) {
            var idTipoContato = resultadoContato.insertId;

            var insertEmpresa = `
                INSERT INTO empresa (razao_social, cnpj, status, fk_tipo_contato)
                VALUES ('${razao}', '${cnpj}', 1, ${idTipoContato});
            `;
            return database.executar(insertEmpresa);
        })
        .then(function (resultadoEmpresa) {
            var idEmpresa = resultadoEmpresa.insertId;

            var insertUsuario = `
                INSERT INTO usuario (nome, email, senha, fk_id_tipo_usuario, fk_empresa)
                VALUES ('${tecnico}', '${emailUser}', '${senha}', 2, ${idEmpresa});
            `;
            // guardamos idEmpresa no closure usando objeto
            return database.executar(insertUsuario).then(function (resultadoUsuario) {
                return { idEmpresa: idEmpresa, idUsuario: resultadoUsuario.insertId };
            });
        })
        .then(function (ids) {
            // IMPORTANTE: token aponta para o USUÁRIO (fk_id_usuario), conforme schema atual
            var insertToken = `
                INSERT INTO token_acesso (data_criacao, data_expiracao, ativo, token, fk_id_usuario)
                VALUES (NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 1, '${token}', ${ids.idUsuario});
            `;
            return database.executar(insertToken).then(function () {
                console.log("Cadastro concluído com sucesso!");
                return { mensagem: "Cadastro completo realizado com sucesso!", idUsuario: ids.idUsuario, idEmpresa: ids.idEmpresa };
            });
        })
        .catch(function (erro) {
            console.log("Erro ao cadastrar:", erro.sqlMessage || erro);
            throw erro;
        });
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

function cadastrarUser(nome, email, senha, tipo_user) {
    var instrucaoSql = `
      INSERT INTO usuario (nome, email, senha, fk_id_tipo_usuario, fk_empresa) VALUES 
      ('${nome}', '${email}', '${senha}', ${tipo_user}, 1);
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar,
    cadastrar,
    listarEmpresas, 
    cadastrarUser
};
