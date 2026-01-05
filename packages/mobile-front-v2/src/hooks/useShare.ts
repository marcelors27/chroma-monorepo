import { useCallback } from "react";
import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { toast } from "@/lib/toast";

interface ShareData {
  title: string;
  text?: string;
  url?: string;
}

export function useShare() {
  const share = useCallback(async ({ title, text, url }: ShareData) => {
    const shareUrl = url || "";
    try {
      await Share.share({
        title,
        message: text ? `${text}\n${shareUrl}` : `${title}\n${shareUrl}`,
        url: shareUrl,
      });
      return true;
    } catch {
      // Fallback to clipboard
    }

    try {
      if (shareUrl) {
        await Clipboard.setStringAsync(shareUrl);
        toast.success("Link copiado para a área de transferência!");
        return true;
      }
    } catch {
      toast.error("Não foi possível compartilhar");
    }
    return false;
  }, []);

  return { share };
}
