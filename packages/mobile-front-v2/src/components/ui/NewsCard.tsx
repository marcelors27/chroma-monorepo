import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Clock, ChevronRight } from "lucide-react-native";

interface NewsCardProps {
  title: string;
  summary: string;
  source: string;
  date: string;
  image?: string;
  isHighlight?: boolean;
  onClick?: () => void;
}

export function NewsCard({
  title,
  summary,
  source,
  date,
  image,
  isHighlight = false,
  onClick,
}: NewsCardProps) {
  if (isHighlight) {
    return (
      <Pressable onPress={onClick} style={styles.highlight}>
        {image && <Image source={{ uri: image }} style={styles.highlightImage} />}
        <View style={styles.highlightOverlay} />
        <View style={styles.highlightContent}>
          <View style={styles.highlightTag}>
            <Text style={styles.highlightTagText}>Destaque</Text>
          </View>
          <Text style={styles.highlightTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{source}</Text>
            <Text style={styles.metaText}>•</Text>
            <View style={styles.metaRow}>
              <Clock color="#8C98A8" size={12} />
              <Text style={styles.metaText}>{date}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onClick} style={styles.card}>
      {image && <Image source={{ uri: image }} style={styles.cardImage} />}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.cardSummary} numberOfLines={2}>
          {summary}
        </Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardMetaText}>{source}</Text>
          <Text style={styles.cardMetaText}>•</Text>
          <Text style={styles.cardMetaText}>{date}</Text>
        </View>
      </View>
      <ChevronRight color="#8C98A8" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  highlight: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 12,
  },
  highlightImage: {
    ...StyleSheet.absoluteFillObject,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  highlightContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  highlightTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  highlightTagText: {
    color: "#E6E8EA",
    fontSize: 11,
    fontWeight: "600",
  },
  highlightTitle: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#8C98A8",
    fontSize: 11,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    backgroundColor: "rgba(26, 30, 38, 0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardSummary: {
    color: "#8C98A8",
    fontSize: 12,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  cardMetaText: {
    color: "#7C8796",
    fontSize: 10,
  },
});
