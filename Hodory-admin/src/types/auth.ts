export type Role = "admin" | "teacher" | "student";

export type User = {
	id: number;
	full_name: string;
	email: string;
	departement: string;
	is_active: boolean;
	is_superuser: boolean;
	role: Role;
}

