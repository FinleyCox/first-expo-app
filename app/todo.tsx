import { Component } from "react";
import { Text, TextInput, View } from "react-native";

class Todo extends Component {
    state = {
        text: "",
        todos: [],
    }

    addTodo = () => {
        if(this.state.text.trim() === "") return;

        this.setState({
            todos: [...this.state.todos, this.state.text],
            text: "",
        });
    };

    render() {
        return (
            <View>
                <Text>Todo</Text>
                <TextInput
                    placeholder="Add a todo"
                    value={this.state.text}
                    onChangeText={(text) => this.setState({ text })}
                />
            </View>
        );
    }
}

export default Todo;