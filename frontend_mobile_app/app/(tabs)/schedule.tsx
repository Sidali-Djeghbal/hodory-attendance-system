import P from "@/components/p";
import { SessionsContainer } from "@/components/schedule/session";
import TabContainer from "@/components/tab-container";
import { useAuth } from "@/stores/auth";
import { colors } from "@/styles/global";
import { Day, type Session } from "@/types/session";
import fetcher from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type ScheduleData = {
	sdays: Session[]
}

export default function Schedule() {
	const [selectedDay, setSelectedDay] = useState<Day>(Day.SUNDAY);

	const token = useAuth(state => state.token);
	const userId = useAuth(state => state.user?.id);
	const { status, data } = useQuery({
		queryKey: ["profile", userId ?? "anon"],
		enabled: Boolean(token),
		queryFn: async () => {
			const res = await fetcher<any>({ method: "GET", route: "/student/profile", token });
			if (!res.ok) throw new Error(`${res.status}: ${res.statusText ?? "Request failed"}`);
			return res.data as ScheduleData;
		},
	});

	if (status === "pending") {
		return (
			<TabContainer title="Schedule">
				<P>Loading…</P>
			</TabContainer>
		);
	}

	if (status === "error") {
		return (
			<TabContainer title="Schedule">
				<P>Failed to load schedule.</P>
			</TabContainer>
		);
	}

	return <TabContainer title="Schedule">
		<View style={style.dayContainer}>
			<DayButton currentDay={selectedDay} selfDay={Day.SUNDAY} setDay={setSelectedDay} />
			<DayButton currentDay={selectedDay} selfDay={Day.MONDAY} setDay={setSelectedDay} />
			<DayButton currentDay={selectedDay} selfDay={Day.TUESDAY} setDay={setSelectedDay} />
			<DayButton currentDay={selectedDay} selfDay={Day.WEDNESDAY} setDay={setSelectedDay} />
			<DayButton currentDay={selectedDay} selfDay={Day.THURSDAY} setDay={setSelectedDay} />
		</View>

		<SessionsContainer sessions={(data.sdays ?? []).filter(mod => mod.day === selectedDay)} />
	</TabContainer>;
}

function DayButton({ currentDay, setDay, selfDay }: {
	currentDay: Day;
	selfDay: Day;
	setDay: (day: Day) => void;
}) {
	return (
		<TouchableOpacity
			style={[style.dayBtn, currentDay === selfDay && style.dayBtnSelected]}
			onPress={() => setDay(selfDay)}>
			<P size={10} weight="semiBold" color={currentDay === selfDay ? "white" : "black"}>
				{selfDay}
			</P>
		</TouchableOpacity >
	)
}

const style = StyleSheet.create({
	dayContainer: {
		flexDirection: "row",
		gap: 1,
		alignItems: "center",
		marginBlock: 8
	},
	dayBtn: {
		flex: 1,
		height: 25,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	dayBtnSelected: {
		backgroundColor: colors.green
	},
});
