import { useMe } from "@/components/auth/auth-gate";

export function DashboardPage() {
  const me = useMe();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          ようこそ、{me.name}さん
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="帳簿" value="--" description="登録済み帳簿数" />
        <DashboardCard title="勘定科目" value="--" description="有効な科目数" />
        <DashboardCard title="伝票" value="--" description="今月の伝票数" />
        <DashboardCard title="取引先" value="--" description="登録済み取引先数" />
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
