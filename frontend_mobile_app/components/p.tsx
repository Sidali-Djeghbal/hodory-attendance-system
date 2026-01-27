// Just Text component with Poppins font.

import { Text, type TextProps, type TextStyle } from "react-native";

// using these custom props (example: weight, size) should be prioritized instead of using
// style prop directly to avoid errors and inconsistencies.
type Props = {
	weight?: "extraBold" | "bold" | "semiBold" | "medium" | "light";
	color?: "white" | "#3C3C4399" | "black";
	size?: number;
};

export default function P({
	children,
	style,
	weight,
	size,
	color,
	...props
}: TextProps & Props) {
	return (
		<Text {...props} style={[getStyle({ weight, size, color }), style]}>
			{children}
		</Text>
	);
}

// this generates style dynamically from props
function getStyle({ weight, size, color }: Props): TextStyle {
	// same names as Props["weight"]
	const FONT_WEIGHTS = {
		extraBold: "Poppins-ExtraBold",
		bold: "Poppins-Bold",
		semiBold: "Poppins-SemiBold",
		medium: "Poppins-Medium",
		light: "Poppins-Light",
	};

	const out: TextStyle = {
		// default values //
		fontFamily: FONT_WEIGHTS.medium,
		fontSize: 12,
		color: "black",
	};

	if (weight !== undefined) out.fontFamily = FONT_WEIGHTS[weight];
	if (size !== undefined) out.fontSize = size;
	if (color !== undefined) out.color = color;

	return out;
}
