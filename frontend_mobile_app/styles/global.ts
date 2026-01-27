import { StyleSheet } from "react-native";

export const colors = {
	bg: "#EFF1F5",
	green: "#009485",
	red: "#DC2626",
};

export const generalStyles = StyleSheet.create({
	page: {
		backgroundColor: colors.bg,
	},
	inputs: {
		// used by input and gradient buttons.
		fontFamily: "Poppins",
		maxWidth: 320,
		height: 45,
		borderRadius: 10,
	},

	tabPage: {
		flex: 1,
		backgroundColor: colors.bg,
		padding: 16,
		paddingTop: 36,
	},
});
