import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  createRecurrence,
  deleteRecurrence,
  formatPrice,
  getActiveCondo,
  listRecurrences,
  listProducts,
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
  const { data: productData } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFrequency, setNewFrequency] =
    useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [newDayOfWeek, setNewDayOfWeek] = useState("1");
  const [newDayOfMonth, setNewDayOfMonth] = useState("5");
  const [newPayment, setNewPayment] = useState<"credit" | "pix" | "boleto">("pix");
  const [newProductId, setNewProductId] = useState("");
  const [newVariantId, setNewVariantId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const recurrences = recurrenceData?.recurrences || [];
  const products = productData?.products || [];
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === newProductId) || null,
    [newProductId, products]
  );
  const variants = selectedProduct?.variants || [];
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === newVariantId) || null,
    [newVariantId, variants]
  );

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  useEffect(() => {
    if (!createOpen) return;
    if (!newProductId && products.length > 0) {
      setNewProductId(products[0].id);
    }
  }, [createOpen, newProductId, products]);

  useEffect(() => {
    if (!selectedProduct) return;
    if (!variants.length) return;
    if (!newVariantId || !variants.some((variant) => variant.id === newVariantId)) {
      setNewVariantId(variants[0].id);
    }
  }, [selectedProduct, variants, newVariantId]);

  const resetCreateForm = () => {
    setNewName("");
    setNewFrequency("monthly");
    setNewDayOfWeek("1");
    setNewDayOfMonth("5");
    setNewPayment("pix");
    setNewQuantity("1");
  };

  const handleCreate = async () => {
    if (!selectedProduct || !selectedVariant) {
      toast({
        title: "Selecione um produto",
        description: "Escolha um produto para criar a recorrência.",
        variant: "destructive",
      });
      return;
    }
    const quantity = Math.max(1, Number(newQuantity) || 1);
    setSaving(true);
    try {
      const activeCondo = getActiveCondo();
      await createRecurrence({
        name: newName.trim() || `Recorrência ${selectedProduct.title}`.trim(),
        frequency: newFrequency,
        day_of_week: newFrequency === "monthly" ? undefined : Number(newDayOfWeek),
        day_of_month: newFrequency === "monthly" ? Number(newDayOfMonth) : undefined,
        payment_method: newPayment,
        items: [
          {
            variant_id: selectedVariant.id,
            product_id: selectedProduct.id,
            quantity,
            title: selectedProduct.title,
            price: formatPrice(selectedVariant.prices),
            category: selectedProduct.type?.value || "Recorrente",
          },
        ],
        company_id: activeCondo?.id || null,
      });
      toast({
        title: "Recorrência criada",
        description: "Produto adicionado às recorrências.",
      });
      resetCreateForm();
      setCreateOpen(false);
      await refetchRecurrences();
    } catch (error: any) {
      toast({
        title: "Erro ao criar recorrência",
        description: error?.message || "Não foi possível salvar a recorrência.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="recurrences-title">
            Compras Recorrentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Agende compras semanais, quinzenais ou mensais para o condomínio.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Adicionar recorrência</Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Recorrências ativas</h2>
        <Card className="border-2">
          <CardContent className="p-6 text-muted-foreground">
            Você pode criar recorrências por produto direto nesta página ou marcar produtos
            como recorrentes no checkout.
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
                  data-testid="recurrence-toggle"
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-2 border-border bg-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Nova recorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <select
                className="h-12 border-2 rounded-md bg-background px-3 w-full"
                value={newProductId}
                onChange={(e) => setNewProductId(e.target.value)}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Variação</Label>
              <select
                className="h-12 border-2 rounded-md bg-background px-3 w-full"
                value={newVariantId}
                onChange={(e) => setNewVariantId(e.target.value)}
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                className="h-12 border-2"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                className="h-12 border-2"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Reposição de limpeza"
              />
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <select
                className="h-12 border-2 rounded-md bg-background px-3 w-full"
                value={newPayment}
                onChange={(e) => setNewPayment(e.target.value as "credit" | "pix" | "boleto")}
              >
                <option value="credit">Cartão</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <select
                className="h-12 border-2 rounded-md bg-background px-3 w-full"
                value={newFrequency}
                onChange={(e) =>
                  setNewFrequency(e.target.value as "weekly" | "biweekly" | "monthly")
                }
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            {newFrequency === "monthly" ? (
              <div className="space-y-2">
                <Label>Dia do mês</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="h-12 border-2"
                  value={newDayOfMonth}
                  onChange={(e) => setNewDayOfMonth(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <select
                  className="h-12 border-2 rounded-md bg-background px-3 w-full"
                  value={newDayOfWeek}
                  onChange={(e) => setNewDayOfWeek(e.target.value)}
                >
                  <option value="0">Domingo</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                  <option value="6">Sábado</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-2"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recurrences;
