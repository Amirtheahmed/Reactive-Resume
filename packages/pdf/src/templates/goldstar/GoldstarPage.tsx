import type { TemplatePageProps } from "../../document";
import type { Style } from "../../forme/style-types";
import type { TemplateColorRoles, TemplateStyleSlots } from "../shared/types";
import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import { Page, StyleSheet } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { useRenderedSectionIds, useResolvedNode } from "../../semantic/context";
import { semanticNodeKeys } from "../../semantic/node-keys";
import {
	CustomFieldContactItem,
	EmailContactItem,
	LocationContactItem,
	PhoneContactItem,
	WebsiteContactItem,
} from "../shared/contact-item";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { Heading, SemanticContactListView, SemanticHeaderView, SemanticRegionView, Text } from "../shared/primitives";
import { Section } from "../shared/sections";
import { composeStyles, headerNameLineHeight } from "../shared/styles";
import { createIconSlot, useTemplateBase } from "../shared/template-base";

// Dense single-column layout modelled on "Jake's Resume": centred uppercase name, a pipe-separated
// contact line, ruled uppercase section headings, no picture.

type GoldstarStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	headerName: Style;
	headerText: Style;
	contactList: Style;
	contactItem: Style;
	sectionGroup: Style;
};

type GoldstarTemplate = {
	colors: TemplateColorRoles;
	styles: GoldstarStyles;
};

type GoldstarHeaderProps = {
	styles: GoldstarStyles;
};

export const GoldstarPage = ({ page, pageSize, pageMinHeightStyle, showHeader, pageNumber }: TemplatePageProps) => {
	const data = useRender();
	const pageNodeKey = semanticNodeKeys.page(pageNumber);
	const { style: semanticPageStyle, size: semanticPageSize, ...semanticPageProps } = useResolvedNode(pageNodeKey);
	const { metadata } = data;
	const { colors, styles } = useGoldstarTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const mainSections = useRenderedSectionIds(pageNodeKey, filterSections(page.main, data));
	const sidebarSections = useRenderedSectionIds(pageNodeKey, filterSections(page.sidebar, data));

	return (
		<Page
			{...semanticPageProps}
			size={semanticPageSize ?? pageSize}
			style={composeStyles(styles.page, pageMinHeightStyle, semanticPageStyle)}
		>
			<TemplateProvider pageNodeKey={pageNodeKey} styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<SemanticRegionView region="main" style={composeStyles(styles.sectionGroup, { rowGap: metrics.sectionGap })}>
					{mainSections.map((section) => (
						<Section key={section} section={section} placement="main" />
					))}
				</SemanticRegionView>

				{!page.fullWidth && (
					<SemanticRegionView
						region="sidebar"
						style={composeStyles(styles.sectionGroup, { rowGap: metrics.sectionGap })}
					>
						{sidebarSections.map((section) => (
							<Section key={section} section={section} placement="sidebar" />
						))}
					</SemanticRegionView>
				)}
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: GoldstarHeaderProps) => {
	const { basics } = useRender();

	const contacts: { key: string; node: ReactNode }[] = [];
	if (basics.phone)
		contacts.push({ key: "phone", node: <PhoneContactItem phone={basics.phone} style={styles.contactItem} /> });
	if (basics.email)
		contacts.push({ key: "email", node: <EmailContactItem email={basics.email} style={styles.contactItem} /> });
	if (basics.location)
		contacts.push({
			key: "location",
			node: <LocationContactItem location={basics.location} style={styles.contactItem} />,
		});
	if (basics.website.url)
		contacts.push({
			key: "website",
			node: <WebsiteContactItem website={basics.website} style={styles.contactItem} />,
		});
	for (const field of basics.customFields) {
		if (field.text)
			contacts.push({ key: field.id, node: <CustomFieldContactItem field={field} style={styles.contactItem} /> });
	}

	return (
		<SemanticHeaderView style={styles.header}>
			<Heading style={styles.headerName}>{basics.name}</Heading>
			{basics.headline ? <Text style={styles.headerText}>{basics.headline}</Text> : null}

			<SemanticContactListView style={styles.contactList}>
				{contacts.map(({ key, node }, index) => (
					<Fragment key={key}>
						{index > 0 && <Text>|</Text>}
						{node}
					</Fragment>
				))}
			</SemanticContactListView>
		</SemanticHeaderView>
	);
};

const useGoldstarTemplate = (): GoldstarTemplate => {
	const { metadata, r, foreground, background, primary, metrics, base } = useTemplateBase();

	return useMemo(() => {
		const colors: TemplateColorRoles = { foreground, background, primary };

		const baseStyles = StyleSheet.create({
			...base,
			page: {
				...base.page,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
			},
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.2),
			},
			sectionHeading: {
				color: foreground,
				textTransform: "uppercase",
				borderBottomWidth: 0.75,
				borderBottomColor: foreground,
				paddingBottom: metrics.gapY(0.1),
			},
			item: {
				rowGap: metrics.gapY(0.1),
			},
			levelContainer: {
				width: "100%",
			},
			levelItem: {
				borderColor: foreground,
			},
			levelItemActive: {
				backgroundColor: foreground,
			},
			header: {
				width: "100%",
				alignItems: "center",
				rowGap: metrics.gapY(0.25),
			},
			headerName: {
				width: "100%",
				fontSize: metadata.typography.heading.fontSize * 1.6,
				lineHeight: headerNameLineHeight,
				textAlign: "center",
				textTransform: "uppercase",
			},
			headerText: {
				width: "100%",
				textAlign: "center",
			},
			contactList: {
				width: "100%",
				flexDirection: r.row,
				flexWrap: "wrap",
				justifyContent: "center",
				rowGap: metrics.gapY(0.1),
				columnGap: metrics.gapX(0.4),
			},
			contactItem: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
			},
			sectionGroup: {},
		});

		return {
			colors,
			styles: {
				...baseStyles,
				icon: createIconSlot({ metadata, accentFor: ({ colors }) => colors.foreground }),
			} satisfies GoldstarStyles,
		};
	}, [metadata, r, primary, metrics, base, foreground, background]);
};
