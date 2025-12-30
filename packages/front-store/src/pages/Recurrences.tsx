import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  deleteRecurrence,
  listRecurrences,
  Recurrence,
  updateRecurrence,
} from "@/lib/medusa";

const frequencyLabels: Record<Recurrence["frequency"], string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const paymentLabels: Record<Recurrence["payment_method"], string> = {
  credit: "Cartão",
  pix: "PIX",
  boleto: "Boleto",
};

const Recurrences = () => {
  const { data: recurrenceData, refetch: refetchRecurrences } = useQuery({
    queryKey: ["recurrences"],
    queryFn: listRecurrences,
  });

  const recurrences = recurrenceData?.recurrences || [];

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  const toggleStatus = async (recurrence: Recurrence) => {
    const nextStatus = recurrence.status === "active" ? "paused" : "active";
    try {
      await updateRecurrence(recurrence.id, { status: nextStatus });
      await refetchRecurrences();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error?.message || "Não foi possível atualizar a recorrência.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (recurrence: Recurrence) => {
    try {
      await deleteRecurrence(recurrence.id);
      await refetchRecurrences();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error?.message || "Não foi possível remover a recorrência.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Compras Recorrentes</h1>
        <p className="text-muted-foreground mt-1">
          Agende compras semanais, quinzenais ou mensais para o condomínio.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Recorrências ativas</h2>
        <Card className="border-2">
          <CardContent className="p-6 text-muted-foreground">
            Para criar uma recorrência, faça sua seleção na tela de produtos e marque
            a compra como recorrente no checkout ou nos pedidos.
          </CardContent>
        </Card>
        {recurrences.length === 0 && (
          <Card className="border-2">
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma recorrência criada.
            </CardContent>
          </Card>
        )}
        {recurrences.map((recurrence) => (
          <Card key={recurrence.id} className="border-2">
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg">{recurrence.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Próxima execução: {formatDate(recurrence.next_run_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={recurrence.status === "active" ? "secondary" : "outline"}>
                    {recurrence.status === "active" ? "Ativa" : "Pausada"}
                  </Badge>
                  <Badge variant="outline">
                    {frequencyLabels[recurrence.frequency]}
                  </Badge>
                  <Badge variant="outline">
                    {paymentLabels[recurrence.payment_method]}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {recurrence.items?.length || 0} itens
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-2"
                  onClick={() => toggleStatus(recurrence)}
                >
                  {recurrence.status === "active" ? "Pausar" : "Retomar"}
                </Button>
                <Button
                  variant="outline"
                  className="border-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleDelete(recurrence)}
                >
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Recurrences;
