import type { EntryWriter } from "@/features/resume/editor/write/fields";
import type { Entry } from "@/features/resume/editor/write/model";
import type { DragEndEvent } from "@dnd-kit/core";
import type { BankSection } from "@reactive-resume/schema/resume/information-bank";
import type { ReactNode } from "react";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { formatResumeDates, getPresentLabel } from "@reactive-resume/schema/resume/dates";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Collapsible, CollapsibleContent } from "@reactive-resume/ui/components/collapsible";
import { Icon } from "@reactive-resume/ui/components/icon";
import { IconButton } from "@reactive-resume/ui/components/icon-button";
import { toast } from "@reactive-resume/ui/components/toast";
import { generateId } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { useBankStore } from "./bank-store";
import { EntryFields } from "@/features/resume/editor/write/entries";
import { TextField } from "@/features/resume/editor/write/fields";
import { createEntry, describeEntry } from "@/features/resume/editor/write/model";
import { useSortSensors } from "@/features/resume/editor/write/outline";
import { RichTextEditor } from "@/features/resume/editor/write/rich-text-editor";
import { DRAG_SETTLE } from "@/libs/motion";

// Fork feature: the Information Bank's lists. Each entry is a card that opens in place, saved as you type.

type BankCardProps = {
	id: string;
	title: string;
	meta?: string;
	open: boolean;
	onToggle: () => void;
	onDelete: () => void;
	/** Entries can be kept but left out of everything generated. Notes have no such switch. */
	excluded?: boolean;
	onToggleExcluded?: () => void;
	children: ReactNode;
};

function BankCard({ id, title, meta, open, onToggle, onDelete, excluded, onToggleExcluded, children }: BankCardProps) {
	const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
		id,
		transition: DRAG_SETTLE,
	});

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Translate.toString(transform), transition }}
			className={cn(
				"group/entry relative rounded-[10px] border border-line bg-surface transition-[border-color,box-shadow] duration-quick ease-enter",
				open && "border-accent shadow-e1",
				isDragging && "z-10 bg-raised shadow-e2",
			)}
		>
			<div className="flex items-center gap-0.5 pe-1">
				<button
					type="button"
					aria-label={t`Reorder ${title || t`Untitled`}`}
					className="-ms-px flex h-10 w-5 shrink-0 cursor-grab items-center justify-center text-ink-3 opacity-0 transition-opacity duration-quick group-hover/entry:opacity-100 focus-visible:opacity-100 active:cursor-grabbing max-lg:opacity-100"
					{...attributes}
					{...listeners}
				>
					<Icon name="drag_indicator" size={16} />
				</button>
				<button
					type="button"
					aria-expanded={open}
					onClick={onToggle}
					className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-[9px] py-2.5 ps-0.5 pe-2 text-start"
				>
					<span className="flex max-w-full items-center gap-2">
						<span
							className={cn("truncate text-[13px] leading-[18px] font-semibold", (!title || excluded) && "text-ink-3")}
						>
							{title || <Trans>Untitled</Trans>}
						</span>
						{excluded && (
							<Badge variant="outline" className="shrink-0">
								<Trans>Not used</Trans>
							</Badge>
						)}
					</span>
					{meta && <span className="max-w-full truncate text-xs leading-4 text-ink-3">{meta}</span>}
				</button>

				{onToggleExcluded && (open || excluded) && (
					<IconButton
						icon={excluded ? "visibility_off" : "visibility"}
						label={excluded ? t`Use this entry again` : t`Keep, but don't use when generating`}
						size="icon-sm"
						className="text-ink-2"
						onClick={onToggleExcluded}
					/>
				)}
				{open && (
					<IconButton
						icon="delete"
						label={t`Delete entry`}
						size="icon-sm"
						className="text-ink-2 hover:bg-danger-soft hover:text-danger-text"
						onClick={onDelete}
					/>
				)}
			</div>

			<Collapsible open={open}>
				<CollapsibleContent>
					<div className="grid min-w-0 gap-x-3 gap-y-2.5 border-t border-line px-3 pt-3 pb-3.5 sm:grid-cols-2">
						{children}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

type Row = { id: string };

type SortableCardsProps<T extends Row> = {
	rows: readonly T[];
	onMove: (from: number, to: number) => void;
	children: (row: T) => ReactNode;
};

function SortableCards<T extends Row>({ rows, onMove, children }: SortableCardsProps<T>) {
	const sensors = useSortSensors();
	const ids = rows.map((row) => row.id);

	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return;
		onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
	};

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
			<SortableContext items={ids} strategy={verticalListSortingStrategy}>
				<div className="grid gap-2">{rows.map(children)}</div>
			</SortableContext>
		</DndContext>
	);
}

/**
 * The list editing every bank section shares: add, reorder, and delete with Undo. `pick` finds the list
 * inside an immer draft of the bank.
 */
