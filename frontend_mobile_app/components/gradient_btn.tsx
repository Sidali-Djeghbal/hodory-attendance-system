import { generalStyles } from "@/styles/global";
import { LinearGradient } from "expo-linear-gradient";
import {
	StyleSheet,
	TouchableOpacity,
	type TouchableOpacityProps,
} from "react-native";
import P from "./p";

export default function GradientButton({
	children,
	...props
}: TouchableOpacityProps) {
	return (
		<TouchableOpacity
			activeOpacity={0.6}
			style={[generalStyles.inputs, style.touchable]}
			{...props}
		>
			<LinearGradient
				colors={["#56B8AE", "#009485"]}
				start={{ x: -0.2, y: -2 }}
				end={{ x: 0.3, y: 1.8 }}
				style={style.gradient}
			>
				<P weight="semiBold" style={style.text}>
					{children}
				</P>
			</LinearGradient>
		</TouchableOpacity>
	);
}

const style = StyleSheet.create({
	touchable: {
		height: 50,
		borderRadius: 20,
	},
	gradient: {
		width: "100%",
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 16,
	},
	text: {
		color: "white",
		fontSize: 16,
	},
});
