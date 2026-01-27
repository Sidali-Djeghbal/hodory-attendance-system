import { colors, generalStyles } from "@/styles/global";
import {
	StyleSheet,
	TouchableOpacity,
	type TouchableOpacityProps,
} from "react-native";
import P from "./p";

export default function OutlinedButton({
	children,
	color,
	...props
}: TouchableOpacityProps & { color?: string }) {
	const borderColor = color ?? colors.green;
	return (
		<TouchableOpacity
			activeOpacity={0.6}
			style={[generalStyles.inputs, style.touchable, { borderColor }]}
			{...props}
		>
			<P weight="semiBold" style={[style.text, { color: borderColor }]}>
				{children}
			</P>
		</TouchableOpacity>
	);
}

const style = StyleSheet.create({
	touchable: {
		height: 50,
		borderRadius: 20,
		borderWidth: 1,
		justifyContent: "center",
		padding: 8,
		paddingInline: 26,
	},
	text: {
		fontSize: 16,
	},
});
