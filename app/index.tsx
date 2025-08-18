import { router } from "expo-router";
import { Button, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SafeAreaView>
        <Button title="Choose a dog" onPress={() => router.push("/ChooseADog")} />
      </SafeAreaView>
    </View>
  );
}
