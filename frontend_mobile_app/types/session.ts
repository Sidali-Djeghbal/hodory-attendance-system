export type Session = {
	id: number;
	day: Day;
	module_name: string;
	module_code: string;
	time: string;
	// type: "Course lecture" | "Practical work" | "Theoretical work";
	room: string;
};

export enum Day {
	SUNDAY = "Sunday",
	MONDAY = "Monday",
	TUESDAY = "Tuesday",
	WEDNESDAY = "Wednesday",
	THURSDAY = "Thursday",
}

