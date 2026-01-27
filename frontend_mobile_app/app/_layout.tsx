import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60_000,
			gcTime: 10 * 60_000,
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

export default function RootLayout() {
	const [loaded, error] = useFonts({
		Poppins: require("../assets/fonts/poppins/Poppins-Regular.ttf"),
		"Poppins-ExtraBold": require(
			"../assets/fonts/poppins/Poppins-ExtraBold.ttf",
		),
		"Poppins-Bold": require("../assets/fonts/poppins/Poppins-Bold.ttf"),
		"Poppins-SemiBold": require("../assets/fonts/poppins/Poppins-SemiBold.ttf"),
		"Poppins-Medium": require("../assets/fonts/poppins/Poppins-Medium.ttf"),
		"Poppins-Light": require("../assets/fonts/poppins/Poppins-Light.ttf"),
	});

	useEffect(() => {
		if (loaded || error) SplashScreen.hideAsync();
	}, [loaded, error]);

	if (!loaded && !error) return null;

	return (
		<QueryClientProvider client={queryClient}>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: "slide_from_right",
					gestureEnabled: true,
				}}
			>
				<Stack.Screen name="index" />
				<Stack.Screen name="forgot-pass" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="updates" options={{ animation: "fade" }} />
			</Stack>
		</QueryClientProvider>
	);
}
