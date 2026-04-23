import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

interface TrialBalanceItem {
  account_id: number;
  code: string;
  name: string;
  account_type: string;
  sign: number;
  parent_account_id: number | null;
  debit_total: string;
  credit_total: string;
  balance: string;
}

export function ReportsPage() {
  const [items, setItems] = useState<TrialBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: TrialBalanceItem[] }>("/reports/trial-balance")
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">レポート</h1>
        <p className="text-muted-foreground">合計残高試算表</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">データがありません</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">コード</th>
                <th className="px-4 py-3 text-left text-sm font-medium">勘定科目</th>
                <th className="px-4 py-3 text-right text-sm font-medium">借方合計</th>
                <th className="px-4 py-3 text-right text-sm font-medium">貸方合計</th>
                <th className="px-4 py-3 text-right text-sm font-medium">残高</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.account_id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-mono">{item.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {Number(item.debit_total).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {Number(item.credit_total).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                    {Number(item.balance).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
