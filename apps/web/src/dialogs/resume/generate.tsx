import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { useDialogStore } from "../store";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";

const formSchema = z.object({
	jobTitle: z.string().trim().min(1).max(200),
	companyName: z.string().trim().max(200),
	jobDescription: z.string().trim().min(1).max(20_000),
});

/** Fork feature: a new resume for one job, generated from the resume tagged "master". */
export function GenerateResumeDialog() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { mutate: generateResume, isPending } = useMutation(orpc.copilot.generateResume.mutationOptions());

	const form = useAppForm({
		defaultValues: { jobTitle: "", companyName: "", jobDescription: "" },
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			const toastId = toast.add({ type: "loading", description: t`Tailoring your resume...` });
			const { companyName, ...job } = formSchema.parse(value);

			generateResume(
				{ ...job, ...(companyName ? { companyName } : {}), template: "goldstar" },
				{
					onSuccess: ({ id }) => {
						toast.add({ type: "success", description: t`Your tailored resume is ready.`, id: toastId });
						void queryClient.invalidateQueries();
						closeDialog();
						void navigate({ to: "/builder/$resumeId", params: { resumeId: id } });
					},
					onError: (error) => {
						toast.add({
							type: "error",
							// The server explains what is missing: a master resume, or an AI provider.
							description: getOrpcErrorMessage(error, {
								allowServerMessage: true,
								fallback: t`Something went wrong. Please try again.`,
							}),
							id: toastId,
						});
					},
				},
			);
		},
	});

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<Icon name="auto_fix_high" size={16} />
					<Trans>Tailor a resume to a job</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Creates a new resume from your master resume (the one tagged “master”), keeping what matters for this job.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="jobTitle">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Job title</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="companyName">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Company</Trans>
							</FormLabel>
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="jobDescription">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Job description</Trans>
							</FormLabel>
							<FormControl
								render={
									<Textarea
										rows={8}
										className="max-h-64"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<DialogFooter>
					<Button type="submit" disabled={isPending}>
						<Trans>Generate</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
