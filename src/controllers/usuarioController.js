var usuarioModel = require("../models/usuarioModel");
var aquarioModel = require("../models/aquarioModel");

function autenticar(req, res) {
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;

    if (email == undefined) {
        res.status(400).send("Seu email está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("Sua senha está indefinida!");
    } else {

        usuarioModel.autenticar(email, senha)
            .then(
                function (resultadoAutenticar) {
                    console.log(`\nResultados encontrados: ${resultadoAutenticar.length}`);
                    console.log(`Resultados: ${JSON.stringify(resultadoAutenticar)}`); // transforma JSON em String

                    if (resultadoAutenticar.length == 1) {
                        console.log(resultadoAutenticar);

                        // Ajuste mínimo:
                        // - Não chama mais aquarioModel (evita erro da tabela 'aquario')
                        // - Usa o alias id_usuario que vem do usuarioModel ajustado
                        // - Sempre retorna 200 com aquarios: [] para manter o front compatível
                        res.json({
                            id: resultadoAutenticar[0].id_usuario,
                            email: resultadoAutenticar[0].email,
                            nome: resultadoAutenticar[0].nome,
                            senha: resultadoAutenticar[0].senha,
                            aquarios: []
                        });

                    } else if (resultadoAutenticar.length == 0) {
                        res.status(403).send("Email e/ou senha inválido(s)");
                    } else {
                        res.status(403).send("Mais de um usuário com o mesmo login e senha!");
                    }
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log("\nHouve um erro ao realizar o login! Erro: ", erro.sqlMessage);
                    res.status(500).json(erro.sqlMessage);
                }
            );
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

    // Validações
    if (razao == undefined) {
        res.status(400).send("A razão social está undefined!");
    } else if (cnpj == undefined) {
        res.status(400).send("O CNPJ está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("A senha está undefined!");
    } else if (emailUser == undefined) {
        res.status(400).send("O e-mail do usuário está undefined!");
    } else if ((emailEmpresa == undefined || emailEmpresa.trim() === "") && 
               (telefone == undefined || telefone.trim() === "")) {
        res.status(400).send("É necessário preencher pelo menos o e-mail ou o telefone da empresa!");
    } else {
       usuarioModel.cadastrar(razao, cnpj, emailEmpresa, telefone, tecnico, emailUser, senha, token)
            .then(function (resultado) {
                res.json(resultado)
                
            })
            .catch(function (erro) {
                console.log(erro);
                console.log("\nHouve um erro ao realizar o cadastro! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

function listarEmpresas(req, res) {

    usuarioModel.listarEmpresas()
        .then(async resultado => {
            if (resultado.length > 0) {
                res.status(200).json(resultado)
                console.log('retorno das empresas', resultado[0].listarEmpresas)
            }
        })
}

module.exports = {
    autenticar,
    cadastrar, 
    listarEmpresas
}
