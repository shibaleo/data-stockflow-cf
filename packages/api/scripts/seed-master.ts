import "dotenv/config";
import postgres from "postgres";

/**
 * Master seed: v1 seed-accounting.mjs の勘定科目体系を v4 スキーマに移植。
 * v4 では display_account, department, project, category は廃止。
 * 階層は parent_account_key で表現。
 */

const sql = postgres(process.env.DATABASE_URL!);

const USER_KEY = 1;
const ROLE_KEY = 1;
const H = "seed"; // placeholder hash

// ============================================================
// 1. Book: 一般帳簿 (JPY)
// ============================================================
const BOOK_KEY = 1;

await sql`
  INSERT INTO data_stockflow.book
    (key, revision, lines_hash, prev_revision_hash, revision_hash,
     created_by, code, name, unit, unit_symbol, unit_position,
     type_labels, authority_role_key, is_active)
  VALUES
    (${BOOK_KEY}, 1, ${H}, ${H}, ${H},
     ${USER_KEY}, 'general', '一般帳簿', '円', '¥', 'left',
     ${'{"asset":"資産","liability":"負債","equity":"純資産","revenue":"収益","expense":"費用"}'}::jsonb,
     ${ROLE_KEY}, true)
  ON CONFLICT DO NOTHING
`;
console.log("Book: 一般帳簿");

// ============================================================
// 2. Accounts — v1 の勘定科目体系を移植
// ============================================================
// key は code の数値部分をそのまま使う (1100, 1150, ...)
// parent_key は null なら親なし

type Acct = {
  key: number; code: string; name: string;
  type: string; classification: string | null;
  parent_key: number | null; sort: number;
};

