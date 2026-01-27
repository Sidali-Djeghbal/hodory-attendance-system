import { CircleCheck, CircleX, TriangleAlert } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import P from "../p";
import { Update } from "@/types/update";

function UpdateItem({ type, text }: Update) {
	const Icon = type === "good" ? CircleCheck : (type === "bad" ? CircleX : TriangleAlert);

	return <View style={[style.container, style[type]]}>
		<Icon size={20} />
		<P>{text}</P>
	</View>;
}

export function UpdatesContainer({ updates }: { updates: Update[] }) {
	return (
		<View style={{ gap: 10 }}>
			{updates.map((item) => (
				<UpdateItem key={`${item.id}`} {...item} />
			))}
		</View>
	);

}

const style = StyleSheet.create({
	container: {
		height: 50,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		padding: 8,
		borderRadius: 12,
	},

	good: {
		backgroundColor: "#00FF0044",
	},
	warning: {
		backgroundColor: "#FFFF0044",
	},
	bad: {
		backgroundColor: "#FF000044"
	}
});
