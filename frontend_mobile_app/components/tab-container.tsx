import { generalStyles } from "@/styles/global";
import { ScrollView, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import P from "./p";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useEffect } from "react";

type Props = {
	children?: any;
	title: string;
	style?: ViewStyle;
	scroll?: boolean;
}

export default function TabContainer({ children, title, style, scroll }: Props) {
	const insets = useSafeAreaInsets();
	const isFocused = useIsFocused();
	// Navbar is absolutely positioned and overlaps the bottom of tab pages.
	// Add enough bottom padding so content isn't hidden behind the tab bar.
	const bottomPadding = 65 + insets.bottom + 20;

	const opacity = useSharedValue(1);
	const translateY = useSharedValue(0);

	useEffect(() => {
		if (!isFocused) return;
		opacity.value = 0;
		translateY.value = 6;
		opacity.value = withTiming(1, { duration: 180 });
		translateY.value = withTiming(0, { duration: 180 });
	}, [isFocused, opacity, translateY]);

	const pageStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateY: translateY.value }],
	}));

	if (scroll) {
		return (
			<SafeAreaView style={[generalStyles.tabPage, style]}>
				<Animated.View style={[{ flex: 1 }, pageStyle]}>
					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: bottomPadding, flexGrow: 1 }}
						keyboardShouldPersistTaps="handled"
					>
						<P size={35} weight="semiBold">{title}</P>
						{children}
					</ScrollView>
				</Animated.View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[generalStyles.tabPage, style, { paddingBottom: bottomPadding }]}>
			<Animated.View style={[{ flex: 1 }, pageStyle]}>
				<P size={35} weight="semiBold">{title}</P>
				<View style={{ flex: 1 }}>
					{children}
				</View>
			</Animated.View>
		</SafeAreaView>
	);
}