const accounts: Acct[] = [
  // ── 資産 (asset) ──
  // 流動資産
  { key: 1100, code: "1100", name: "現金",             type: "asset", classification: "流動資産", parent_key: null, sort: 100 },

  { key: 1150, code: "1150", name: "電子マネー",       type: "asset", classification: "流動資産", parent_key: null, sort: 110 },
  { key: 1120, code: "1120", name: "モバイルSUICA",    type: "asset", classification: "流動資産", parent_key: 1150, sort: 111 },
  { key: 1130, code: "1130", name: "PAYPAY",           type: "asset", classification: "流動資産", parent_key: 1150, sort: 112 },
  { key: 1140, code: "1140", name: "PASMO",            type: "asset", classification: "流動資産", parent_key: 1150, sort: 113 },

  { key: 1200, code: "1200", name: "預金",             type: "asset", classification: "流動資産", parent_key: null, sort: 120 },
  { key: 1210, code: "1210", name: "八十二銀行",       type: "asset", classification: "流動資産", parent_key: 1200, sort: 121 },
  { key: 1220, code: "1220", name: "JRE銀行",          type: "asset", classification: "流動資産", parent_key: 1200, sort: 122 },

  { key: 1510, code: "1510", name: "預金（長期）",     type: "asset", classification: "固定資産", parent_key: 1200, sort: 151 },
  { key: 1511, code: "1511", name: "三菱UFJ",          type: "asset", classification: "固定資産", parent_key: 1510, sort: 1511 },
  { key: 1512, code: "1512", name: "ゆうちょ銀行",     type: "asset", classification: "固定資産", parent_key: 1510, sort: 1512 },
  { key: 1513, code: "1513", name: "楽天銀行",         type: "asset", classification: "固定資産", parent_key: 1510, sort: 1513 },
  { key: 1514, code: "1514", name: "三井住友",         type: "asset", classification: "固定資産", parent_key: 1510, sort: 1514 },

  { key: 1400, code: "1400", name: "プリペイド",       type: "asset", classification: "流動資産", parent_key: null, sort: 140 },
  { key: 1410, code: "1410", name: "スターバックスカード", type: "asset", classification: "流動資産", parent_key: 1400, sort: 141 },
  { key: 1420, code: "1420", name: "立石プリカ",       type: "asset", classification: "流動資産", parent_key: 1400, sort: 142 },

  { key: 1450, code: "1450", name: "前払費用",         type: "asset", classification: "流動資産", parent_key: null, sort: 145 },

  // 固定資産
  { key: 1520, code: "1520", name: "保証金・預け金",   type: "asset", classification: "固定資産", parent_key: null, sort: 152 },
  { key: 1521, code: "1521", name: "施設デポジット",   type: "asset", classification: "固定資産", parent_key: 1520, sort: 1521 },
  { key: 1522, code: "1522", name: "個人預け金",       type: "asset", classification: "固定資産", parent_key: 1520, sort: 1522 },

  // ── 負債 (liability) ──
  { key: 2100, code: "2100", name: "クレジットカード", type: "liability", classification: "流動負債", parent_key: null, sort: 200 },
  { key: 2110, code: "2110", name: "SUICA VIEW CARD",  type: "liability", classification: "流動負債", parent_key: 2100, sort: 211 },
  { key: 2120, code: "2120", name: "楽天 MASTERCARD",  type: "liability", classification: "流動負債", parent_key: 2100, sort: 212 },
  { key: 2130, code: "2130", name: "楽天 JCB",         type: "liability", classification: "流動負債", parent_key: 2100, sort: 213 },
  { key: 2140, code: "2140", name: "三井住友カード",   type: "liability", classification: "流動負債", parent_key: 2100, sort: 214 },
  { key: 2150, code: "2150", name: "メルカード",       type: "liability", classification: "流動負債", parent_key: 2100, sort: 215 },
  { key: 2160, code: "2160", name: "ヨドバシゴールドポイントカード", type: "liability", classification: "流動負債", parent_key: 2100, sort: 216 },

  { key: 2200, code: "2200", name: "未払費用",         type: "liability", classification: "流動負債", parent_key: null, sort: 220 },

  { key: 2510, code: "2510", name: "公的ローン",       type: "liability", classification: "固定負債", parent_key: null, sort: 251 },
  { key: 2511, code: "2511", name: "長野県学資ローン", type: "liability", classification: "固定負債", parent_key: 2510, sort: 2511 },
  { key: 2512, code: "2512", name: "日本学生支援機構学資ローン", type: "liability", classification: "固定負債", parent_key: 2510, sort: 2512 },

  { key: 2520, code: "2520", name: "私的ローン",       type: "liability", classification: "固定負債", parent_key: null, sort: 252 },
  { key: 2521, code: "2521", name: "CPA学費ローン",    type: "liability", classification: "固定負債", parent_key: 2520, sort: 2521 },
  { key: 2522, code: "2522", name: "矯正歯科ローン",   type: "liability", classification: "固定負債", parent_key: 2520, sort: 2522 },

  // ── 純資産 (equity) ──
  { key: 3000, code: "3000", name: "純資産",           type: "equity", classification: null, parent_key: null, sort: 300 },
  { key: 3100, code: "3100", name: "資本仮勘定",       type: "equity", classification: null, parent_key: 3000, sort: 310 },

  // ── 収益 (revenue) ──
  { key: 4100, code: "4100", name: "基本給",           type: "revenue", classification: "経常収益", parent_key: null, sort: 410 },
  { key: 4110, code: "4110", name: "残業手当",         type: "revenue", classification: "経常収益", parent_key: null, sort: 411 },
  { key: 4120, code: "4120", name: "通勤手当",         type: "revenue", classification: "経常収益", parent_key: null, sort: 412 },
  { key: 4130, code: "4130", name: "その他手当",       type: "revenue", classification: "経常収益", parent_key: null, sort: 413 },
  { key: 4510, code: "4510", name: "賞与",             type: "revenue", classification: "特別収益", parent_key: null, sort: 451 },
  { key: 4520, code: "4520", name: "雑収入",           type: "revenue", classification: "特別収益", parent_key: null, sort: 452 },

  // ── 費用 (expense) ──
  { key: 5000, code: "5000", name: "費用",             type: "expense", classification: null,     parent_key: null, sort: 500 },

  { key: 5110, code: "5110", name: "短期食糧",         type: "expense", classification: "変動費", parent_key: 5000, sort: 511 },
  { key: 5120, code: "5120", name: "長期食糧",         type: "expense", classification: "変動費", parent_key: 5000, sort: 512 },
  { key: 5130, code: "5130", name: "日用品",           type: "expense", classification: "変動費", parent_key: 5000, sort: 513 },
  { key: 5140, code: "5140", name: "被服費",           type: "expense", classification: "変動費", parent_key: 5000, sort: 514 },
  { key: 5150, code: "5150", name: "ガソリン",         type: "expense", classification: "変動費", parent_key: 5000, sort: 515 },

  { key: 5210, code: "5210", name: "車両保険",         type: "expense", classification: "固定費", parent_key: 5000, sort: 521 },
  { key: 5220, code: "5220", name: "火災保険",         type: "expense", classification: "固定費", parent_key: 5000, sort: 522 },
  { key: 5230, code: "5230", name: "教育・学習費",     type: "expense", classification: "変動費", parent_key: 5000, sort: 523 },

  { key: 5301, code: "5301", name: "インフラ",         type: "expense", classification: "固定費", parent_key: 5000, sort: 530 },
  { key: 5310, code: "5310", name: "家賃",             type: "expense", classification: "固定費", parent_key: 5301, sort: 5310 },
  { key: 5320, code: "5320", name: "電気",             type: "expense", classification: "固定費", parent_key: 5301, sort: 5320 },
  { key: 5330, code: "5330", name: "水道",             type: "expense", classification: "固定費", parent_key: 5301, sort: 5330 },
  { key: 5340, code: "5340", name: "ガス",             type: "expense", classification: "固定費", parent_key: 5301, sort: 5340 },
  { key: 5350, code: "5350", name: "モバイル通信",     type: "expense", classification: "固定費", parent_key: 5301, sort: 5350 },
  { key: 5360, code: "5360", name: "固定回線",         type: "expense", classification: "固定費", parent_key: 5301, sort: 5360 },

  { key: 5370, code: "5370", name: "外食費",           type: "expense", classification: "変動費", parent_key: 5000, sort: 537 },
  { key: 5380, code: "5380", name: "交通費",           type: "expense", classification: "変動費", parent_key: 5000, sort: 538 },
  { key: 5385, code: "5385", name: "駐車場代",         type: "expense", classification: "変動費", parent_key: 5000, sort: 5385 },
  { key: 5390, code: "5390", name: "交際費",           type: "expense", classification: "変動費", parent_key: 5000, sort: 539 },
  { key: 5391, code: "5391", name: "嗜好娯楽費",       type: "expense", classification: "変動費", parent_key: 5000, sort: 5391 },
  { key: 5392, code: "5392", name: "医療費",           type: "expense", classification: "変動費", parent_key: 5000, sort: 5392 },
  { key: 5393, code: "5393", name: "業務関連費",       type: "expense", classification: "変動費", parent_key: 5000, sort: 5393 },
  { key: 5395, code: "5395", name: "家族関連費",       type: "expense", classification: "変動費", parent_key: 5000, sort: 5395 },
  { key: 5396, code: "5396", name: "情報サービス",     type: "expense", classification: "固定費", parent_key: 5000, sort: 5396 },
  { key: 5397, code: "5397", name: "整容費",           type: "expense", classification: "変動費", parent_key: 5000, sort: 5397 },
  { key: 5398, code: "5398", name: "美容費",           type: "expense", classification: "変動費", parent_key: 5000, sort: 5398 },

  { key: 5410, code: "5410", name: "租税公課",         type: "expense", classification: "税金",   parent_key: 5000, sort: 541 },
  { key: 5411, code: "5411", name: "所得税",           type: "expense", classification: "税金",   parent_key: 5410, sort: 5411 },
  { key: 5412, code: "5412", name: "住民税",           type: "expense", classification: "税金",   parent_key: 5410, sort: 5412 },

  { key: 5420, code: "5420", name: "社会保険料",       type: "expense", classification: "税金",   parent_key: 5000, sort: 542 },
  { key: 5421, code: "5421", name: "健康保険料",       type: "expense", classification: "税金",   parent_key: 5420, sort: 5421 },
  { key: 5422, code: "5422", name: "厚生年金保険料",   type: "expense", classification: "税金",   parent_key: 5420, sort: 5422 },
  { key: 5423, code: "5423", name: "雇用保険料",       type: "expense", classification: "税金",   parent_key: 5420, sort: 5423 },

  { key: 5510, code: "5510", name: "雑損",             type: "expense", classification: "特別損失", parent_key: 5000, sort: 551 },
];

