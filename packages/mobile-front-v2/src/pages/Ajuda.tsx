import { ScrollView, Text, View, Pressable } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const helpOptions = [
  { id: "1", title: "Perguntas frequentes", description: "Respostas rápidas" },
  { id: "2", title: "Fale com suporte", description: "Atendimento especializado" },
  { id: "3", title: "Tutoriais", description: "Aprenda a usar o app" },
];

export default function Ajuda() {
  return (
    <AuthenticatedLayout>
      <Header title="Central de Ajuda" showBackButton showCondoSelector />

      <ScrollView className="px-4 py-4">
        {helpOptions.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => toast.info("Funcionalidade em desenvolvimento")}
            className="bg-card rounded-2xl p-4 mb-3"
          >
            <Text className="text-sm font-semibold text-foreground">{option.title}</Text>
            <Text className="text-xs text-muted-foreground mt-1">{option.description}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </AuthenticatedLayout>
  );
}
