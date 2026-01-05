import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View, Image, Linking } from "react-native";
import Video from "react-native-video";
import { WebView } from "react-native-webview";
import { ChevronLeft, ChevronRight, X, Play } from "lucide-react-native";

type MediaItem = {
  type: "image" | "video" | "youtube" | "vimeo";
  url: string;
  thumbnail?: string;
};

interface FullscreenGalleryProps {
  media: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  getYouTubeId: (url: string) => string | null;
  getVimeoId: (url: string) => string | null;
}

export function FullscreenGallery({
  media,
  initialIndex,
  isOpen,
  onClose,
  getYouTubeId,
  getVimeoId,
}: FullscreenGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!isOpen) return null;

  const currentMedia = media[currentIndex];
  const currentYouTubeId = currentMedia?.type === "youtube" ? getYouTubeId(currentMedia.url) : null;
  const currentVimeoId = currentMedia?.type === "vimeo" ? getVimeoId(currentMedia.url) : null;
  const currentThumbnail =
    currentMedia?.thumbnail ||
    (currentMedia?.type === "youtube" && currentYouTubeId ? `https://img.youtube.com/vi/${currentYouTubeId}/hqdefault.jpg` : null) ||
    (currentMedia?.type === "vimeo" && currentVimeoId ? `https://vumbnail.com/${currentVimeoId}.jpg` : null);
  const youtubeEmbedUrl = currentYouTubeId ? `https://www.youtube.com/embed/${currentYouTubeId}?playsinline=1` : null;
  const vimeoEmbedUrl = currentVimeoId ? `https://player.vimeo.com/video/${currentVimeoId}` : null;

  const handleOpenMedia = () => {
    if (!currentMedia || currentMedia.type === "image") {
      return;
    }
    Linking.openURL(currentMedia.url).catch(() => undefined);
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black items-center justify-center">
        <View className="absolute top-12 left-4 right-4 flex-row items-center justify-between">
          <Text className="text-white font-semibold">Galeria</Text>
          <Pressable onPress={onClose} className="p-2 rounded-full bg-white/10">
            <X color="white" size={18} />
          </Pressable>
        </View>

        {currentMedia?.type === "image" ? (
          <Image source={{ uri: currentMedia.url }} className="w-full h-[70%]" resizeMode="contain" />
        ) : currentMedia?.type === "video" ? (
          <Video
            source={{ uri: currentMedia.url }}
            className="w-full h-[70%]"
            resizeMode="contain"
            controls
          />
        ) : currentMedia?.type === "youtube" && youtubeEmbedUrl ? (
          <WebView
            source={{ uri: youtubeEmbedUrl }}
            className="w-full h-[70%]"
            allowsFullscreenVideo
            javaScriptEnabled
            mediaPlaybackRequiresUserAction={false}
          />
        ) : currentMedia?.type === "vimeo" && vimeoEmbedUrl ? (
          <WebView
            source={{ uri: vimeoEmbedUrl }}
            className="w-full h-[70%]"
            allowsFullscreenVideo
            javaScriptEnabled
            mediaPlaybackRequiresUserAction={false}
          />
        ) : (
          <View className="w-full h-[70%] items-center justify-center">
            {currentThumbnail ? (
              <View className="w-full h-full items-center justify-center">
                <Image source={{ uri: currentThumbnail }} className="w-full h-full" resizeMode="contain" />
                <Pressable
                  onPress={handleOpenMedia}
                  className="absolute px-5 py-3 rounded-full bg-white/15 flex-row items-center gap-2"
                >
                  <Play color="white" size={18} />
                  <Text className="text-white font-semibold">Reproduzir vídeo</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleOpenMedia}
                className="px-5 py-3 rounded-full bg-white/15 flex-row items-center gap-2"
              >
                <Play color="white" size={18} />
                <Text className="text-white font-semibold">Abrir mídia</Text>
              </Pressable>
            )}
          </View>
        )}

        {media.length > 1 && (
          <View className="absolute bottom-12 left-0 right-0 flex-row items-center justify-between px-6">
            <Pressable
              onPress={() => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)}
              className="p-3 rounded-full bg-white/10"
            >
              <ChevronLeft color="white" size={20} />
            </Pressable>
            <Pressable
              onPress={() => setCurrentIndex((prev) => (prev + 1) % media.length)}
              className="p-3 rounded-full bg-white/10"
            >
              <ChevronRight color="white" size={20} />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