// Insert accounts — parent_key が先に存在する順番になっている
for (const a of accounts) {
  await sql`
    INSERT INTO data_stockflow.account
      (key, revision, lines_hash, prev_revision_hash, revision_hash,
       created_by, book_key, code, name, account_type, classification,
       parent_account_key, sort_order, authority_role_key, is_active)
    VALUES
      (${a.key}, 1, ${H}, ${H}, ${H},
       ${USER_KEY}, ${BOOK_KEY}, ${a.code}, ${a.name}, ${a.type}, ${a.classification},
       ${a.parent_key}, ${a.sort}, ${ROLE_KEY}, true)
    ON CONFLICT DO NOTHING
  `;
}
console.log(`Accounts: ${accounts.length} 科目`);

// ============================================================
// 3. Counterparty — v1 の「個人」+ 汎用取引先
// ============================================================

type CP = { key: number; code: string; name: string; type: string | null };
const counterparties: CP[] = [
  { key: 100, code: "self",       name: "個人",         type: null },
  { key: 101, code: "employer",   name: "勤務先",       type: "income" },
];

for (const cp of counterparties) {
  await sql`
    INSERT INTO data_stockflow.counterparty
      (key, revision, lines_hash, prev_revision_hash, revision_hash,
       created_by, code, name, type, authority_role_key, is_active)
    VALUES
      (${cp.key}, 1, ${H}, ${H}, ${H},
       ${USER_KEY}, ${cp.code}, ${cp.name}, ${cp.type}, ${ROLE_KEY}, true)
    ON CONFLICT DO NOTHING
  `;
}
console.log(`Counterparties: ${counterparties.length} 取引先`);

// ============================================================
// Verify
// ============================================================

const bookCount = await sql`SELECT count(*) as cnt FROM data_stockflow.current_book`;
const accountCount = await sql`SELECT count(*) as cnt FROM data_stockflow.current_account`;
const cpCount = await sql`SELECT count(*) as cnt FROM data_stockflow.current_counterparty`;

console.log(`\nVerification:`);
console.log(`  Books: ${bookCount[0].cnt}`);
console.log(`  Accounts: ${accountCount[0].cnt}`);
console.log(`  Counterparties: ${cpCount[0].cnt}`);

await sql.end();
console.log("\nMaster seed complete.");
