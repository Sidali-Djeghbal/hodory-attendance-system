import { UpdatesContainer } from "@/components/home/update";
import P from "@/components/p";
import { generalStyles } from "@/styles/global";
import { Update } from "@/types/update";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Updates() {
	const router = useRouter();
	const fakeData: Update[] = [
		{ id: 1, type: "good", text: "Justification of PW Compilation approved." },
		{ id: 2, type: "warning", text: "You are 1 absence away from exclusion (AI Fundemantals)." },
		{ id: 3, type: "bad", text: "You have been excluded from Mobile Dev." },
	]

	return <SafeAreaView style={[generalStyles.tabPage]}>
		<TouchableOpacity style={style.btn} onPress={() => router.push("/(tabs)/home")}>
			<ChevronLeft size={25} style={{ marginRight: 4 }} />
			<P size={35} weight="semiBold">Updates</P>
		</TouchableOpacity>


		<ScrollView
			showsVerticalScrollIndicator={false}
			contentContainerStyle={{ paddingBottom: 20 }}
		>
			<UpdatesContainer updates={fakeData} />
		</ScrollView>
	</SafeAreaView>;
}

const style = StyleSheet.create({
	btn: {
		flexDirection: "row",
		alignItems: "center"
	}
});
