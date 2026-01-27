import { type Href, useRouter } from "expo-router";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import P from "../p";

const QUICK_ACTION_ICON_SIZE = 36;
export function QuickAction({ title, Icon, url }: { title: string; Icon: any; url: Href }) {
	const router = useRouter();

	return <View style={style.outerContainer}>
		<TouchableOpacity style={style.touchable} onPress={() => router.push(url)}>
			<Icon size={QUICK_ACTION_ICON_SIZE} style={style.quickActionIcon} />
		</TouchableOpacity>
		<P size={13} weight="semiBold" style={style.title}>{title}</P>
	</View>;
}

const style = StyleSheet.create({
	outerContainer: {
		flex: 1,
		flexDirection: "column",
		alignItems: "center",
		gap: 16
	},
	touchable: {
		width: QUICK_ACTION_ICON_SIZE,
		height: QUICK_ACTION_ICON_SIZE,
		justifyContent: "center",
		alignItems: "center",
	},
	quickActionIcon: {
		...StyleSheet.absoluteFillObject,
	},
	quickActionImage: {
		width: "100%",
		height: "100%"
	},

	title: {
		textAlign: "center",
		color: "gray",
		flex: 1,
	}
});
