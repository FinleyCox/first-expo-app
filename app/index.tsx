import { Component } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

class App extends Component {
  state = {
    count: 0,
  }
  onPress = () => {
    this.setState({ count: this.state.count + 1 });
  };

  render() {
    return (
      <View style={Styles.container}>
        <Text>{this.state.count}</Text>
        <Button title="Click me" onPress = {this.onPress} />
      </View>
    );
  }
}

const Styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default App;