import { useEffect } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useToast } from "../hooks/useToast";
import type { RootStackParamList } from "../navigation/types";

const OnboardingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { toast } = useToast();

  useEffect(() => {
    toast({ title: "Bem-vindo ao Chroma!", description: "Sua conta foi configurada com sucesso." });
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  }, [navigation, toast]);

  return <View />;
};

export default OnboardingScreen;
