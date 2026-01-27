import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Calendar, Folders, LayoutDashboard, Scan, UserRound } from "lucide-react-native";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import P from "./p";

const ICON_SIZE = 28;
const BAR_HEIGHT = 65;
const BAR_GRADIENT_START = "#009485";
const BAR_GRADIENT_END = "#56B8AE";
const CENTER_BUTTON_SIZE = 70;
const CENTER_SPACER = 110;

function CurvedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const routes = state.routes;

	const findRoute = (name: string) => routes.find((route) => route.name === name);
	const scanRoute = findRoute("scan");
	const orderedRoutes = [
		findRoute("home"),
		findRoute("schedule"),
		findRoute("records"),
		findRoute("profile"),
	].filter(Boolean) as typeof routes;

	const renderTab = (route: (typeof routes)[number]) => {
		const index = routes.findIndex((item) => item.key === route.key);
		const isFocused = state.index === index;
		const { options } = descriptors[route.key];

		const onPress = () => {
			const event = navigation.emit({
				type: "tabPress",
				target: route.key,
				canPreventDefault: true,
			});

			if (!isFocused && !event.defaultPrevented) {
				navigation.navigate(route.name);
			}
		};

		const onLongPress = () => {
			navigation.emit({
				type: "tabLongPress",
				target: route.key,
			});
		};

		const label = typeof options.tabBarLabel === "string"
			? options.tabBarLabel
			: options.title ?? route.name;

		const icon = options.tabBarIcon?.({
			focused: isFocused,
			color: "white",
			size: ICON_SIZE,
		});

		return (
			<Pressable
				key={route.key}
				accessibilityRole="button"
				accessibilityState={isFocused ? { selected: true } : {}}
				accessibilityLabel={options.tabBarAccessibilityLabel}
				testID={options.tabBarButtonTestID}
				onPress={onPress}
				onLongPress={onLongPress}
				style={[styles.tabItem, !isFocused && styles.tabItemInactive]}
			>
				{icon}
				<P size={8} style={styles.tabLabel}>
					{label}
				</P>
			</Pressable>
		);
	};

	const onPressCenter = () => {
		if (!scanRoute) return;
		const index = routes.findIndex((item) => item.key === scanRoute.key);
		const isFocused = state.index === index;
		if (!isFocused) navigation.navigate(scanRoute.name);
	};

	const barHeight = BAR_HEIGHT + insets.bottom;
	const isScanFocused = (() => {
		if (!scanRoute) return false;
		const index = routes.findIndex((item) => item.key === scanRoute.key);
		return state.index === index;
	})();

	return (
		<View style={styles.container}>
			<View style={[styles.bar, { height: barHeight }]}>
				<Svg
					width={width}
					height={barHeight}
					viewBox={`0 0 ${width} ${barHeight}`}
					pointerEvents="none"
					style={styles.barSvg}
				>
					<Defs>
						<LinearGradient id="barGradient" x1="0" y1="2" x2="2" y2="8">
							<Stop offset="0" stopColor={BAR_GRADIENT_START} />
							<Stop offset="1" stopColor={BAR_GRADIENT_END} />
						</LinearGradient>
					</Defs>
					<Path d={getTabBarPath(width, barHeight)} fill="url(#barGradient)" />
				</Svg>

				<View style={[styles.row, { paddingBottom: 1 + insets.bottom }]}>
					<View style={styles.sideGroup}>
						{orderedRoutes.slice(0, 2).map(renderTab)}
					</View>
					<View style={styles.centerSpacer} />
					<View style={styles.sideGroup}>
						{orderedRoutes.slice(2).map(renderTab)}
					</View>
				</View>
			</View>

			<Pressable
				onPress={onPressCenter}
				accessibilityRole="button"
				accessibilityLabel="Scan"
				style={[styles.centerButton, isScanFocused && styles.centerButtonFocused]}
			>
				<View style={styles.centerButtonInnerRing}>
					<Scan size={24} color="white" />
				</View>
			</Pressable>
		</View>
	);
}

