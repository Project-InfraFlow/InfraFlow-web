DROP DATABASE IF EXISTS Infraflow;
CREATE DATABASE Infraflow;
USE Infraflow;

CREATE TABLE tipo_usuario (
    id_tipo_usuario INT NOT NULL AUTO_INCREMENT,
    permissao VARCHAR(45) CONSTRAINT chk_tipo_user CHECK (permissao IN ('administrador', 'comum')),
    descricao VARCHAR(45),
    CONSTRAINT pk_tipo_usuario PRIMARY KEY (id_tipo_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tipo_contato (
    id_tipo_contato INT NOT NULL AUTO_INCREMENT,
    telefone VARCHAR(20),
    email VARCHAR(255),
    CONSTRAINT pk_tipo_contato PRIMARY KEY (id_tipo_contato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE empresa (
    id_empresa INT NOT NULL AUTO_INCREMENT,
    razao_social VARCHAR(45),
    cnpj VARCHAR(14),
    status TINYINT,
    fk_tipo_contato INT,
    CONSTRAINT pk_empresa PRIMARY KEY (id_empresa),
    CONSTRAINT fk_tipo_contato FOREIGN KEY (fk_tipo_contato)
        REFERENCES tipo_contato(id_tipo_contato)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usuario (
    id_usuario INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(45),
    email VARCHAR(45),
    senha VARCHAR(45),
    fk_id_tipo_usuario INT NOT NULL,
    fk_empresa INT NOT NULL,
    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT fk_usuario_tipo_usuario FOREIGN KEY (fk_id_tipo_usuario)
        REFERENCES tipo_usuario(id_tipo_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_usuario_empresa FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE token_acesso (
    id_token_acesso INT NOT NULL AUTO_INCREMENT,
    data_criacao DATETIME,
    data_expiracao DATETIME,
    ativo TINYINT,
    token VARCHAR(6),
    fk_id_usuario INT NOT NULL,
    CONSTRAINT pk_token_acesso PRIMARY KEY (id_token_acesso),
    CONSTRAINT fk_token_acesso_usuario FOREIGN KEY (fk_id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE maquina (
    id_maquina INT NOT NULL AUTO_INCREMENT,
    nome_maquina VARCHAR(45),
    so VARCHAR(45),
    localizacao VARCHAR(45),
    km VARCHAR(45),
    fk_empresa_maquina INT,
    CONSTRAINT pk_maquina PRIMARY KEY (id_maquina),
    CONSTRAINT fk_empresa_maquina FOREIGN KEY (fk_empresa_maquina)
        REFERENCES empresa(id_empresa)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE componente (
    id_componente INT NOT NULL AUTO_INCREMENT,
    fk_id_maquina INT NOT NULL,
    nome_componente VARCHAR(45),
    unidade_de_medida VARCHAR(10),
    CONSTRAINT pk_componente PRIMARY KEY (id_componente),
    CONSTRAINT fk_componente_maquina FOREIGN KEY (fk_id_maquina)
        REFERENCES maquina(id_maquina)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE parametro_componente (
    id_parametro_componente INT NOT NULL AUTO_INCREMENT,
    fk_id_componente INT NOT NULL,
    nivel VARCHAR(45),
    min FLOAT,
    max FLOAT,
    CONSTRAINT pk_parametro_componente PRIMARY KEY (id_parametro_componente),
    CONSTRAINT fk_parametro_componente FOREIGN KEY (fk_id_componente)
        REFERENCES componente(id_componente)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE nucleo_cpu (
    id_nucleo INT NOT NULL AUTO_INCREMENT,
    fk_id_componente INT NOT NULL,
    fk_id_maquina INT NOT NULL,
    CONSTRAINT pk_nucleo_cpu PRIMARY KEY (id_nucleo),
    CONSTRAINT fk_nucleo_cpu_componente FOREIGN KEY (fk_id_componente)
        REFERENCES componente(id_componente)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_nucleo_cpu_maquina FOREIGN KEY (fk_id_maquina)
        REFERENCES maquina(id_maquina)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE leitura (
    id_leitura INT NOT NULL AUTO_INCREMENT,
    fk_id_componente INT NOT NULL,
    fk_id_maquina INT NOT NULL,
    dados FLOAT,
    data_hora_captura DATETIME,
    id_nucleo INT,
    CONSTRAINT pk_leitura PRIMARY KEY (id_leitura),
    CONSTRAINT fk_leitura_componente FOREIGN KEY (fk_id_componente)
        REFERENCES componente(id_componente)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_leitura_maquina FOREIGN KEY (fk_id_maquina)
        REFERENCES maquina(id_maquina)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_leitura_nucleo FOREIGN KEY (id_nucleo)
        REFERENCES nucleo_cpu(id_nucleo)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE parametro_alerta (
    id_parametro_alerta INT NOT NULL AUTO_INCREMENT,
    min FLOAT,
    max FLOAT,
    CONSTRAINT pk_parametro_alerta PRIMARY KEY (id_parametro_alerta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE alerta (
    id_alerta INT NOT NULL AUTO_INCREMENT,
    fk_id_leitura INT NOT NULL,
    fk_id_componente INT NOT NULL,
    fk_parametro_alerta INT NOT NULL,
    descricao VARCHAR(45),
    status_alerta TINYINT,
    CONSTRAINT pk_alerta PRIMARY KEY (id_alerta),
    CONSTRAINT fk_alerta_leitura FOREIGN KEY (fk_id_leitura)
        REFERENCES leitura(id_leitura)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_alerta_componente FOREIGN KEY (fk_id_componente)
        REFERENCES componente(id_componente)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_alerta_parametro FOREIGN KEY (fk_parametro_alerta)
        REFERENCES parametro_alerta(id_parametro_alerta)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- DADOS BÁSICOS
-- =========================
INSERT INTO tipo_usuario (permissao, descricao) VALUES
('administrador', 'acesso geral'),
('comum', 'acesso restrito');

-- =========================
-- DEMO: ECOVIAS COMPLETA
-- =========================
START TRANSACTION;

-- contato + empresa
INSERT INTO tipo_contato (telefone, email)
VALUES ('11 3333-2222', 'contato@ecovias.example.com');
SET @id_contato := LAST_INSERT_ID();

INSERT INTO empresa (razao_social, cnpj, status, fk_tipo_contato)
VALUES ('Ecovias Concessionária de Rodovias S.A.', '11223344556677', 1, @id_contato);
SET @id_emp := LAST_INSERT_ID();

-- usuário admin
SET @id_admin := (SELECT id_tipo_usuario FROM tipo_usuario WHERE permissao='administrador' LIMIT 1);

INSERT INTO usuario (nome, email, senha, fk_id_tipo_usuario, fk_empresa)
VALUES ('Admin Ecovias', 'teste@ecovias.com', '123456', @id_admin, @id_emp);
SET @id_user := LAST_INSERT_ID();

-- token simples (7 dias)
INSERT INTO token_acesso (data_criacao, data_expiracao, ativo, token, fk_id_usuario)
VALUES (NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 'ECV123', @id_user);

-- máquina
INSERT INTO maquina (nome_maquina, so, localizacao, km, fk_empresa_maquina)
VALUES ('ECV-APP-01', 'Ubuntu 22.04', 'SP - Tatuapé', 'KM 010', @id_emp);
SET @id_maq := LAST_INSERT_ID();

-- componentes
INSERT INTO componente (fk_id_maquina, nome_componente, unidade_de_medida) VALUES
(@id_maq, 'CPU', '%'),
(@id_maq, 'Memória RAM', '%'),
(@id_maq, 'Disco', '%'),
(@id_maq, 'Rede', '%');

SET @id_cpu  := (SELECT id_componente FROM componente WHERE fk_id_maquina=@id_maq AND nome_componente='CPU'          LIMIT 1);
SET @id_ram  := (SELECT id_componente FROM componente WHERE fk_id_maquina=@id_maq AND nome_componente='Memória RAM' LIMIT 1);
SET @id_disk := (SELECT id_componente FROM componente WHERE fk_id_maquina=@id_maq AND nome_componente='Disco'       LIMIT 1);
SET @id_net  := (SELECT id_componente FROM componente WHERE fk_id_maquina=@id_maq AND nome_componente='Rede'        LIMIT 1);

-- limites por componente
-- CPU: 20 / 20–70 / 70–85 / >85
INSERT INTO parametro_componente (fk_id_componente, nivel, min, max) VALUES
(@id_cpu,  'Mínimo Ideal',        20, 20),
(@id_cpu,  'Saudável',            20, 70),
(@id_cpu,  'Alta utilização',     70, 85),
(@id_cpu,  'Saturação (crítico)', 85, 100);

-- RAM: 40 / 40–75 / 75–85 / >85
INSERT INTO parametro_componente (fk_id_componente, nivel, min, max) VALUES
(@id_ram,  'Mínimo Ideal',        40, 40),
(@id_ram,  'Saudável',            40, 75),
(@id_ram,  'Alta utilização',     75, 85),
(@id_ram,  'Saturação (crítico)', 85, 100);

-- Disco: ≤60 / 80–90 / >90
INSERT INTO parametro_componente (fk_id_componente, nivel, min, max) VALUES
(@id_disk, 'Saudável',             0, 60),
(@id_disk, 'Alta utilização',     80, 90),
(@id_disk, 'Saturação (crítico)', 90, 100);

-- Rede: 30 / 30–70 / 70–85 / >85
INSERT INTO parametro_componente (fk_id_componente, nivel, min, max) VALUES
(@id_net,  'Mínimo Ideal',        30, 30),
(@id_net,  'Saudável',            30, 70),
(@id_net,  'Alta utilização',     70, 85),
(@id_net,  'Saturação (crítico)', 85, 100);

COMMIT;

-- =========================
-- CONSULTAS RÁPIDAS (apresentação)
-- =========================
-- credenciais criadas
SELECT
  u.id_usuario, u.nome, u.email,
  tu.permissao AS perfil,
  e.id_empresa, e.razao_social AS empresa, e.cnpj,
  ta.token, ta.ativo, ta.data_expiracao
FROM usuario u
JOIN tipo_usuario tu ON tu.id_tipo_usuario = u.fk_id_tipo_usuario
JOIN empresa e ON e.id_empresa = u.fk_empresa
LEFT JOIN token_acesso ta ON ta.fk_id_usuario = u.id_usuario
WHERE e.razao_social LIKE 'Ecovias%'
ORDER BY u.id_usuario DESC
LIMIT 1;

-- máquina + componentes + limites
SELECT m.id_maquina, m.nome_maquina, m.so, m.localizacao, m.km, e.razao_social AS empresa
FROM maquina m
JOIN empresa e ON e.id_empresa = m.fk_empresa_maquina
WHERE e.razao_social LIKE 'Ecovias%';

SELECT c.id_componente, c.nome_componente, c.unidade_de_medida
FROM componente c
JOIN maquina m ON m.id_maquina = c.fk_id_maquina
JOIN empresa e ON e.id_empresa = m.fk_empresa_maquina
WHERE e.razao_social LIKE 'Ecovias%'
ORDER BY c.id_componente;

SELECT c.nome_componente, p.nivel, p.min, p.max
FROM parametro_componente p
JOIN componente c ON c.id_componente = p.fk_id_componente
JOIN maquina m ON m.id_maquina = c.fk_id_maquina
JOIN empresa e ON e.id_empresa = m.fk_empresa_maquina
WHERE e.razao_social LIKE 'Ecovias%'
ORDER BY c.nome_componente, p.id_parametro_componente;

select * from usuario;
select * from empresa;

-- E-mail: teste@ecovias.com
-- Senha: 123456
-- Token: ECV123

-- INSERT DE EMPRESA

-- 1️⃣ Inserir tipo de contato (telefone e e-mail da empresa)
INSERT INTO tipo_contato (telefone, email)
VALUES ('(11) 4002-8922', 'contato@ecorodovias.com.br');


select * from tipo_contato;
-- suponha que o ID gerado foi 10
-- -------------------------------------------------------------

-- 2️⃣ Inserir empresa
INSERT INTO empresa (razao_social, cnpj, status, fk_tipo_contato)
VALUES ('Ecorodovias Concessionária de Rodovias S.A.', '12345678000199', 1, 1);

-- suponha que o ID gerado foi 5
-- -------------------------------------------------------------

select * from empresa; 

-- 3️⃣ Inserir usuário técnico responsável
INSERT INTO usuario (nome, email, senha, fk_id_tipo_usuario, fk_empresa)
VALUES ('Carlos Silva', 'carlos.silva@ecorodovias.com.br', 'senha123', 2, 4);

-- suponha que o ID gerado foi 7
-- -------------------------------------------------------------

-- 4️⃣ Inserir token de acesso vinculado à empresa
INSERT INTO token_acesso (data_criacao, data_expiracao, ativo, token, fk_id_empresa)
VALUES (NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 1, 'ABC123', 4);