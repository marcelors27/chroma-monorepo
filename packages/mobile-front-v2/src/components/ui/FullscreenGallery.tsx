import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, Image, Linking } from "react-native";
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Galeria</Text>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <X color="white" size={18} />
          </Pressable>
        </View>

        {currentMedia?.type === "image" ? (
          <Image source={{ uri: currentMedia.url }} style={styles.media} resizeMode="contain" />
        ) : currentMedia?.type === "video" ? (
          <Video
            source={{ uri: currentMedia.url }}
            style={styles.media}
            resizeMode="contain"
            controls
          />
        ) : currentMedia?.type === "youtube" && youtubeEmbedUrl ? (
          <WebView
            source={{ uri: youtubeEmbedUrl }}
            style={styles.media}
            allowsFullscreenVideo
            javaScriptEnabled
            mediaPlaybackRequiresUserAction={false}
          />
        ) : currentMedia?.type === "vimeo" && vimeoEmbedUrl ? (
          <WebView
            source={{ uri: vimeoEmbedUrl }}
            style={styles.media}
            allowsFullscreenVideo
            javaScriptEnabled
            mediaPlaybackRequiresUserAction={false}
          />
        ) : (
          <View style={styles.mediaFallback}>
            {currentThumbnail ? (
              <View style={styles.thumbnailWrap}>
                <Image source={{ uri: currentThumbnail }} style={styles.thumbnail} resizeMode="contain" />
                <Pressable
                  onPress={handleOpenMedia}
                  style={styles.mediaButton}
                >
                  <Play color="white" size={18} />
                  <Text style={styles.mediaButtonText}>Reproduzir vídeo</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleOpenMedia}
                style={styles.mediaButton}
              >
                <Play color="white" size={18} />
                <Text style={styles.mediaButtonText}>Abrir mídia</Text>
              </Pressable>
            )}
          </View>
        )}

        {media.length > 1 && (
          <View style={styles.navRow}>
            <Pressable
              onPress={() => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)}
              style={styles.navButton}
            >
              <ChevronLeft color="white" size={20} />
            </Pressable>
            <Pressable
              onPress={() => setCurrentIndex((prev) => (prev + 1) % media.length)}
              style={styles.navButton}
            >
              <ChevronRight color="white" size={20} />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  media: {
    width: "100%",
    height: "70%",
  },
  mediaFallback: {
    width: "100%",
    height: "70%",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailWrap: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  mediaButton: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  mediaButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  navRow: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  navButton: {
    padding: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
