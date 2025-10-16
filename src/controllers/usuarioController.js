var usuarioModel = require("../models/usuarioModel");
var aquarioModel = require("../models/aquarioModel");

function autenticar(req, res) {
    var email = (req.body && (req.body.email || req.body.emailServer)) ? String(req.body.email || req.body.emailServer).trim() : undefined;
    var senha = (req.body && (req.body.senha || req.body.senhaServer)) ? req.body.senha || req.body.senhaServer : undefined;
    var token = (req.body && (req.body.token || req.body.tokenServer)) ? req.body.token || req.body.tokenServer : undefined;

    if (email == undefined || email === "") {
        res.status(400).send("Seu email está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("Sua senha está indefinida!");
    } else if (token == undefined) {
        res.status(400).send("Seu token está undefined!");
    } else {
        usuarioModel.autenticar(email, senha, token)
            .then(function (resultadoAutenticar) {
                if (Array.isArray(resultadoAutenticar) && resultadoAutenticar.length == 1) {
                    res.json({
                        id: resultadoAutenticar[0].id_usuario,
                        email: resultadoAutenticar[0].email,
                        nome: resultadoAutenticar[0].nome,
                        token: resultadoAutenticar[0].token,
                        aquarios: []
                    });
                } else if (Array.isArray(resultadoAutenticar) && resultadoAutenticar.length == 0) {
                    res.status(403).send("Email ou senha ou token inválido(s)");
                } else {
                    res.status(403).send("Mais de um usuário com o mesmo login e senha!");
                }
            })
            .catch(function (erro) {
                res.status(500).json(erro.sqlMessage || "Erro interno ao autenticar");
            });
    }
}

function cadastrar(req, res) {
    var razao = req.body.razaoServer;
    var cnpj = req.body.CNPJServer;
    var emailEmpresa = req.body.emailEmpresaServer;
    var telefone = req.body.telefoneServer;
    var tecnico = req.body.tecnicoServer; 
    var emailUser = req.body.emailUserServer;
    var senha = req.body.senhaServer;
    var token = req.body.tokenServer; 

    if (razao == undefined) {
        res.status(400).send("A razão social está undefined!");
    } else if (cnpj == undefined) {
        res.status(400).send("O CNPJ está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("A senha está undefined!");
    } else if (emailUser == undefined) {
        res.status(400).send("O e-mail do usuário está undefined!");
    } else if ((emailEmpresa == undefined || String(emailEmpresa).trim() === "") && 
               (telefone == undefined || String(telefone).trim() === "")) {
        res.status(400).send("É necessário preencher pelo menos o e-mail ou o telefone da empresa!");
    } else {
       usuarioModel.cadastrar(razao, cnpj, emailEmpresa, telefone, tecnico, emailUser, senha, token)
            .then(function (resultado) {
                res.json(resultado)
            })
            .catch(function (erro) {
                res.status(500).json(erro.sqlMessage || "Erro interno ao cadastrar");
            });
    }
}

function listarEmpresas(req, res) {
    usuarioModel.listarEmpresas()
        .then(async resultado => {
            if (resultado.length > 0) {
                res.status(200).json(resultado)
            }
        })
}

module.exports = {
    autenticar,
    cadastrar, 
    listarEmpresas
}
