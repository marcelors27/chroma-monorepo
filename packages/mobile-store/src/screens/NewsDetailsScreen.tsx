import { StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import { news } from "../data/news";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

const NewsDetailsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, "NewsDetails">>();
  const item = news.find((newsItem) => newsItem.id === route.params.id);

  if (!item) {
    return (
      <ScreenBackground source={backgrounds.home}>
        <View style={styles.container}>
          <Text style={styles.title}>Noticia nao encontrada.</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground source={backgrounds.home}>
      <View style={styles.container}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.category} - {item.date}</Text>
        <Text style={styles.content}>{item.content}</Text>
      </View>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  meta: {
    color: colors.muted,
    marginBottom: 16,
  },
  content: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
});

export default NewsDetailsScreen;
