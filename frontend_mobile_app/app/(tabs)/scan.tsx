import TabContainer from "@/components/tab-container";
import { colors } from "@/styles/global";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import P from "@/components/p";
import fetcher from "@/utils/api";
import { useAuth } from "@/stores/auth";

type HodoryQrPayloadV1 = {
	v: 1;
	type: "hodory.attendance.session";
	session?: {
		code?: string;
	};
};

export default function Scan() {
	const [permission, requestPermission] = useCameraPermissions();
	const [isScanning, setIsScanning] = useState(false);
	const [hasScanned, setHasScanend] = useState(false);
	const token = useAuth(state => state.token);

	const stopScanning = () => {
		setIsScanning(false);
		setHasScanend(false);
	};

	const startScanning = async () => {
		const response = permission?.granted ? permission : await requestPermission();

		if (!response || !response.granted) {
			Alert.alert(
				"Camera Permission Needed",
				"Please allow camera access to scan the QR code.",
			);
			return;
		}

		setHasScanend(false);
		setIsScanning(true);
	};

	const onPressScan = () => {
		if (isScanning) stopScanning();
		else startScanning();
	};

	const onBarcodeScanned = useCallback(async (result: { data?: string }) => {
		if (hasScanned) return;
		setHasScanend(true);
		setIsScanning(false);

		if (!token) {
			Alert.alert("Not signed in", "Please log in before scanning.");
			stopScanning();
			return;
		}

		const raw = result?.data?.trim();
		if (!raw) {
			Alert.alert("QR Code Scanned", "No data found in QR code.");
			stopScanning();
			return;
		}

		let payload: HodoryQrPayloadV1 | null = null;
		let sessionCode = raw;
		try {
			const parsed = JSON.parse(raw);
			if (parsed?.type === "hodory.attendance.session" && parsed?.v === 1) {
				payload = parsed as HodoryQrPayloadV1;
				if (payload.session?.code) sessionCode = payload.session.code;
			}
		} catch {
			// Not JSON. Treat as raw session code.
		}

		const res = await fetcher({
			data: { session_code: sessionCode },
			method: "POST",
			route: "/student/attendance/mark",
			token,
		});

		if (!res.ok) {
			Alert.alert(
				"Attendance failed",
				`${res.status}: ${res.statusText ?? "Request failed"}`,
			);
			return;
		}

		Alert.alert("Attendance marked successfully");
	}, [hasScanned, token]);

	return (
		<TabContainer title="Mark Attendance">
			<View style={styles.body}>
				<View style={styles.card}>
					<View style={styles.cardContent}>
						{isScanning ? (
							<>
								<CameraView
									style={StyleSheet.absoluteFill}
									facing="back"
									barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
									onBarcodeScanned={onBarcodeScanned}
								/>

								<View pointerEvents="none" style={styles.scanOverlay}>
									<View style={styles.scanFrame} />
									<P size={14} color="white">
										Point your camera at the QR code
									</P>
								</View>
							</>
						) : (
							<View style={styles.placeholder}>
								<P size={14} color="#3C3C4399">
									Tap “Scan Code” to open the camera.
								</P>
							</View>
						)}
					</View>

					<TouchableOpacity
						activeOpacity={0.8}
						onPress={onPressScan}
						style={styles.scanButton}
					>
						<P size={22} weight="medium" color="white">
							{isScanning ? "Cancel" : "Scan Code"}
						</P>
					</TouchableOpacity>
				</View>
			</View>
		</TabContainer>
	);
}

const styles = StyleSheet.create({
	body: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingBottom: 90,
	},
	card: {
		width: "100%",
		maxWidth: 300,
		height: 350,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: "#56B8AE",
		backgroundColor: colors.bg,
		overflow: "hidden",
	},
	cardContent: {
		flex: 1,
		backgroundColor: "#0B0F14",
		position: "relative",
	},
	placeholder: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 16,
	},
	scanOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
		justifyContent: "center",
		gap: 14,
		paddingHorizontal: 16,
	},
	scanFrame: {
		width: 210,
		height: 210,
		borderRadius: 18,
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.9)",
		backgroundColor: "rgba(0,0,0,0.10)",
	},
	scanButton: {
		height: 76,
		backgroundColor: "#56B8AE",
		alignItems: "center",
		justifyContent: "center",
	},
});
