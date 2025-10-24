var mysql = require("mysql2");
require("dotenv").config(); 

var mySqlConfig = {
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_DATABASE || process.env.DB_NAME || "Infraflow",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
  port: Number(process.env.DB_PORT || 3306)
};

function executar(instrucao) {
  if (
    process.env.AMBIENTE_PROCESSO !== "producao" &&
    process.env.AMBIENTE_PROCESSO !== "desenvolvimento"
  ) {
    console.log(
      "\nO AMBIENTE (produção OU desenvolvimento) NÃO FOI DEFINIDO EM .env OU dev.env OU app.js\n"
    );
    return Promise.reject("AMBIENTE NÃO CONFIGURADO EM .env");
  }

  return new Promise(function (resolve, reject) {
    var conexao = mysql.createConnection(mySqlConfig);

    conexao.connect(function (err) {
      if (err) {
        console.error("ERRO AO CONECTAR NO MYSQL:", err.message);
        return reject(err);
      }

      conexao.query(instrucao, function (erro, resultados) {
        conexao.end();
        if (erro) {
          console.error("ERRO NA QUERY:", erro.sqlMessage || erro.message || erro);
          return reject(erro);
        }
        resolve(resultados);
      });
    });

    conexao.on("error", function (erro) {
      console.error("ERRO NO MySQL SERVER:", erro.sqlMessage || erro.message || erro);
    });
  });
}

module.exports = { executar };