export default function Navbar() {
	return (
		<Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CurvedTabBar {...props} />}>
			<Tabs.Screen
				name="home"
				options={{
					title: "Dashboard",
					tabBarIcon: ({ color }) => (<LayoutDashboard size={ICON_SIZE} color={color} />),
				}}
			/>
			<Tabs.Screen
				name="schedule"
				options={{
					title: "Schedule",
					tabBarIcon: ({ color }) => (
						<View style={styles.calendarIconWrap}>
							<Calendar size={ICON_SIZE} color={color} />
							<P size={10} weight="bold" style={[styles.calendarNumber, { color }]}>
								10
							</P>
						</View>
					),
				}}
			/>
			<Tabs.Screen
				name="scan"
				options={{
					title: "Scan",
					tabBarButton: () => null,
					tabBarIcon: ({ color }) => <Scan size={ICON_SIZE} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="records"
				options={{
					title: "Records",
					tabBarIcon: ({ color }) => <Folders size={ICON_SIZE} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color }) => <UserRound size={ICON_SIZE} color={color} />,
				}}
			/>
		</Tabs>
	);
}

function getTabBarPath(width: number, height: number) {
	const cornerRadius = 34;
	const notchWidth = Math.min(200, width * 0.7);
	const notchDepth = 65;
	const centerX = width / 2;
	const notchStartX = centerX - notchWidth / 2;
	const notchEndX = centerX + notchWidth / 2;
	const cp = notchWidth * 0.34;

	return [
		`M 0 ${cornerRadius}`,
		`Q 0 0 ${cornerRadius - 150} 0`,
		`L ${notchStartX} 0`,
		`C ${notchStartX + cp} 0 ${centerX - cp + 15} ${notchDepth} ${centerX} ${notchDepth}`,
		`C ${centerX + cp - 15} ${notchDepth} ${notchEndX - cp} 0 ${notchEndX} 0`,
		`L ${width - cornerRadius + 150} 0`,
		`Q ${width} 0 ${width} ${cornerRadius}`,
		`L ${width} ${height}`,
		`L 0 ${height}`,
		"Z",
	].join(" ");
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
	},
	bar: {
		overflow: "visible",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 14,
	},
	barSvg: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 4,
		bottom: 0,
	},
	row: {
		flex: 1,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		paddingHorizontal: 8,
		paddingTop: 18,
	},
	sideGroup: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "flex-end",
	},
	centerSpacer: {
		width: CENTER_SPACER,
	},
	tabItem: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-end",
		gap: 4,
		paddingHorizontal: 6,
	},
	tabItemInactive: {
		opacity: 0.7,
	},
	tabLabel: {
		color: "white",
	},
	centerButton: {
		position: "absolute",
		width: CENTER_BUTTON_SIZE,
		height: CENTER_BUTTON_SIZE,
		borderRadius: CENTER_BUTTON_SIZE / 2,
		backgroundColor: BAR_GRADIENT_START,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "white",
		left: "50%",
		top: -CENTER_BUTTON_SIZE / 4,
		transform: [{ translateX: -CENTER_BUTTON_SIZE / 2 }],
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 8 },
		elevation: 16,
		zIndex: 10,
	},
	centerButtonFocused: {
		shadowOpacity: 0.28,
		elevation: 18,
	},
	centerButtonInnerRing: {
		width: CENTER_BUTTON_SIZE - 16,
		height: CENTER_BUTTON_SIZE - 16,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "white",
	},
	calendarIconWrap: {
		width: ICON_SIZE,
		height: ICON_SIZE,
		alignItems: "center",
		justifyContent: "center",
	},
	calendarNumber: {
		position: "absolute",
		top: 10,
		left: 0,
		right: 0,
		textAlign: "center",
	},
});
