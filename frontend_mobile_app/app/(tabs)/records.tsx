import TabContainer from "@/components/tab-container";
import { colors } from "@/styles/global";
import { History } from "@/types/record";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Calendar } from "react-native-calendars";
import fetcher, { API_URL } from "@/utils/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import P from "@/components/p";
import { useMemo, useState } from "react";
import { CircleCheck, CircleX, Upload, X } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import GradientButton from "@/components/gradient_btn";
import OutlinedButton from "@/components/outlined_btn";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type AttendanceRecord = {
	attendance_id: number;
	module_id: number;
	module_name: string;
	module_code?: string | null;
	room?: string | null;
	session_id: number;
	session_code?: string | null;
	session_date?: string | null;
	duration_minutes?: number | null;
	status: "present" | "absent" | "excluded" | string;
	has_justification?: boolean;
	justification_id?: number | null;
	justification_status?: string | null;
};

type AttendanceListResponse = {
	success: true;
	student_id: number;
	total_records: number;
	records: AttendanceRecord[];
};

type JustificationKind = "medical" | "administrative" | "other";

function dataToMarkedDates(data: History) {
	return Object.keys(data).reduce((acc, date) => {
		const value = data[date];

		let color;
		if (value === 0) {
			color = colors.green;
		} else if (value === 2) {
			color = "#F59E0B";
		} else {
			color = "#AA0000";
		}

		acc[date] = {
			customStyles: {
				container: {
					backgroundColor: color,
					borderRadius: 90,
				},
				text: {
					color: "white",
				},
			},
		};

		return acc;
	}, {} as any);
}

