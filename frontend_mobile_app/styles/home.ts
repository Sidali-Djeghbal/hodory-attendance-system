import { StyleSheet } from "react-native";

export const style = StyleSheet.create({
	banner: {
		alignSelf: "center",
		width: 333,
		height: 144,
		borderRadius: 20,
		borderWidth: 3,
		borderColor: "white",
	},

	quickActionContainer: {
		height: 144,
		marginBlock: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between"
	},

	updatesHeader: {
		marginTop: -16,
		flexDirection: "row",
	},
});

