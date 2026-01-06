import { StyleSheet, Text, View } from "react-native";

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tela não encontrada</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0F14",
  },
  text: {
    color: "#E6E8EA",
  },
});