function dayKeyFromIso(iso: string) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
		date.getDate(),
	).padStart(2, "0")}`;
}

function formatDayTitle(key: string) {
	const date = new Date(`${key}T00:00:00`);
	if (Number.isNaN(date.getTime())) return key;
	return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatTimeRange(iso: string, durationMinutes?: number | null) {
	const start = new Date(iso);
	if (Number.isNaN(start.getTime())) return "—";
	const startLabel = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(start);
	if (!durationMinutes) return startLabel;
	const end = new Date(start.getTime() + durationMinutes * 60_000);
	const endLabel = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(end);
	return `${startLabel} - ${endLabel}`;
}

export default function Records() {
	const token = useAuth(state => state.token);
	const userId = useAuth(state => state.user?.id);
	const queryClient = useQueryClient();
	const [selectedDay, setSelectedDay] = useState<string | null>(null);

	const [justificationOpen, setJustificationOpen] = useState(false);
	const [justificationStep, setJustificationStep] = useState<0 | 1 | 2 | 3>(0);
	const [justificationKind, setJustificationKind] = useState<JustificationKind | null>(null);
	const [justificationNotes, setJustificationNotes] = useState("");
	const [justificationFile, setJustificationFile] = useState<{
		uri: string;
		name: string;
		mimeType?: string;
		size?: number;
	} | null>(null);
	const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { status, data } = useQuery({
		queryKey: ["attendance", userId ?? "anon"],
		enabled: Boolean(token),
		queryFn: async () => {
			const res = await fetcher<AttendanceListResponse>({
				method: "GET",
				route: "/student/attendance",
				token,
			});
			if (!res.ok) throw new Error(`${res.status}: ${res.statusText ?? "Request failed"}`);
			return res.data;
		},
	});

	const records = useMemo(() => data?.records ?? [], [data?.records]);

	const history: History = useMemo(() => {
		const next: History = {};
		for (const rec of records) {
			if (!rec.session_date) continue;
			const key = dayKeyFromIso(rec.session_date);
			if (!key) continue;

			// 0=all good, 1=unjustified absence exists, 2=justification pending exists
			const prev = next[key];
			const isAbsent = rec.status === "absent";
			const hasJustification = Boolean(rec.justification_id);
			const isPending = rec.justification_status === "pending";

			let nextValue = prev ?? 0;
			if (isAbsent && !hasJustification) nextValue = 1;
			else if (isAbsent && isPending && nextValue !== 1) nextValue = 2;

			next[key] = nextValue;
		}
		return next;
	}, [records]);

	const selectedRecords = useMemo(() => {
		if (!selectedDay) return [];
		return records
			.filter((r) => r.session_date && dayKeyFromIso(r.session_date) === selectedDay)
			.slice()
			.sort((a, b) => new Date(a.session_date ?? 0).getTime() - new Date(b.session_date ?? 0).getTime());
	}, [records, selectedDay]);

	if (status === "pending") {
		return (
			<TabContainer title="Attendence History">
				<P>Loading…</P>
			</TabContainer>
		);
	}

	if (status === "error") {
		return (
			<TabContainer title="Attendence History">
				<P>Failed to load attendance history.</P>
			</TabContainer>
		);
	}

	const openJustification = (rec: AttendanceRecord) => {
		setSelectedRecord(rec);
		setSubmitError(null);
		setJustificationKind(null);
		setJustificationNotes("");
		setJustificationFile(null);
		setJustificationStep(0);
		setJustificationOpen(true);
	};

	const closeJustification = () => {
		setJustificationOpen(false);
		setSelectedRecord(null);
		setSubmitError(null);
	};

	const pickFile = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: ["application/pdf", "image/*"],
				multiple: false,
				copyToCacheDirectory: true,
			});

			if (result.canceled) return;
			const file = result.assets?.[0];
			if (!file?.uri) return;

			setJustificationFile({
				uri: file.uri,
				name: file.name ?? "justification",
				mimeType: file.mimeType ?? undefined,
				size: file.size ?? undefined,
			});
		} catch (e) {
			setSubmitError(e instanceof Error ? e.message : "Failed to pick file.");
		}
	};

	const submitJustification = async () => {
		if (!token || !selectedRecord) return;
		setIsSubmitting(true);
		setSubmitError(null);

		const kindLabel =
			justificationKind === "medical"
				? "Medical"
				: justificationKind === "administrative"
					? "Administrative"
					: "Other";

		const baseComment = `${kindLabel} justification.`;
		const notes = justificationNotes.trim();
		const comment = notes.length >= 10 ? notes : `${baseComment} ${notes}`.trim();
		const safeComment = comment.length >= 10 ? comment : `${baseComment} (no additional notes)`;

		try {
			const form = new FormData();
			form.append("attendance_record_id", String(selectedRecord.attendance_id));
			form.append("comment", safeComment);
			if (justificationFile) {
				form.append("file", {
					uri: justificationFile.uri,
					name: justificationFile.name,
					type: justificationFile.mimeType ?? "application/octet-stream",
				} as any);
			}

			const res = await fetch(`${API_URL}/student/justifications`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
				body: form,
			});

			if (!res.ok) {
				let message = `Upload failed (${res.status}).`;
				try {
					const data = await res.json();
					if (data?.detail) message = String(data.detail);
					else if (data?.message) message = String(data.message);
				} catch {
					// ignore
				}
				setSubmitError(message);
				return;
			}

			await queryClient.invalidateQueries({ queryKey: ["attendance", userId ?? "anon"] });
			setJustificationStep(3);
		} catch (e) {
			setSubmitError(e instanceof Error ? e.message : "Upload failed.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return <TabContainer title="Attendence History" scroll>

		<Calendar
			style={style.cal}
			markingType="custom"
			markedDates={dataToMarkedDates(history)}
			onDayPress={(day) => {
				setSelectedDay(day.dateString);
			}}
		/>

		<View style={{ marginTop: 18 }}>
			<P size={22} weight="semiBold">Detailed history</P>
			<P weight="medium" size={12} color="#3C3C4399" style={{ marginTop: 6 }}>
				{selectedDay ? `Selected: ${formatDayTitle(selectedDay)}` : "select a day to view detailed informations."}
			</P>

			{selectedDay && selectedRecords.length === 0 ? (
				<P weight="medium" size={12} color="#3C3C4399" style={{ marginTop: 6 }}>
					No sessions on this day.
				</P>
			) : selectedDay && selectedRecords.length > 0 && !selectedRecords.some((r) => r.status === "absent") ? (
				<P weight="medium" size={12} color="#3C3C4399" style={{ marginTop: 6 }}>
					Great, you don’t have any absences on this day.
				</P>
			) : null}

			{selectedDay && selectedRecords.length > 0 ? (
				<Animated.View
					key={`selected-records-${selectedDay}`}
					entering={FadeIn.duration(160)}
					exiting={FadeOut.duration(120)}
					style={{ marginTop: 12, gap: 12 }}
				>
					{selectedRecords.map((rec) => {
						const isAbsent = rec.status === "absent";
						const isPresent = rec.status === "present";
						const isApproved = rec.justification_status === "approved";
						const isPending = rec.justification_status === "pending";

						const statusLabel = isPresent
							? "Present"
							: isAbsent && isApproved
								? "Justified"
								: isAbsent && isPending
									? "Pending"
									: isAbsent
										? "Not justified"
										: rec.status;

						const isClickable = isAbsent && !rec.justification_id;
						const statusColor =
							statusLabel === "Not justified"
								? colors.red
								: statusLabel === "Pending"
									? "#F59E0B"
									: colors.green;

						return (
							<Pressable
								key={`${rec.attendance_id}`}
								style={[style.cardRow, isClickable && style.cardRowClickable]}
								onPress={() => {
									if (!isClickable) return;
									openJustification(rec);
								}}
							>
								<View style={style.cardHeader}>
									<P size={12} weight="semiBold" color="white">Date</P>
									<P size={12} weight="semiBold" color="white">session</P>
									<P size={12} weight="semiBold" color="white">Status</P>
								</View>
								<View style={style.cardBody}>
									<View style={{ flex: 1 }}>
										<P size={14} weight="semiBold">
											{selectedDay ? formatDayTitle(selectedDay) : "—"}
										</P>
										<P size={14} weight="semiBold">
											{rec.session_date ? formatTimeRange(rec.session_date, rec.duration_minutes) : "—"}
										</P>
									</View>
									<View style={{ flex: 2 }}>
										<P size={22} weight="bold">
											{rec.module_name}
										</P>
										<P size={12} weight="semiBold" color="#3C3C4399">
											{rec.module_code ? rec.module_code : "Session"}
										</P>
									</View>
									<View style={{ width: 130, alignItems: "flex-end", justifyContent: "center" }}>
										<View
											style={[
												style.statusPill,
												(statusLabel === "Not justified") && { borderColor: colors.red },
												(statusLabel === "Pending") && { borderColor: "#F59E0B" },
											]}
										>
											{statusLabel === "Justified" || statusLabel === "Present" ? (
												<CircleCheck size={28} color={colors.green} />
											) : statusLabel === "Not justified" ? (
												<CircleX size={28} color={colors.red} />
											) : (
												<CircleCheck size={28} color="#F59E0B" />
											)}
											<View style={{ flex: 1 }}>
												<P
													size={14}
													weight="bold"
													style={{ color: statusColor }}
												>
													{statusLabel}
												</P>
												{isClickable ? (
													<P size={10} weight="medium" color="#3C3C4399">
														Click to justify
													</P>
												) : null}
											</View>
										</View>
									</View>
								</View>
							</Pressable>
						);
					})}
				</Animated.View>
			) : null}
		</View>

		<Modal
			transparent
			visible={justificationOpen}
			animationType="fade"
			onRequestClose={closeJustification}
		>
			<View style={style.modalOverlay}>
				<View style={style.modalCard}>
					<View style={style.modalHeader}>
						<P size={16} weight="semiBold">Upload justification</P>
						<Pressable onPress={closeJustification} hitSlop={10}>
							<X size={20} />
						</Pressable>
					</View>

					<Animated.View
						key={`justification-step-${justificationStep}`}
						entering={FadeIn.duration(160)}
						exiting={FadeOut.duration(120)}
					>
						{justificationStep === 0 ? (
							<>
							<P size={12} weight="semiBold" color="#3C3C4399" style={{ marginTop: 8 }}>
								Select justification type
							</P>
							<View style={style.kindRow}>
								<Pressable
									style={[style.kindCard, justificationKind === "medical" && style.kindCardSelected]}
									onPress={() => setJustificationKind("medical")}
								>
									<P weight="semiBold" size={12} color={justificationKind === "medical" ? "white" : "black"}>Medical</P>
								</Pressable>
								<Pressable
									style={[style.kindCard, justificationKind === "administrative" && style.kindCardSelected]}
									onPress={() => setJustificationKind("administrative")}
								>
									<P weight="semiBold" size={12} color={justificationKind === "administrative" ? "white" : "black"}>Administrative</P>
								</Pressable>
								<Pressable
									style={[style.kindCard, justificationKind === "other" && style.kindCardSelected]}
									onPress={() => setJustificationKind("other")}
								>
									<P weight="semiBold" size={12} color={justificationKind === "other" ? "white" : "black"}>Other</P>
								</Pressable>
							</View>

							<View style={style.modalFooter}>
								<View style={{ flex: 1 }} />
								<GradientButton
									disabled={!justificationKind}
									onPress={() => setJustificationStep(1)}
								>
									Next
								</GradientButton>
							</View>
							</>
						) : null}

						{justificationStep === 1 ? (
							<>
							<P size={12} weight="semiBold" color="#3C3C4399" style={{ marginTop: 8 }}>
								Select your file
							</P>
							<Pressable style={style.dropZone} onPress={pickFile}>
								<Upload size={28} color={colors.green} />
								<P size={12} weight="medium" color="#3C3C4399" style={{ marginTop: 8 }}>
									{justificationFile ? justificationFile.name : "Click to select a file…"}
								</P>
								<P size={10} weight="medium" color="#3C3C4399" style={{ marginTop: 4 }}>
									Note: accepted files under 5MB size
								</P>
							</Pressable>

							<View style={style.modalFooter}>
								<OutlinedButton onPress={() => setJustificationStep(0)}>Back</OutlinedButton>
								<GradientButton onPress={() => setJustificationStep(2)}>Next</GradientButton>
							</View>
							</>
						) : null}

						{justificationStep === 2 ? (
							<>
							<P size={12} weight="semiBold" color="#3C3C4399" style={{ marginTop: 8 }}>
								Additional notes
							</P>
							<TextInput
								style={style.notes}
								placeholder="(optional)"
								multiline
								value={justificationNotes}
								onChangeText={setJustificationNotes}
							/>

							{submitError ? (
								<P size={12} weight="medium" style={{ color: colors.red, marginTop: 8 }}>
									{submitError}
								</P>
							) : null}

							<View style={style.modalFooter}>
								<OutlinedButton onPress={() => setJustificationStep(1)} disabled={isSubmitting}>
									Back
								</OutlinedButton>
								<GradientButton onPress={submitJustification} disabled={isSubmitting}>
									Submit
								</GradientButton>
							</View>
							</>
						) : null}

						{justificationStep === 3 ? (
							<>
							<View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
								<CircleCheck size={64} color={colors.green} />
								<P size={16} weight="semiBold" style={{ marginTop: 12 }}>
									Justification uploaded successfully
								</P>
								<P size={12} weight="medium" color="#3C3C4399" style={{ marginTop: 8, textAlign: "center" }}>
									You will receive a notification once the teacher reviews your justification.
								</P>
							</View>
							<View style={style.modalFooter}>
								<View style={{ flex: 1 }} />
								<OutlinedButton onPress={closeJustification}>Close</OutlinedButton>
							</View>
							</>
						) : null}
					</Animated.View>
				</View>
			</View>
		</Modal>

	</TabContainer>;
}

const style = StyleSheet.create({
	cal: {
		borderRadius: 16,
	},
	cardRow: {
		backgroundColor: "white",
		borderRadius: 18,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#00000010",
	},
	cardRowClickable: {
		borderColor: "#00000025",
	},
	cardHeader: {
		backgroundColor: "#222",
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	cardBody: {
		flexDirection: "row",
		gap: 12,
		padding: 12,
		alignItems: "center",
	},
	statusPill: {
		flexDirection: "row",
		gap: 10,
		alignItems: "center",
		padding: 10,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#00000010",
		backgroundColor: "#F6F7F9",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.35)",
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
	},
	modalCard: {
		width: "100%",
		maxWidth: 360,
		backgroundColor: "white",
		borderRadius: 18,
		padding: 16,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	kindRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 12,
	},
	kindCard: {
		flex: 1,
		height: 56,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#00000020",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "white",
	},
	kindCardSelected: {
		backgroundColor: colors.green,
		borderColor: colors.green,
	},
	dropZone: {
		marginTop: 12,
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: "#56B8AE",
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 22,
		paddingHorizontal: 12,
		backgroundColor: "#56B8AE10",
	},
	notes: {
		marginTop: 10,
		borderWidth: 1,
		borderColor: "#00000020",
		borderRadius: 12,
		padding: 10,
		minHeight: 90,
		textAlignVertical: "top",
	},
	modalFooter: {
		marginTop: 14,
		flexDirection: "row",
		gap: 10,
		justifyContent: "space-between",
		alignItems: "center",
	},
});
