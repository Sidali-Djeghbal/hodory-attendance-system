import { Fullscreen } from "lucide-react-native";
import { StyleSheet } from "react-native";

export const style = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    overflow: "hidden",
  },

  banner: {
    position: "absolute",
    zIndex: -10,
    top: -40,
    left: -100,
    width: 550,
    height: 500,
    alignSelf: "center",

  },

  textsContainer: {
    flex: 1,
    alignSelf: "stretch",
    height: 200,
    padding: 20,
  },

  formHeader: {
    flex: 1,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
    backgroundColor: "white",
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 100,
    gap: 10,
  },

  logo: {
    alignSelf: "center",
    width: 115,
    height: 115,
    margin: 10,
  },

  formContainer: {
    flex: 2,
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: "white",
    alignItems: "stretch",
  },
});
