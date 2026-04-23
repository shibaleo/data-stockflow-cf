import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Book {
  id: number;
  name: string;
  type: string | null;
  fiscal_year_start: string;
  is_active: boolean;
}

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Book[] }>("/books")
      .then((res) => setBooks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">帳簿</h1>
          <p className="text-muted-foreground">帳簿の一覧と管理</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : books.length === 0 ? (
        <p className="text-muted-foreground">帳簿がありません</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">名前</th>
                <th className="px-4 py-3 text-left text-sm font-medium">種別</th>
                <th className="px-4 py-3 text-left text-sm font-medium">期首</th>
                <th className="px-4 py-3 text-left text-sm font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{book.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{book.type ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{book.fiscal_year_start}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={book.is_active ? "text-green-400" : "text-red-400"}>
                      {book.is_active ? "有効" : "無効"}
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
