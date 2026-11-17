/**
 * scripts/generate-partners.mjs
 *
 * Sincroniza public/data/partners.json com a pasta public/assets/partners.
 *
 *  - Logo novo na pasta  -> entra no FIM da lista (nome automático, url vazia)
 *  - Logo que já estava  -> continua onde está, com o nome/url/ordem que você editou
 *  - Logo apagado        -> sai do JSON
 *
 * A ordem do JSON é a ordem na tela, então pode reordenar à vontade.
 *
 * Uso (na raiz do projeto):
 *   node scripts/generate-partners.mjs
 */

import fs from "fs";
import path from "path";

const PASTA = path.join(process.cwd(), "public", "assets", "partners");
const SAIDA = path.join(process.cwd(), "public", "data", "partners.json");
const EXTENSOES = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".avif"]);

if (!fs.existsSync(PASTA)) {
  console.error(`Pasta não encontrada: ${PASTA}`);
  process.exit(1);
}

let existentes = [];
if (fs.existsSync(SAIDA)) {
  try {
    existentes = JSON.parse(fs.readFileSync(SAIDA, "utf-8"));
  } catch {
    console.warn("partners.json existente está inválido — será recriado.");
  }
}

const logoDe = (arquivo) => `/assets/partners/${encodeURIComponent(arquivo)}`;

function nomeLegivel(arquivo) {
  return path
    .parse(arquivo).name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const arquivos = fs
  .readdirSync(PASTA)
  .filter((f) => EXTENSOES.has(path.extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

const logosNaPasta = new Set(arquivos.map(logoDe));
const jaListados = new Set(existentes.map((p) => p.logo));

// 1) o que já estava no JSON e ainda existe: mantém na mesma ordem
const mantidos = existentes.filter((p) => logosNaPasta.has(p.logo));

// 2) arquivos novos: entram no final
const novos = arquivos
  .filter((a) => !jaListados.has(logoDe(a)))
  .map((a) => ({ name: nomeLegivel(a), logo: logoDe(a), url: "" }));

const lista = [...mantidos, ...novos];

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, JSON.stringify(lista, null, 2) + "\n");

const removidos = existentes.length - mantidos.length;
const semLink = lista.filter((p) => !p.url).length;
console.log(
  `${lista.length} logos no JSON (${novos.length} novos, ${removidos} removidos, ${semLink} sem link).`
);
