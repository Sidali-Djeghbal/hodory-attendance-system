import LoginForm from "@/components/form/login_form";
import P from "@/components/p";
import { generalStyles } from "@/styles/global";
import { style } from "@/styles/login";
import assets from "@/utils/assets";
import { Image } from "expo-image";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
	return (
		<SafeAreaView style={[generalStyles.page, style.page]}>
			<View style={style.textsContainer}>
				<Image
					source={assets.loginBg}
					style={style.banner}
					contentFit="cover"
					contentPosition="center"
				/>
				<P weight="semiBold" size={12} style={{ color: "white" }}>
					Welcome to,
				</P>
				<P weight="bold" size={50} style={{ lineHeight: 75, color: "white" }}>
					Hodory
				</P>
				<P weight="semiBold" size={20} style={{ color: "white" }}>
					Student Attendance App
				</P>
			</View>
			<View style={style.formHeader}>
				<Image source={assets.logo} style={style.logo} />
				<P weight="semiBold" size={40} style={{ lineHeight: 50 }}>
					Login
				</P>
				<P weight="semiBold" size={10}>
					Enter your credentials to continue.
				</P>
			</View>
			<View style={style.formContainer}>
				<LoginForm />
			</View>
		</SafeAreaView>
	);
}
