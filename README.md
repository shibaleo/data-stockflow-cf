# data-stockflow-cf

個人向け複式簿記アプリ。[data-stockflow](../data-stockflow) の再構築版。

## Why: Next.js on Vercel からの移行理由

### 既存構成 (data-stockflow)

```
Next.js (App Router)
  ├── Frontend (RSC + Client Components)
  ├── API (Route Handler → Hono)
  └── Vercel にデプロイ (一体型)
```

Next.js + Vercel は「全部入り」で立ち上げは速いが、以下の問題が顕在化した:

**1. Vercel の実行モデルと会計処理の相性が悪い**

- Vercel の Serverless Functions はリクエストごとにコールドスタートする可能性がある
- 会計処理はハッシュチェーン計算、トランザクション内での複数INSERT、伝票カスケード更新など**ステートフルで重い**
- 個人利用で頻度が低いため、ほぼ毎回コールドスタートを踏む
- 結果: UIが体感的に遅い

**2. Next.js の抽象化が邪魔になる**

- API 層は既に Hono で書いている。Next.js の Route Handler は Hono へのブリッジにすぎない
- RSC / Server Actions / App Router のメンタルモデルが会計アプリの CRUD に合わない
- ビルドが遅い。`next build` がフロントもAPIも一括でビルドする
- Next.js のバージョンアップに振り回される (App Router の breaking changes)

**3. フロントとAPIのライフサイクルが違う**

- API: スキーマ変更時にのみデプロイ。安定したら触らない
- Frontend: UIの調整で頻繁にデプロイ
- 一体型だと、CSS を1行変えるだけでAPIも再デプロイされる

### 新構成 (data-stockflow-cf)

```
CF Pages (SPA)          Koyeb (API Server)
  React + Vite            Hono + Node.js
  静的配信 (CDN)           常駐プロセス
  UIだけデプロイ           APIだけデプロイ
       │                       │
       └───── fetch ───────────┘
                                │
                          Supabase PG
```

**なぜこの構成が良いのか:**

| 課題                     | Next.js on Vercel        | Vite SPA + Hono on Koyeb       |
| ------------------------ | ------------------------ | ------------------------------ |
| コールドスタート         | 毎回発生しうる           | 常駐プロセスなので発生しない   |
| API の実行モデル         | Serverless (stateless)   | Long-running server (常駐)     |
| デプロイの独立性         | 一体型                   | フロント/API を個別にデプロイ  |
| ビルド速度               | next build (重い)        | Vite (秒単位) + esbuild (秒単位)|
| フレームワーク依存       | Next.js に強依存         | Hono (軽量、ポータブル)        |
| ホスティングロックイン   | Vercel に最適化          | どこでも動く                   |
| 月額コスト               | 無料枠内                 | 無料枠内 (CF Pages + Koyeb)   |

**トレードオフ:**

- インフラの構成要素が増える (CF Pages, Koyeb, Supabase, Clerk = 4サービス)
- Koyeb free tier のスリープ対策に CF Worker cron ping が必要
- SSR がなくなる — ただし現行の Next.js 版も実態はほぼ `"use client"` のインタラクティブ CRUD であり、RSC/SSR の恩恵をほとんど受けていない。個人利用で SEO も不要なため、SPA で問題ない

## Project Structure

```
data-stockflow-cf/
├── docs/
│   ├── architecture.md    # システム構成詳細
│   ├── schema.md          # DB スキーマ定義 (v4)
│   └── migration-plan.md  # 移行計画
├── packages/
│   ├── api/               # Hono API server (Koyeb)
│   ├── web/               # React SPA (CF Pages)
│   └── shared/            # 共通型定義, Zod schemas
└── README.md
```

## Related Repositories

- [data-stockflow](../data-stockflow) — 移行元 (Next.js on Vercel)
- [data-drills-cf](../data-drills-cf) — 問題演習アプリ (同じ技術スタック)
