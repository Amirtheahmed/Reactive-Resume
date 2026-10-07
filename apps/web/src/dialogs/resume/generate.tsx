import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { applicationsListQueryOptions } from "@/features/applications/queries";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { client, orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";

const formSchema = z.object({
	jobTitle: z.string().trim().min(1).max(200),
	companyName: z.string().trim().max(200),
	jobDescription: z.string().trim().min(1).max(20_000),
});

/** Fork feature: a new resume for one job, generated from the Information Bank. */
type GenerateResumeDialogProps = {
	/** The application this resume is for: its posting fills the form, and the new resume is linked to it. */
	applicationId?: string | undefined;
};

export function GenerateResumeDialog({ applicationId }: GenerateResumeDialogProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	// Generation outlives the dialog: closing it mid-way must still finish the toast and the application link.
	// These run on the mutation itself, which callbacks passed to mutate() would not once the dialog is gone.
	const [opening] = useState(() => useDialogStore.getState().openCount);
	const stillOpen = () => useDialogStore.getState().open && useDialogStore.getState().openCount === opening;
	const { mutate: generateResume, isPending } = useMutation(
		orpc.copilot.generateResume.mutationOptions({
			onMutate: () => ({ toastId: toast.add({ type: "loading", description: t`Tailoring your resume...` }) }),
			onSuccess: async ({ id }, _input, context) => {
				// The resume exists either way; a failed link is not worth losing it over.
				if (applicationId) {
					await client.documents.linkApplication({ type: "resume", id, applicationId }).catch(() => {});
				}
				void queryClient.invalidateQueries();
				const openResume = () => void navigate({ to: "/builder/$resumeId", params: { resumeId: id } });
				if (stillOpen()) {
					toast.add({ type: "success", description: t`Your tailored resume is ready.`, id: context?.toastId });
					closeDialog();
					openResume();
				} else {
					// The dialog was closed meanwhile: say it's ready, and let the user choose when to go there.
					toast.add({
						type: "success",
						description: t`Your tailored resume is ready.`,
						id: context?.toastId,
						actionProps: { children: t`Open`, onClick: openResume },
					});
				}
			},
			onError: (error, _input, context) => {
				toast.add({
					type: "error",
					// The server explains what is missing: an Information Bank with something in it, or an AI provider.
					description: getOrpcErrorMessage(error, {
						allowServerMessage: true,
						fallback: t`Something went wrong. Please try again.`,
					}),
					id: context?.toastId,
				});
			},
		}),
	);

	// Usually loaded already wherever an application can be opened from; when it isn't, the form fills in as it arrives.
	const { data: applications } = useQuery({ ...applicationsListQueryOptions(), enabled: Boolean(applicationId) });
	const application = applications?.find((candidate) => candidate.id === applicationId);
	const fromApplication = useMemo(
		() => ({
			jobTitle: application?.role ?? "",
			companyName: application?.company ?? "",
			jobDescription: (application?.jobDescription ?? "").slice(0, 20_000),
		}),
		[application?.role, application?.company, application?.jobDescription],
	);

	const form = useAppForm({
		defaultValues: fromApplication,
		validators: { onSubmit: formSchema },
		onSubmit: ({ value }) => {
			const { companyName, ...job } = formSchema.parse(value);
			generateResume({ ...job, ...(companyName ? { companyName } : {}), template: "goldstar" });
		},
	});

	// Only ever fills an untouched form: what the user has typed is never replaced.
	const filled = useRef(false);
	useEffect(() => {
		if (!application || filled.current || form.state.isDirty) return;
		filled.current = true;
		form.reset(fromApplication);
	}, [application, form, fromApplication]);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<Icon name="auto_fix_high" size={16} />
					<Trans>Tailor a resume to a job</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Creates a new resume from your{" "}
						<Link
							to="/dashboard/information-bank"
							className="font-medium underline underline-offset-2"
							onClick={closeDialog}
						>
							Information Bank
						</Link>
						, keeping what matters for this job.
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
