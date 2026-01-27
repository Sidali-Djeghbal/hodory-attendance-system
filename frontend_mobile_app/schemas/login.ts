import z from "zod";

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(4, {
		error: "Password must be at least 4 chars",
	}),
});

export { loginSchema };
