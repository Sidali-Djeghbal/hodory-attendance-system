import { generalStyles } from "@/styles/global";
import { TextInput, type TextInputProps, type TextStyle } from "react-native";

export default function StyledInput({ style, ...props }: TextInputProps) {
	return (
		<TextInput
			// we style with global style first, then local style, then props style.
			style={[generalStyles.inputs, thisStyle, style]}
			placeholderTextColor={"#3C3C4399"}
			{...props}
		/>
	);
}

const thisStyle: TextStyle = {
	color: "black",
	backgroundColor: "#DEE2E7",
	paddingLeft: 10,
};
