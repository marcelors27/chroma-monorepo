import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: "Bem-vindo ao Chroma!",
      description: "Sua conta foi configurada com sucesso.",
    });
    navigate("/dashboard");
  }, [navigate, toast]);

  return null;
};

export default Onboarding;
