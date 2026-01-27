export type Role = "admin" | "teacher" | "student";

export type User = {
	id: number;
	full_name: string;
	email: string;
	departement: string;
	role: Role;
}

export type Level = {
	id: number;
	name: string;
	year_level: number;
}

export type Student = {
	id: number;
	full_name: string;
	email: string;
	departement: string;
	level: Level;
	enrollements_count: number;
}
