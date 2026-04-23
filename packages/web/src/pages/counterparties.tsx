import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Counterparty {
  id: number;
  name: string;
  type: string | null;
  is_active: boolean;
}

export function CounterpartiesPage() {
  const [items, setItems] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Counterparty[] }>("/counterparties")
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">取引先</h1>
          <p className="text-muted-foreground">取引先の一覧と管理</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">取引先がありません</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">名前</th>
                <th className="px-4 py-3 text-left text-sm font-medium">種別</th>
                <th className="px-4 py-3 text-left text-sm font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cp) => (
                <tr key={cp.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{cp.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{cp.type ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={cp.is_active ? "text-green-400" : "text-red-400"}>
                      {cp.is_active ? "有効" : "無効"}
                    </span>
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
