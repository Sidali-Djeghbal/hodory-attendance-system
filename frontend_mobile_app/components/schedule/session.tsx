import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import P from "../p";
import { Session } from "@/types/session";

function SessionItem({ session }: { session: Session; }) {
	return <View style={style.container}>
		<View style={[style.section, style.header]}>
			<View style={style.column}>
				<P size={8} weight="medium" color="white">time</P>
			</View>
			<View style={[style.column, { flex: 2 }]}>
				<P size={8} weight="medium" color="white">session</P>
			</View>
			<View style={style.column}>
				<P size={8} weight="medium" color="white">room</P>
			</View>
		</View>
		<View style={[style.section, style.content]}>
			<View style={style.column}>
				<P size={12} weight="semiBold">{session.time}</P>
			</View>
			<View style={[style.column, { flex: 2 }]}>
				<P size={16} weight="semiBold">{session.module_code}</P>
				<P size={12} weight="semiBold">{session.module_name}</P>
			</View>
			<View style={style.column}>
				<P size={16} weight="bold">{session.room}</P>
			</View>
		</View>
	</View>;
}

export function SessionsContainer({ sessions }: { sessions: Session[] }) {
	const insets = useSafeAreaInsets();
	const bottomPadding = 65 + insets.bottom + 20;
	return <FlatList
		data={sessions}
		renderItem={({ item }) => <SessionItem session={item} />}
		keyExtractor={(item) => `${item.id}`}
		ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
		contentContainerStyle={{ paddingBottom: bottomPadding }}
	/>

}

const BORDER_RADIUS = 12;
const style = StyleSheet.create({
	container: {
		width: "100%",
		gap: 0,
	},
	section: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-start",
		paddingInline: 8,
	},
	header: {
		backgroundColor: "black",
		height: 20,
		borderTopLeftRadius: BORDER_RADIUS,
		borderTopRightRadius: BORDER_RADIUS,
	},
	content: {
		backgroundColor: "#E5E5E5",
		height: 70,
		borderBottomLeftRadius: BORDER_RADIUS,
		borderBottomRightRadius: BORDER_RADIUS,
	},
	column: {
		flex: 1,
		alignItems: "flex-start",
		justifyContent: "center",
	}
});
