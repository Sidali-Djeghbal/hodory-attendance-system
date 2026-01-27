import P from "@/components/p";
import TabContainer from "@/components/tab-container";
import { useAuth } from "@/stores/auth";
import fetcher from "@/utils/api";
import assets from "@/utils/assets";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View, Image } from "react-native";
import OutlinedButton from "@/components/outlined_btn";
import { useRouter } from "expo-router";
import { colors } from "@/styles/global";


export default function Profile() {
	const router = useRouter();
	const token = useAuth(state => state.token);
	const user = useAuth(state => state.user);
	const logout = useAuth(state => state.logout);
	const { status, data: profile } = useQuery({
		queryKey: ["profile", user?.id ?? "anon"],
		enabled: Boolean(token),
		queryFn: async () => {
			const res = await fetcher<any>({ method: "GET", route: "/student/profile", token });
			if (!res.ok) throw new Error(`${res.status}: ${res.statusText ?? "Request failed"}`);
			return res.data;
		},
	});

	if (status === "pending") {
		return (
			<TabContainer title="Profile">
				<P>Loading…</P>
			</TabContainer>
		);
	}

	if (status === "error") {
		return (
			<TabContainer title="Profile">
				<P>Failed to load profile.</P>
			</TabContainer>
		);
	}

	return <TabContainer title="Profile" scroll>
		<Image source={assets.logo} style={style.image} />

		<P size={20} weight="semiBold">Personal informations</P>
		<View style={style.card}>
			<CardItem title="Full name" text={user!.full_name} />
			<CardItem title="Student ID" text="20230000000" />
			<CardItem title="Class" text={profile.level?.name ?? "—"} />
			<CardItem title="Academic year" text={`${profile.level?.year_level ?? "—"} (2025/2026)`} />
		</View>

		<View style={style.actions}>
			<OutlinedButton
				color={colors.red}
				onPress={() => {
					logout();
					router.replace("/");
				}}
			>
				Log out
			</OutlinedButton>
		</View>
	</TabContainer>;
}

function CardItem({ title, text }: { title: string; text: string }) {
	return <View style={style.cardItem}>
		<P size={12} weight="semiBold">{title}</P>
		<P size={18} weight="semiBold">{text} </P>
	</View>
}

const style = StyleSheet.create({
	image: {
		height: 150,
		width: 150,
		alignSelf: "center",
		marginBlock: 36
	},

	card: {
		gap: 10,
		padding: 16,
		margin: 4,
		backgroundColor: "white",
		borderRadius: 24,
	},
	cardItem: {
	},
	actions: {
		marginTop: 16,
		alignItems: "center",
	},
});
