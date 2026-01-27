export type Update = {
	id: number;
	type: "good" | "warning" | "bad";
	text: string;
};