function useBankList<T extends Row>(
	pick: (bank: NonNullable<ReturnType<typeof useBankStore.getState>["bank"]>) => T[],
) {
	const edit = useBankStore((state) => state.edit);
	const [openId, setOpenId] = useState<string | null>(null);

	return {
		openId,
		toggle: (id: string) => setOpenId((current) => (current === id ? null : id)),
		add: (row: T) => {
			edit((draft) => {
				pick(draft).push(row);
			});
			setOpenId(row.id);
		},
		move: (from: number, to: number) =>
			edit((draft) => {
				const list = pick(draft);
				const [row] = list.splice(from, 1);
				if (row) list.splice(to, 0, row);
			}),
		change: (id: string, mutate: (row: T) => void) =>
			edit((draft) => {
				const row = pick(draft).find((candidate) => candidate.id === id);
				if (row) mutate(row);
			}),
		remove: (id: string) => {
			const bank = useBankStore.getState().bank;
			if (!bank) return;
			// Read from the saved state, not the draft: a draft is gone by the time Undo is pressed.
			const index = pick(bank).findIndex((row) => row.id === id);
			const removed = pick(bank)[index];
			if (!removed) return;
			const previousId = pick(bank)[index - 1]?.id;
			const owner = useBankStore.getState().owner;
			edit((draft) => {
				pick(draft).splice(index, 1);
			});
			toast.add({
				description: t`Entry deleted`,
				actionProps: {
					children: t`Undo`,
					onClick: () =>
						edit((draft) => {
							// Back after the entry it followed, wherever that is now; the list may have been reordered since.
							// Never twice, and never into a bank someone else has loaded meanwhile.
							const list = pick(draft);
							if (useBankStore.getState().owner !== owner || list.some((row) => row.id === removed.id)) return;
							const after = previousId ? list.findIndex((row) => row.id === previousId) : -1;
							list.splice(after === -1 ? Math.min(index, list.length) : after + 1, 0, removed);
						}),
				},
			});
		},
	};
}

type AddButtonProps = { label: string; onClick: () => void };

function AddButton({ label, onClick }: AddButtonProps) {
	return (
		<Button variant="ghost" size="sm" className="w-fit text-ink-2" onClick={onClick}>
			<Icon name="add" size={16} />
			{label}
		</Button>
	);
}

type BankEntriesProps = { type: BankSection; addLabel: string };

/** One section of the bank: its entries, with the same fields a resume entry has, minus how they print. */
export function BankEntries({ type, addLabel }: BankEntriesProps) {
	const { i18n } = useLingui();
	const entries = useBankStore((state) => state.bank?.sections[type]) as Entry[] | undefined;
	const list = useBankList<Entry>((bank) => bank.sections[type] as Entry[]);
	const dateOptions = { locale: i18n.locale, presentLabel: getPresentLabel(i18n.locale) };

	return (
		<>
			<SortableCards rows={entries ?? []} onMove={list.move}>
				{(entry) => {
					// The bank keeps structured dates only, so the line under the title is written from them here.
					const dates = (entry as { dates?: Parameters<typeof formatResumeDates>[0] }).dates;
					const text = dates ? formatResumeDates(dates, dateOptions) : "";
					const { title, meta } = describeEntry(type, { ...entry, period: text, date: text } as Entry);
					const write: EntryWriter = (_key, mutate) =>
						list.change(entry.id, (row) => mutate(row as Record<string, unknown>));

					return (
						<BankCard
							key={entry.id}
							id={entry.id}
							title={title}
							meta={meta}
							open={list.openId === entry.id}
							onToggle={() => list.toggle(entry.id)}
							onDelete={() => list.remove(entry.id)}
							excluded={entry.hidden}
							onToggleExcluded={() =>
								list.change(entry.id, (row) => {
									row.hidden = !row.hidden;
								})
							}
						>
							<EntryFields type={type} entry={entry} write={write} page={{ locale: i18n.locale }} contentOnly />
						</BankCard>
					);
				}}
			</SortableCards>
			<AddButton label={addLabel} onClick={() => list.add(createEntry(type))} />
		</>
	);
}

/** Free-form facts for the AI: an FAQ, preferences, side projects. Never printed. */
export function BankNotes() {
	const notes = useBankStore((state) => state.bank?.notes);
	const list = useBankList((bank) => bank.notes);

	return (
		<>
			<SortableCards rows={notes ?? []} onMove={list.move}>
				{(note) => (
					<BankCard
						key={note.id}
						id={note.id}
						title={note.title}
						open={list.openId === note.id}
						onToggle={() => list.toggle(note.id)}
						onDelete={() => list.remove(note.id)}
					>
						<TextField
							wide
							label={<Trans>Title</Trans>}
							value={note.title}
							maxLength={200}
							onChange={(title) =>
								list.change(note.id, (row) => {
									row.title = title;
								})
							}
						/>
						<div className="col-span-full grid gap-1.5">
							<span className="text-[13px] leading-4 font-medium">
								<Trans>Text</Trans>
							</span>
							<RichTextEditor
								label={t`Text`}
								improve={false}
								heightClassName="max-h-[480px] min-h-[120px]"
								value={note.content}
								onChange={(content) =>
									list.change(note.id, (row) => {
										row.content = content;
									})
								}
							/>
						</div>
					</BankCard>
				)}
			</SortableCards>
			<AddButton label={t`Add note`} onClick={() => list.add({ id: generateId(), title: "", content: "" })} />
		</>
	);
}
