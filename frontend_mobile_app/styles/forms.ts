import { StyleSheet } from "react-native";

export const formStyle = StyleSheet.create({
	form: {
		width: "100%",
		flexDirection: "column",
		alignItems: "stretch",
		justifyContent: "center",
		gap: 16,
	},

	fieldInfo: {
		color: "red",
		fontSize: 11,
	},

	forgotPassword: {
		alignSelf: "flex-start",
		color: "#3C3C43",
		opacity: 0.6,
		marginTop: -5,
		marginLeft: 10,
		marginBottom: 6,
	},
});
