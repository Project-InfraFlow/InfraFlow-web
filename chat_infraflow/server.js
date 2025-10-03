import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// --- MySQL ---
const pool = await mysql.createPool({
  host: "localhost",
  user: "root",
  password: "8880",
  database: "chat_suporte"
});

app.get("/mensagens", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM mensagens ORDER BY id ASC");
  res.json(rows);
});

app.post("/mensagens", async (req, res) => {
  const { papel, texto } = req.body || {};
  if (!papel || !texto) return res.status(400).json({ erro: "faltou dados" });
  const [r] = await pool.query(
    "INSERT INTO mensagens (papel, texto) VALUES (?, ?)",
    [papel, texto]
  );
  res.json({ id: r.insertId });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
