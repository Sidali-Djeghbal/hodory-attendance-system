import { formStyle } from "@/styles/forms";
import type { AnyFieldApi } from "@tanstack/react-form";
import P from "../p";

export default function FieldInfo({ field }: { field: AnyFieldApi }) {
	return (
		<>
			{field.state.meta.isTouched && !field.state.meta.isValid
				? (
					<P weight="light" style={formStyle.fieldInfo}>
						{field.state.meta.errors.map((e) => e.message).join(",")}
					</P>
				)
				: null}
		</>
	);
}
