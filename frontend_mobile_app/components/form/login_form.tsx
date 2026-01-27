import { loginSchema } from "@/schemas/login";
import { formStyle } from "@/styles/forms";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { useState } from "react";
import GradientButton from "../gradient_btn";
import StyledInput from "../input";
import P from "../p";
import FieldInfo from "./field_info";
import { API_URL } from "@/utils/api";
import { useAuth } from "@/stores/auth";

export default function LoginForm() {
	const router = useRouter();

	const [submitError, setSubmitError] = useState<string | null>(null);
	const loginState = useAuth(state => state.login);

	const form = useForm({
		defaultValues: {
			email: "sidali@test.brk",
			password: "student123",
		},
		validators: {
			onChange: loginSchema,
		},
		onSubmit: async ({ value }) => {
			const { email, password } = value;

			try {
				const res = await fetch(`${API_URL}/auth/login`, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ email, password }),
				});

				if (!res.ok) {
					let message = `Login failed (${res.status}).`;
					try {
						const data = await res.json();
						if (data?.detail) message = String(data.detail);
						else if (data?.message) message = String(data.message);
					} catch {
						// ignore non-JSON response
					}
					setSubmitError(message);
					return;
				}

				const { access_token: token, user } = await res.json();
				await loginState(user, token);

				setSubmitError(null);
				router.push("/home");
			} catch {
				const isLocalhost =
					API_URL.includes("127.0.0.1") || API_URL.includes("localhost");
				setSubmitError(
					isLocalhost
						? `Can't reach the server (${API_URL}). If you're using an installed APK, set EXPO_PUBLIC_API_URL to your server IP (e.g. http://192.168.1.10:8000/api) and rebuild.`
						: `Can't reach the server (${API_URL}). Make sure your phone and the server are on the same Wi‑Fi/hotspot and the backend is running.`,
				);
			}
		},
	});

	return (
		<>
			<form.Field name="email">
				{(field) => (
					<>
						<StyledInput
							value={field.state.value}
							onChangeText={field.handleChange}
							placeholder="Email"
						/>
						<FieldInfo field={field} />
					</>
				)}
			</form.Field>

			<form.Field name="password">
				{(field) => (
					<>
						<StyledInput
							value={field.state.value}
							onChangeText={field.handleChange}
							placeholder="Password"
						/>
						<FieldInfo field={field} />
					</>
				)}
			</form.Field>

			{submitError && (
				<P weight="light" style={formStyle.fieldInfo}>
					{submitError}
				</P>
			)}

			<P
				weight="light"
				style={formStyle.forgotPassword}
				onPress={() => {
					router.push("/forgot-pass");
				}}
			>
				Forgot password?
			</P>

			<form.Subscribe selector={(state) => [state.isSubmitting]}>
				{([isSubmitting]) => (
					<GradientButton
						onPress={() => {
							form.handleSubmit();
						}}
						disabled={isSubmitting}
					>
						Sign in
					</GradientButton>
				)}
			</form.Subscribe>
		</>
	);
}
