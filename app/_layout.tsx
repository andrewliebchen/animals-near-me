import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { DeepLinkProvider } from "../src/context/DeepLinkContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <DeepLinkProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </DeepLinkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});



