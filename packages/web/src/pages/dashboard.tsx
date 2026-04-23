import { useMe } from "@/components/auth/auth-gate";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

interface DashboardStats {
  books: number | null;
  accounts: number | null;
  vouchers: number | null;
  counterparties: number | null;
}

export function DashboardPage() {
  const me = useMe();
  const [stats, setStats] = useState<DashboardStats>({
    books: null, accounts: null, vouchers: null, counterparties: null,
  });

  useEffect(() => {
    async function load() {
      const [books, accounts, vouchers, counterparties] = await Promise.all([
        api.get<{ data: unknown[] }>("/api/v1/books?limit=200").then(r => r.data.length).catch(() => null),
        api.get<{ data: unknown[] }>("/api/v1/books/1/accounts?limit=200").then(r => r.data.length).catch(() => null),
        api.get<{ data: unknown[] }>("/api/v1/vouchers?limit=200").then(r => r.data.length).catch(() => null),
        api.get<{ data: unknown[] }>("/api/v1/counterparties?limit=200").then(r => r.data.length).catch(() => null),
      ]);
      setStats({ books, accounts, vouchers, counterparties });
    }
    load();
  }, []);

  const fmt = (n: number | null) => n !== null ? String(n) : "--";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          ようこそ、{me.name}さん
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="帳簿" value={fmt(stats.books)} description="登録済み帳簿数" />
        <DashboardCard title="勘定科目" value={fmt(stats.accounts)} description="有効な科目数" />
        <DashboardCard title="伝票" value={fmt(stats.vouchers)} description="今月の伝票数" />
        <DashboardCard title="取引先" value={fmt(stats.counterparties)} description="登録済み取引先数" />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
