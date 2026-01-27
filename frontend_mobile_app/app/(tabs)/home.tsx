import P from "@/components/p";
import { style } from "@/styles/home";
import assets from "@/utils/assets";
import { Image } from "expo-image";
import { TouchableOpacity, View } from "react-native";
import { Scan, History, Bell, Calendar } from "lucide-react-native";
import { QuickAction } from "@/components/home/quick-action";
import { useRouter } from "expo-router";
import { UpdatesContainer } from "@/components/home/update";
import TabContainer from "@/components/tab-container";
import { Update } from "@/types/update";


export default function Home() {
	const router = useRouter();
	const fakeData: Update[] = [
		{ id: 1, type: "good", text: "Justification of PW Compilation approved." },
		{ id: 2, type: "warning", text: "You are 1 absence away from exclusion (AI Fundemantals)." },
		{ id: 3, type: "bad", text: "You have been excluded from Mobile Dev." },
	]

	return (
		<TabContainer title="Home" scroll>
			<Image source={assets.homeBanner} style={style.banner} />

			<P size={20} style={{ marginTop: 36 }} weight="semiBold">Quick Actions</P>
			<View style={style.quickActionContainer}>
				{/* TODO: add camera url */}
				<QuickAction title="Mark attendence" Icon={Scan} url={"/(tabs)/scan"} />
				<QuickAction title="View schedule" Icon={Calendar} url={"/(tabs)/schedule"} />
				<QuickAction title="Attendence history" Icon={History} url={"/(tabs)/records"} />
				<QuickAction title="Notifications" Icon={Bell} url={"/updates"} />
			</View>

			<View style={style.updatesHeader}>
				<P size={20} weight="semiBold" style={{ flex: 1 }}>Updates</P>
				<TouchableOpacity onPress={() => router.push("/updates")}>
					<P size={16} weight="medium">See all</P>
				</TouchableOpacity>
			</View>
			<UpdatesContainer updates={fakeData} />
		</TabContainer>
	);
}
