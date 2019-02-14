import React, { Component } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Mutation } from "react-apollo";
import { Buffer } from "buffer";

import { withTheme } from "../../contexts/ThemeContext";
import { Button } from "../../components/common";
import GROUP_QUERY from "../../graphql/queries/group-query";
import CREATE_MESSAGE_MUTATION from "../../graphql/mutations/create-message-mutation";

class MessageInput extends Component {
  state = {
    text: ""
  };

  send = createMessage => {
    const { groupId, userId, ITEMS_PER_PAGE } = this.props;
    const { text } = this.state;

    this.textInput.clear();
    this.textInput.blur();

    createMessage({
      variables: {
        text: text,
        groupId: groupId,
        userId: userId
      },
      // Fake data in our cache before waiting a response from grapbql-external-api
      optimisticResponse: {
        __typename: "Mutation",
        createMessage: {
          __typename: "Message",
          id: -1, // don't know id yet, but it doesn't matter
          text: text, // we know what the text will be
          createdAt: new Date().toISOString(), // the time is now!
          from: {
            __typename: "User",
            id: 1,
            username: "Justyn.Kautzer" // still faking the user
          },
          to: {
            __typename: "Group",
            id: groupId
          }
        }
      },
      // Update runs when the result returns from grapbql-external-api
      update: (store, { data: { createMessage } }) => {
        // Read the data from our cache for this query.

        const groupData = store.readQuery({
          query: GROUP_QUERY,
          variables: {
            groupId: groupId
          }
        });
        // console.log("groupData", groupData);
        // Add our message from the mutation to the end.
        groupData.group.messages.unshift(createMessage);
        groupData.group.messages.edges.unshift({
          __typename: "MessageEdge",
          node: createMessage,
          cursor: Buffer.from(createMessage.id.toString()).toString("base64")
        });
        // Write our data back to the cache.
        store.writeQuery({
          query: GROUP_QUERY,
          variables: {
            groupId,
            first: ITEMS_PER_PAGE
          },
          data: groupData
        });
      }
    })
      .then(() => {
        this.props.scrollToBottomOfMessagesList();
      })
      .catch(error => {
        console.log("Something went wrong sending message", error);
      });
  };

  render() {
    return (
      <Mutation mutation={CREATE_MESSAGE_MUTATION}>
        {createMessage => {
          return (
            <View style={styles.container}>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={ref => {
                    this.textInput = ref;
                  }}
                  onChangeText={text => this.setState({ text })}
                  style={styles.input}
                  value={this.state.text}
                  placeholder="Type your message here!"
                />
              </View>
              <View style={styles.sendButtonContainer}>
                <Button onPress={() => this.send(createMessage)} hover>
                  <MaterialCommunityIcons
                    name="hotel"
                    size={16}
                    color="white"
                  />
                </Button>
              </View>
            </View>
          );
        }}
      </Mutation>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-end",
    backgroundColor: "#f5f1ee",
    borderColor: "#dbdbdb",
    borderTopWidth: 1,
    flexDirection: "row"
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  input: {
    backgroundColor: "white",
    borderColor: "#dbdbdb",
    borderRadius: 15,
    borderWidth: 1,
    color: "black",
    height: 32,
    paddingHorizontal: 8
  },
  sendButtonContainer: {
    paddingRight: 12,
    paddingVertical: 6
  },
  sendButton: {
    height: 32,
    width: 32
  }
});

export default withTheme(MessageInput);