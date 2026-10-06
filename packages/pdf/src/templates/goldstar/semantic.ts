import type { TemplateSemanticManifest } from "../../semantic/template-manifest";
import { baseManifest, itemHeaderRowPart } from "../../semantic/shared-parts";

export const goldstarSemanticManifest = baseManifest("goldstar", [
	itemHeaderRowPart,
]) satisfies TemplateSemanticManifest;
