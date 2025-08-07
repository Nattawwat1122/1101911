// ChatStyles.js
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#fff",
  },
  chatContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 10,
    fontSize: 15,
    lineHeight: 21,
  },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
  },
  button: {
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
  },
});

export default styles;
