<script lang="ts">
    import { requestErrorMessage } from "../../shared/error-presenter";
    /** 人物详情窗口：档案字段、互动与关系列表（增删，内核自动维护双向回链） */
    import { onDestroy, tick, untrack } from "svelte";
    import {
        CalendarDays,
        Copy,
        ExternalLink,
        ChevronDown,
        ChevronRight,
        Network,
        Check,
        Link,
        Link2,
        Lightbulb,
        Zap,
        Bell,
        BellOff,
        Calendar,
        FileText,
        Star,
        RefreshCw,
        Phone,
        Pin,
        FolderGit2,
        MapPin,
        Plus,
        X,
        Sparkles,
        Eye,
        EyeOff,
        Shield,
        ContactRound,
        User,
        Layers,
        Flag,
        Clock,
        Image,
        Pencil,
        Camera,
        CreditCard,
        Trash2,
        Edit3,
        Maximize2,
        Upload,
        Quote,
    } from "@lucide/svelte";
    import { processAvatarFile, processBusinessCardFile } from "../../shared/avatar-processor.ts";
    import {
        CHANNEL_TYPES,
        CHANNEL_TYPE_MAP,
        newChannelId,
        alignChannelsWithContact,
        getChannelActionHref,
        type ChannelType,
        type ContactChannel,
    } from "../../domain/person-channels.ts";
    import { exportSinglePersonVcf } from "../../domain/vcard.ts";
    import { maskPhone, maskEmail, maskWechat } from "../../domain/privacy-mask.ts";
    import { inferPersonaTags, adoptSuggestedTags } from "../../domain/tag-inference.ts";
    import { extractFactsFromText } from "../../domain/fact-extraction.ts";
    import { profileText } from "../../domain/people-profiles.ts";
    import { isPersonStarred, togglePersonStarred, type ViewPreferences } from "../../domain/preferences";
    import { extractNormalizedRegion } from "../../domain/region.ts";
    import { pushFlashcardSafely } from "../../libs/ecosystem-bridge-kit";
    import { lvNotify, lvLaunchpad } from "../../libs/lv-notice-kit";
    import { FACT_CATEGORY_META, type FactCategory, type PersonFactItem } from "../../domain/doc-section";
    import type { DetailSectionKey, DetailCollapsedSections } from "../../domain/preferences";
    import { listContacts, removeContact, updateContactFields } from "../../services/contacts";
    import { addRelation, removeRelation, refreshPerson, retryRelationProjections } from "../../services/relations";
    import { resolveRelated } from "../../services/doc-section";
    import type { RelationMutationReport, RelationProjectionResult } from "../../domain/relations";
import LvctDialog from "../LvctDialog.svelte";
import PersonEditDialog from "./PersonEditDialog.svelte";
import ViewState from "../ViewState.svelte";
import StatusNotice from "../StatusNotice.svelte";
    import type { ContactSummary } from "../../domain/person";
    import type { ContactsSettings } from "../../domain/model";
    import { formatBirthdayDisplay, nextBirthday } from "../../domain/occasions";
    import { createCloseScope, useCloseGuard } from "../close-guard";
    import { translateText } from "../../domain/translation";
    import PersonPicker from "./PersonPicker.svelte";
import MiniRelationRadar from "./MiniRelationRadar.svelte";
import { discoverPersonTies, type PersonTieRecommendation } from "../../domain/connections-discovery.ts";
    import type { PickerItem } from "./PersonPicker.svelte";
    import { dueLabel, hasFollowUpDraft } from "../../domain/followups";
    import type { FollowUpItem, SnoozeOption } from "../../domain/followups";
    import { newFollowUpRequestId } from "../../services/followups";
    import { computeRelationshipHealth, heatLevelColorClass, CADENCE_TIERS } from "../../domain/cadence";
    import type { PersonCadence, RelationshipHealth } from "../../domain/cadence";
    import type { PersonOrigin } from "../../domain/person-origin";
    import { buildPreMeetingBrief, formatPreMeetingBriefText, formatPreMeetingBriefCallout, formatPreMeetingBriefDailyNote, type PreMeetingBrief } from "../../domain/pre-meeting-brief";
    import { computeMonthlyInteractionTrend } from "../../domain/interactions";
    import { renderTemplate } from "../../domain/interaction-templates";
    import type { NoteTemplate } from "../../domain/interaction-templates";
    import TemplateManager from "./TemplateManager.svelte";
    import ExchangeLedger from "./ExchangeLedger.svelte";
    import PersonAliases from "./PersonAliases.svelte";
    import FamilyKinshipTree from "./FamilyKinshipTree.svelte";
    import type { KinshipMemberItem } from "../../domain/kinship.ts";
    import PersonPromisesLedger from "./PersonPromisesLedger.svelte";
    import type { PersonPromiseItem } from "../../domain/promises.ts";
    import { getStageMeta, type PersonLifecycleRecord } from "../../domain/lifecycle-stage.ts";
    import PersonScratchpad from "./PersonScratchpad.svelte";
    import type { PersonScratchpadItem } from "../../domain/person-scratchpad.ts";
    import PersonMilestonesTimeline from "./PersonMilestonesTimeline.svelte";
    import { extractMilestoneEvents } from "../../domain/timeline-milestones.ts";
    import BusinessCardModal from "./BusinessCardModal.svelte";
    import PersonSocialPreferences from "./PersonSocialPreferences.svelte";
    import { extractPreferenceMicroTags, type PersonSocialPreferenceItem, type SocialPreferenceMicroTag } from "../../domain/social-preferences.ts";
    import PersonItinerary from "./PersonItinerary.svelte";
    import type { PersonItineraryItem } from "../../domain/itineraries.ts";
    import RelationshipLabels from "./RelationshipLabels.svelte";
    import PersonProfileSummary from "./PersonProfileSummary.svelte";
    import PersonFieldsEditor from "./PersonFieldsEditor.svelte";
    import type { PersonFieldsSnapshot, PersonFieldsState } from "../../domain/person-fields";
    import type { LegacyPersonNoteSnapshot } from "../../domain/person-note";
    import { buildBriefingMarkdown, buildBriefingFilename } from "../../domain/briefing-export";
    import { addReviewDays, groupByMonth, inDateRange, onThisDay } from "../../domain/date-review";
    import { toLocalDateKey, INTERACTION_TYPES, INTERACTION_TYPE_LABELS, type InteractionType } from "../../domain/interactions";
    import OrgMembershipResult from "../org/OrgMembershipResult.svelte";
    import type { OrgMembershipWriteReport } from "../../services/org-member-writes";
    import { orgMembershipStatusLabel } from "../../domain/org-membership";
    import type { OrgAffiliationKind, OrgMembership, OrgMembershipPatch, OrgMembershipStatus } from "../../domain/org-membership";
    import { confirmDialog } from "../../libs/confirm-dialog";
    import { copyPlainText } from "../../shared/clipboard";
    import { convertGiftIdeaToExchange, newGiftIdeaId, type GiftIdeaItem, type GiftIdeaStatus, type GiftIdeaType } from "../../domain/gift-ideas";
    import {
        ANNIVERSARY_CATEGORIES,
        ANNIVERSARY_CATEGORY_LABELS,
        newAnniversaryId,
        nextAnniversary,
        type AnniversaryCategory,
        type AnniversaryItem,
    } from "../../domain/anniversaries";
    import type { IcsExportResult } from "../../services/ical.ts";
    import AnniversaryMilestoneBanner from "./AnniversaryMilestoneBanner.svelte";
    import { extractUpcomingMilestones } from "../../domain/anniversary-milestones.ts";
    import {
        newProjectId,
        type PersonProjectItem,
        getNextProjectStatus,
        getProjectStatusMeta,
    } from "../../domain/projects";
    import {
        parseBacklinkOccurredTime,
        inferInteractionType,
        cleanInteractionNote,
    } from "../../domain/backlink-converter";
    import { newExchangeRequestId } from "../../services/exchanges";

    let {
        settings,
        i18n,
        preferences,
        onPreferencesChange,
        person,
        initialTab = "overview",
        availableGroups = [],
        /** FUNC-01.7-a：数据变化代际（Workbench 广播）；变化时原地重载洞察与跟进（写入/编辑中跳过） */
        revision = 0,
        onLoadOrgMemberships,
        onOpenOrgManager,
        onCreateOrganization,
        onOpenOrganization,
        onLoadOrgCandidates,
        onAddOrgMembership,
        onRemoveOrgMembership,
        onUpdateOrgMembership,
        onLoadCommonOrgs,
        onRecord,
        onDeleteInteraction,
        onAmendInteraction,
        onLoadInsights,
        onLoadPersonNote,
        onSavePersonNote,
        onInspectLegacyPersonNote,
        onDetachLegacyPersonNote,
        onSyncDocProfile,
	        onSaveAvatar,
	        onLoadAvatar,
	        onSaveChannels,
	        onLoadChannels,
	        onSaveBusinessCard,
	        onLoadBusinessCard,
	        onLoadPersonFields,
        onSavePersonFields,
        onLoadPersonFacts,
        onSavePersonFacts,
        onOpenPersonDoc,
        onOpenGraphPerson,
        onOpenPeople,
        onNavigate,
        onNavigateDocId,
        closeLabel,
        navigationOrder,
        onChanged,
        onDeleted,
        onClose,
        onListFollowUps,
        onCreateFollowUp,
        onSetFollowUpStatus,
        onSnoozeFollowUp,
        onGetCadence,
        onSaveCadence,
        onListTemplates,
        onSaveTemplates,
        onLoadExchanges,
        onCreateExchange,
        onChangeExchangeStatus,
        onLoadAliases,
        onAddAlias,
        onRemoveAlias,
        onLoadRelationshipLabels,
        onSaveRelationshipLabels,
        onLoadTopics,
        onAddTopic,
        onRemoveTopic,
        onRemoveContactToTrash,
        onLoadGiftIdeas,
        onAddGiftIdea,
        onUpdateGiftIdea,
        onRemoveGiftIdea,
        onLoadAnniversaries,
        onAddAnniversary,
        onUpdateAnniversary,
        onRemoveAnniversary,
        onExportAnniversariesIcs,
        onLoadProjects,
        onAddProject,
        onUpdateProject,
        onRemoveProject,
        onCreateFlashcardsDoc,
        onCreateBriefingDoc,
        onCreateMilestonesDoc,
        onLoadKinships,
        onAddKinship,
        onRemoveKinship,
        onLoadPromises,
        onAddPromise,
        onUpdatePromise,
        onRemovePromise,
        onLoadLifecycleStage,
        onLoadScratchpads,
        onSaveScratchpad,
        onUpdateScratchpad,
        onRemoveScratchpad,
        onLoadSocialPreferences,
        onAddSocialPreference,
        onUpdateSocialPreference,
        onRemoveSocialPreference,
        onLoadItineraries,
        onSaveItinerary,
        onRemoveItinerary,
        onToggleItineraryChecklist,
        onLoadOrigin,
        onSaveOrigin,
        onSendGreetingReminder,
        collapsedSections,
        onToggleSection,
    }: {
        settings: ContactsSettings;
        i18n?: Readonly<Record<string, string>>;
        preferences?: ViewPreferences;
        onPreferencesChange?: (preferences: ViewPreferences) => Promise<ViewPreferences>;
        person: ContactSummary;
        initialTab?: "overview" | "activity" | "relations";
        /** 当前名册中已使用的分组，供详情编辑复用已有选项。 */
        availableGroups?: readonly string[];
        revision?: number;
        /** 记一笔互动（facade.recordInteraction） */
        onRecord: (
            personDocId: string,
            note?: string,
            type?: import("../../domain/interactions").InteractionType,
            options?: { occurredAt?: number; source?: import("../../domain/interactions").InteractionSource; externalRef?: string; skipDocSync?: boolean },
        ) => Promise<void>;
        onDeleteInteraction?: (personDocId: string, eventId: string) => Promise<void>;
        onAmendInteraction?: (personDocId: string, eventId: string, amendment: import("../../domain/interactions").InteractionAmendment) => Promise<void>;
        /** 人物洞察（时间线+共同出席） */
        onLoadInsights: (docId: string) => Promise<import("../../services/insights").PersonInsights>;
        onLoadPersonNote?: (docId: string) => Promise<string>;
        onSavePersonNote?: (docId: string, note: string, expected?: string) => Promise<string>;
        onInspectLegacyPersonNote?: (docId: string) => Promise<LegacyPersonNoteSnapshot>;
        onDetachLegacyPersonNote?: (docId: string, expected: LegacyPersonNoteSnapshot) => Promise<void>;
        onSyncDocProfile?: (person: ContactSummary) => Promise<void>;
	        onSaveAvatar?: (personDocId: string, avatarDataUrl: string) => Promise<void>;
	        onLoadAvatar?: (personDocId: string) => Promise<string>;
	        onSaveChannels?: (personDocId: string, channels: import("../../domain/person-channels").ContactChannel[]) => Promise<void>;
	        onLoadChannels?: (personDocId: string) => Promise<import("../../domain/person-channels").ContactChannel[]>;
	        onSaveBusinessCard?: (personDocId: string, cardDataUrl: string) => Promise<void>;
	        onLoadBusinessCard?: (personDocId: string) => Promise<string>;
	        onLoadPersonFields?: (docId: string) => Promise<PersonFieldsState>;
        onSavePersonFields?: (docId: string, snapshot: PersonFieldsSnapshot, expected: PersonFieldsState) => Promise<PersonFieldsState>;
        onLoadPersonFacts?: (docId: string) => Promise<import("../../domain/doc-section").PersonFactItem[]>;
        onSavePersonFacts?: (docId: string, items: readonly import("../../domain/doc-section").PersonFactItem[]) => Promise<void>;
        /** B12：组织归属投影（可选：未接线时隐藏该区） */
        onLoadOrgMemberships?: (docId: string) => Promise<import("../../services/org").PersonOrgMembershipView[]>;
        /** B13.5 双向编辑（可选）：打开组织管理弹窗维护归属；未接线时隐藏按钮 */
        onOpenOrgManager?: () => void;
        /** 在原联系人草稿上打开新建组织页，成功后返回已核实的新组织。 */
        onCreateOrganization?: (initialName?: string) => void | { docId: string; name: string } | Promise<void | { docId: string; name: string }>;
        onOpenOrganization?: (docId: string) => void;
        /** B13.5 双向编辑完整版（可选）：归属候选（活跃组织）；未接线时隐藏添加表单 */
        onLoadOrgCandidates?: () => Promise<ReadonlyArray<{ docId: string; name: string; archived?: boolean }>>;
        /** B13.5：为当前人物添加组织归属（orgDocId 单独传递，避免与 personDocId 混淆） */
        onAddOrgMembership?: (personDocId: string, orgDocId: string, extra?: { department?: string; title?: string; joinedOn?: string; leftOn?: string; status?: OrgMembershipStatus; statusLabel?: string; affiliationKind?: OrgAffiliationKind; note?: string }) => Promise<OrgMembershipWriteReport | void>;
        /** B13.5：移除一条组织归属（membership id） */
        onRemoveOrgMembership?: (membershipId: string, expected?: OrgMembership) => Promise<OrgMembershipWriteReport | void>;
        onUpdateOrgMembership?: (membershipId: string, patch: OrgMembershipPatch, expected?: OrgMembership) => Promise<OrgMembershipWriteReport | void>;
        /** B13.6：共同背景投影（同组织联系人；未接线时隐藏该区） */
        onLoadCommonOrgs?: (docId: string) => Promise<import("../../domain/org-membership").CommonOrgBackground[]>;
        onOpenPersonDoc: (docId: string) => void;
        onOpenGraphPerson?: (docId: string) => void;
        onOpenPeople?: (focus?: { itemIds: readonly string[]; label: string; sort?: "name" | "group" | "birthday" | "recent" }) => void;
        onNavigate: (person: ContactSummary) => void;
        onNavigateDocId?: (docId: string) => Promise<void>;
        closeLabel?: string;
        navigationOrder?: readonly ContactSummary[];
        onChanged: () => void;
        onDeleted: () => void;
        onClose: () => void;
        /** 跟进计划（F05，可选：未接线时隐藏该区） */
        onListFollowUps?: (personDocId: string) => Promise<FollowUpItem[]>;
        onCreateFollowUp?: (personDocId: string, title: string, dueDate: string, requestId?: string) => Promise<FollowUpItem>;
        onSetFollowUpStatus?: (id: string, status: "open" | "done" | "cancelled") => Promise<void>;
        onSnoozeFollowUp?: (id: string, option: SnoozeOption, customDate?: string) => Promise<void>;
        /** 联系节奏（F06，可选：未接线时隐藏该区） */
        onGetCadence?: (personDocId: string) => Promise<PersonCadence | null>;
        onSaveCadence?: (personDocId: string, cadence: PersonCadence | null) => Promise<void>;
        /** 互动备注模板（F09，可选：未接线时隐藏选用入口） */
        onListTemplates?: () => Promise<NoteTemplate[]>;
        onSaveTemplates?: (templates: NoteTemplate[], expected: readonly NoteTemplate[]) => Promise<NoteTemplate[]>;
        onLoadExchanges?: (personDocId: string) => Promise<import("../../domain/exchanges").ExchangeRecord[]>;
        onCreateExchange?: (input: import("../../services/exchanges").CreatePersonExchangeInput) => Promise<import("../../domain/exchanges").ExchangeRecord>;
        onChangeExchangeStatus?: (id: string, status: import("../../domain/exchanges").ExchangeStatus, settledOn?: string, expected?: { updatedAt: number }) => Promise<import("../../domain/exchanges").ExchangeRecord>;
        onLoadAliases?: (personDocId: string) => Promise<import("../../domain/person-aliases").PersonAlias[]>;
        onAddAlias?: (personDocId: string, alias: string) => Promise<import("../../domain/person-aliases").PersonAlias>;
        onRemoveAlias?: (id: string) => Promise<void>;
        onLoadRelationshipLabels?: (personDocId: string) => Promise<import("../../services/people-profiles").RelationshipLabelEditorState>;
        onSaveRelationshipLabels?: (personDocId: string, selfDocId: string, labels: string[], expected: import("../../domain/person-relationship-labels").PersonRelationshipLabels | null) => Promise<import("../../domain/person-relationship-labels").PersonRelationshipLabels>;
        /** E-32 会面谈资与备忘（可选） */
        onLoadTopics?: (personDocId: string) => Promise<import("../../domain/topics").PersonTopicItem[]>;
        onAddTopic?: (personDocId: string, text: string) => Promise<import("../../domain/topics").PersonTopicItem[]>;
        onRemoveTopic?: (personDocId: string, topicId: string) => Promise<import("../../domain/topics").PersonTopicItem[]>;
        /** E-33 联系人回收站软删除（可选） */
        onRemoveContactToTrash?: (person: import("../../domain/person").ContactSummary) => Promise<void>;
        /** E-26 礼物点子与偏好清单（可选） */
        onLoadGiftIdeas?: (personDocId: string) => Promise<import("../../domain/gift-ideas").GiftIdeaItem[]>;
        onAddGiftIdea?: (item: import("../../domain/gift-ideas").GiftIdeaItem) => Promise<import("../../domain/gift-ideas").GiftIdeaItem[]>;
        onUpdateGiftIdea?: (personDocId: string, ideaId: string, patch: Partial<import("../../domain/gift-ideas").GiftIdeaItem>) => Promise<import("../../domain/gift-ideas").GiftIdeaItem[]>;
        onRemoveGiftIdea?: (personDocId: string, ideaId: string) => Promise<import("../../domain/gift-ideas").GiftIdeaItem[]>;
        /** E-36 重要日期与周年纪念日（可选） */
        onLoadAnniversaries?: (personDocId: string) => Promise<import("../../domain/anniversaries").AnniversaryItem[]>;
        onAddAnniversary?: (item: import("../../domain/anniversaries").AnniversaryItem) => Promise<import("../../domain/anniversaries").AnniversaryItem[]>;
        onUpdateAnniversary?: (personDocId: string, annivId: string, patch: Partial<import("../../domain/anniversaries").AnniversaryItem>) => Promise<import("../../domain/anniversaries").AnniversaryItem[]>;
        onRemoveAnniversary?: (personDocId: string, annivId: string) => Promise<import("../../domain/anniversaries").AnniversaryItem[]>;
        /** E-43 导出重要日期为 iCalendar (.ics) 日历文件（可选） */
        onExportAnniversariesIcs?: (person: ContactSummary, anniversaries: readonly import("../../domain/anniversaries").AnniversaryItem[]) => IcsExportResult;
        /** E-37 协作项目与主题关联（可选） */
        onLoadProjects?: (personDocId: string) => Promise<import("../../domain/projects").PersonProjectItem[]>;
        onAddProject?: (item: import("../../domain/projects").PersonProjectItem) => Promise<import("../../domain/projects").PersonProjectItem[]>;
        onUpdateProject?: (personDocId: string, projectId: string, patch: Partial<import("../../domain/projects").PersonProjectItem>) => Promise<import("../../domain/projects").PersonProjectItem[]>;
        onRemoveProject?: (personDocId: string, projectId: string) => Promise<import("../../domain/projects").PersonProjectItem[]>;
        onFindCollaborators?: (matcher: { title?: string; docId?: string }) => Promise<Array<{ personDocId: string; role?: string; status: import("../../domain/projects").ProjectStatus; title: string }>>;
        /** 制作思源记忆复习闪卡（Riff Cards）实体文档（可选） */
        onCreateFlashcardsDoc?: (person: ContactSummary, facts: readonly PersonFactItem[], topics: readonly import("../../domain/topics").PersonTopicItem[]) => Promise<{ docId: string; hpath: string; count: number } | null>;
        /** 制作会面准备简报实体文档（可选） */
        onCreateBriefingDoc?: (input: import("../../domain/briefing-export").BriefingExportInput, dateStr?: string) => Promise<{ docId: string; hpath: string } | null>;
        /** E-46 制作人脉交往编年史里程碑实体文档（可选） */
        onCreateMilestonesDoc?: (person: ContactSummary, milestones: readonly import("../../domain/timeline-milestones").MilestoneEvent[]) => Promise<{ docId: string; hpath: string } | null>;
        /** E-38 家庭与亲属关系（可选） */
        onLoadKinships?: (personDocId: string) => Promise<import("../../domain/kinship").KinshipMemberItem[]>;
        onAddKinship?: (item: import("../../domain/kinship").KinshipMemberItem) => Promise<import("../../domain/kinship").KinshipMemberItem[]>;
        onRemoveKinship?: (personDocId: string, memberId: string) => Promise<import("../../domain/kinship").KinshipMemberItem[]>;
        /** E-39 双向承诺与信诺履约（可选） */
        onLoadPromises?: (personDocId: string) => Promise<import("../../domain/promises").PersonPromiseItem[]>;
        onAddPromise?: (item: import("../../domain/promises").PersonPromiseItem) => Promise<import("../../domain/promises").PersonPromiseItem[]>;
        onUpdatePromise?: (personDocId: string, promiseId: string, patch: Partial<import("../../domain/promises").PersonPromiseItem>) => Promise<import("../../domain/promises").PersonPromiseItem[]>;
        onRemovePromise?: (personDocId: string, promiseId: string) => Promise<import("../../domain/promises").PersonPromiseItem[]>;
        /** E-40 交往生命周期阶段（可选） */
        onLoadLifecycleStage?: (personDocId: string) => Promise<import("../../domain/lifecycle-stage").PersonLifecycleRecord>;
        onUpdateLifecycleStage?: (personDocId: string, stage: import("../../domain/lifecycle-stage").RelationshipStageKey, dateStr?: string, note?: string) => Promise<import("../../domain/lifecycle-stage").PersonLifecycleRecord>;
        /** E-42 闪念速记便签板（可选） */
        onLoadScratchpads?: (personDocId: string) => Promise<import("../../domain/person-scratchpad").PersonScratchpadItem[]>;
        onSaveScratchpad?: (item: import("../../domain/person-scratchpad").PersonScratchpadItem) => Promise<import("../../domain/person-scratchpad").PersonScratchpadItem[]>;
        onUpdateScratchpad?: (personDocId: string, noteId: string, patch: Partial<import("../../domain/person-scratchpad").PersonScratchpadItem>) => Promise<import("../../domain/person-scratchpad").PersonScratchpadItem[]>;
        onRemoveScratchpad?: (personDocId: string, noteId: string) => Promise<import("../../domain/person-scratchpad").PersonScratchpadItem[]>;
        /** E-49 社交偏好与交往忌口档案（可选） */
        onLoadSocialPreferences?: (personDocId: string) => Promise<import("../../domain/social-preferences").PersonSocialPreferenceItem[]>;
        onAddSocialPreference?: (item: import("../../domain/social-preferences").PersonSocialPreferenceItem) => Promise<import("../../domain/social-preferences").PersonSocialPreferenceItem[]>;
        onUpdateSocialPreference?: (personDocId: string, prefId: string, patch: Partial<import("../../domain/social-preferences").PersonSocialPreferenceItem>) => Promise<import("../../domain/social-preferences").PersonSocialPreferenceItem[]>;
        onRemoveSocialPreference?: (personDocId: string, prefId: string) => Promise<import("../../domain/social-preferences").PersonSocialPreferenceItem[]>;
        /** E-54 会客拜访行程备忘与准备清单（可选） */
        onLoadItineraries?: (personDocId: string) => Promise<PersonItineraryItem[]>;
        onSaveItinerary?: (item: PersonItineraryItem) => Promise<PersonItineraryItem[]>;
        onRemoveItinerary?: (personDocId: string, itineraryId: string) => Promise<PersonItineraryItem[]>;
        onToggleItineraryChecklist?: (personDocId: string, itineraryId: string, checklistId: string) => Promise<PersonItineraryItem[]>;
        /** Monica 对标：初识溯源与引荐人（可选） */
        onLoadOrigin?: (personDocId: string) => Promise<PersonOrigin | null>;
        onSaveOrigin?: (origin: PersonOrigin) => Promise<PersonOrigin>;
        /** Simple-PRM / Monica 对标：向小驴管家输出问候提醒 */
        onSendGreetingReminder?: (personName: string, daysOverdue: number) => Promise<boolean>;
        /** E-14 人物详情区块折叠展开偏好与更新回调 */
        collapsedSections?: import("../../domain/preferences").DetailCollapsedSections;
        onToggleSection?: (sectionKey: import("../../domain/preferences").DetailSectionKey, collapsed: boolean) => void;
    } = $props();
    const text = $derived.by(() => (key: string, fallback: string, values?: Record<string, string | number>) =>
        translateText(i18n, key, fallback, values));

    // 有意取打开弹窗时的快照；后续更新走 refreshPerson 回查
    // svelte-ignore state_referenced_locally
    let current: ContactSummary = $state(person);
    let others: ContactSummary[] = $state([]);
    let detailAlive = true;
    let othersRequest = 0;
    let relationProjections: RelationProjectionResult[] = $state([]);
    const pendingRelationProjections = $derived(relationProjections.filter((item) => item.status !== "applied"));
    let pendingRelationMutation = $state<{ operation: "add" | "remove"; other: ContactSummary } | null>(null);
    onDestroy(() => {
        detailAlive = false;
        othersRequest += 1;
        insightsRequest += 1;
        personNoteRequest += 1;
        personNoteLegacyRequest += 1;
        followUpRequest += 1;
    });
    /* B03 可搜索选人器：候选（排除本人与已关联）→ 选中即建关系，写入语义不变 */
    const relationCandidates = $derived.by((): PickerItem[] => candidates.map((person) => ({
        id: person.itemId,
        label: person.name,
        docId: person.docId,
        itemId: person.itemId,
        hint: [person.group, person.phone || person.email, ...person.tags].filter(Boolean).join(" · "),
        keywords: `${person.phone} ${person.wechat} ${person.email}`.toLowerCase(),
    })));
    let relationPicker: { openPicker: () => void } | undefined = $state(undefined);
    let relationViewMode = $state<"radar" | "list">("radar");
    let busy: boolean = $state(false);
    let errorText: string = $state("");
    let noteText: string = $state("");
    let personNote: string = $state("");
    let personNoteDraft: string = $state("");
    let personNoteLoading = $state(false);
    let personNoteSaving = $state(false);
    let personNoteError = $state("");
    let personNoteErrorKind: "load" | "save" | "" = $state("");
    let personNoteSaved = $state(false);
    let personNoteReloadConfirm = $state(false);
    let personNoteReloadTarget = "";
    let personNoteLatestVisible = $state(false);
    let personNoteLegacySnapshot: LegacyPersonNoteSnapshot | null = $state(null);
    let personNoteLegacyBusy = $state(false);
    let personNoteLegacyError = $state("");
    let personNoteLegacyDetached = $state(false);
    let personNoteLegacyRequest = 0;
    let personNoteLegacyTarget = "";
    // 联系节奏草稿与已保存基线必须在关闭守卫注册前建立，避免守卫首次读取时引用未初始化状态。
    let cadenceMode: "global" | "custom" | "paused" = $state("global");
    let cadenceDays = $state(14);
    let cadenceSavedMode: "global" | "custom" | "paused" = $state("global");
    let cadenceSavedDays = $state(14);
    let cadenceSaving = $state(false);
    let cadenceMessage = $state("");
    let cadenceError = $state("");
    let cadenceLoadError = $state("");
    let cadenceRequest = 0;
    const cadenceDirty = $derived(cadenceMode !== cadenceSavedMode
        || (String(cadenceMode) === "custom" && cadenceDays !== cadenceSavedDays));
    // 备注读取可能跨越 revision 刷新、人物切换或用户开始编辑；只允许
    // 仍属于当前人物且没有被新草稿淘汰的请求提交结果。
    let personNoteRequest = 0;
    let personNoteDraftRevision = 0;
    const canLeave = createCloseScope();
    // B06：互动备注草稿给出明细与「保存并离开」（保存=记录这条互动）
    function applyQuickInteractionChip(itype: InteractionType, chipNote: string) {
        lvLaunchpad.haptic(8);
        recordType = itype;
        noteText = chipNote;
        recorded = false;
        recordInputEl?.focus();
    }

    async function persistNote(): Promise<void> {
        if (!current) throw new Error("当前没有人物");
        await onRecord(current.docId, noteText.trim() || undefined, recordType);
        recorded = true;
        if (detailSaveAsFact && noteText.trim() && onSavePersonFacts) {
            const newItem: PersonFactItem = {
                id: `fact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                text: noteText.trim(),
                category: detailFactCategory,
                date: toLocalDateKey(new Date()),
            };
            const targetDocId = current.docId;
            void (async () => {
                try {
                    const baseline = factsReadVerified ? facts : (onLoadPersonFacts ? await onLoadPersonFacts(targetDocId) : []);
                    const next = [newItem, ...baseline];
                    await onSavePersonFacts(targetDocId, next);
                    if (detailAlive && current.docId === targetDocId) {
                        facts = next;
                        factsReadVerified = true;
                        factsError = "";
                        factsSaveError = "";
                    }
                } catch (err) {
                    if (detailAlive && current.docId === targetDocId) {
                        factsSaveError = `沉淀事实失败：${requestErrorMessage(err)}`;
                    }
                }
            })();
        }
        if (pendingConvertedTopicId && onRemoveTopic) {
            const topicIdToRemove = pendingConvertedTopicId;
            pendingConvertedTopicId = "";
            try {
                const list = await onRemoveTopic(current.docId, topicIdToRemove);
                if (detailAlive) {
                    topics = list;
                    onChanged();
                }
            } catch (err) {
                console.warn("[LvContacts] 互动记录后移除已转换谈资失败", err);
            }
        }
        noteText = "";
        await loadInsights();
    }

    function requestPersonNoteReload(): void {
        if (!onLoadPersonNote || personNoteLoading || personNoteSaving || personNoteLegacyBusy) return;
        personNoteLegacySnapshot = null;
        personNoteLegacyError = "";
        personNoteReloadTarget = `${current.docId}/${current.itemId}`;
        if (personNoteDraft !== personNote) personNoteReloadConfirm = true;
        else void reloadPersonNote(false);
    }

    /** 仅处理个人备注；读取失败前不放弃草稿，也不处理其他区域的未保存修改。 */
    async function reloadPersonNote(keepDraft: boolean): Promise<void> {
        if (!onLoadPersonNote || personNoteLoading || personNoteSaving || personNoteLegacyBusy
            || personNoteReloadTarget !== `${current.docId}/${current.itemId}`) return;
        const request = ++personNoteRequest;
        const targetDocId = current.docId;
        const targetItemId = current.itemId;
        const draftRevision = personNoteDraftRevision;
        personNoteReloadConfirm = false;
        personNoteLoading = true;
        personNoteError = "";
        personNoteErrorKind = "";
        personNoteSaved = false;
        try {
            const loaded = await onLoadPersonNote(targetDocId);
            if (!detailAlive || request !== personNoteRequest || current.docId !== targetDocId
                || current.itemId !== targetItemId || personNoteDraftRevision !== draftRevision) return;
            personNote = loaded;
            if (!keepDraft) personNoteDraft = loaded;
            personNoteLatestVisible = keepDraft;
        } catch (error) {
            if (detailAlive && request === personNoteRequest && current.docId === targetDocId
                && current.itemId === targetItemId && personNoteDraftRevision === draftRevision) {
                personNoteError = requestErrorMessage(error);
                personNoteErrorKind = "load";
            }
        } finally {
            if (detailAlive && request === personNoteRequest) personNoteLoading = false;
        }
    }

    /** 只读核对带旧标记的单一末段；不推测相邻正文属于备注。 */
    async function inspectPersonNoteLegacy(): Promise<void> {
        if (!onInspectLegacyPersonNote || !onDetachLegacyPersonNote || personNoteLoading || personNoteSaving || personNoteLegacyBusy) return;
        const request = ++personNoteLegacyRequest;
        const targetDocId = current.docId;
        const targetItemId = current.itemId;
        personNoteLegacyTarget = `${targetDocId}/${targetItemId}`;
        personNoteLegacyBusy = true;
        personNoteLegacyError = "";
        personNoteLegacySnapshot = null;
        try {
            const snapshot = await onInspectLegacyPersonNote(targetDocId);
            if (!detailAlive || request !== personNoteLegacyRequest || current.docId !== targetDocId || current.itemId !== targetItemId) return;
            personNoteLegacySnapshot = snapshot;
        } catch (error) {
            if (detailAlive && request === personNoteLegacyRequest && current.docId === targetDocId && current.itemId === targetItemId) {
                personNoteLegacyError = `未能确认可恢复的旧备注，原文未操作：${requestErrorMessage(error)}`;
            }
        } finally {
            if (detailAlive && request === personNoteLegacyRequest) personNoteLegacyBusy = false;
        }
    }

    /** 只解除已核对旧块的关联；成功后保留当前草稿并重新读取基线。 */
    async function detachPersonNoteLegacy(): Promise<void> {
        if (!onDetachLegacyPersonNote || !onLoadPersonNote || !personNoteLegacySnapshot || personNoteLoading || personNoteSaving || personNoteLegacyBusy
            || personNoteLegacyTarget !== `${current.docId}/${current.itemId}`) return;
        const request = ++personNoteLegacyRequest;
        const targetDocId = current.docId;
        const targetItemId = current.itemId;
        const expected = personNoteLegacySnapshot;
        personNoteLegacyBusy = true;
        personNoteLegacyError = "";
        try {
            await onDetachLegacyPersonNote(targetDocId, expected);
            if (!detailAlive || request !== personNoteLegacyRequest || current.docId !== targetDocId || current.itemId !== targetItemId) return;
            personNoteLegacyDetached = true;
            personNoteLegacySnapshot = null;
            try {
                const loaded = await onLoadPersonNote(targetDocId);
                if (!detailAlive || request !== personNoteLegacyRequest || current.docId !== targetDocId || current.itemId !== targetItemId) return;
                personNote = loaded;
                personNoteError = "";
                personNoteErrorKind = "";
                personNoteSaved = false;
                personNoteLatestVisible = personNoteDraft !== loaded;
            } catch (error) {
                if (detailAlive && request === personNoteLegacyRequest && current.docId === targetDocId && current.itemId === targetItemId) {
                    personNoteError = requestErrorMessage(error);
                    personNoteErrorKind = "load";
                }
            }
        } catch (error) {
            if (detailAlive && request === personNoteLegacyRequest && current.docId === targetDocId && current.itemId === targetItemId) {
                personNoteLegacyError = `旧备注关联尚未确认解除，当前草稿已保留。可重试核实或重新读取：${requestErrorMessage(error)}`;
            }
        } finally {
            if (detailAlive && request === personNoteLegacyRequest) personNoteLegacyBusy = false;
        }
    }

    async function loadPersonNoteState(preserveSaved = false): Promise<void> {
        if (!onLoadPersonNote) return;
        const request = ++personNoteRequest;
        const targetDocId = current.docId;
        const targetItemId = current.itemId;
        const draftRevision = personNoteDraftRevision;
        if (!preserveSaved || Boolean(personNoteError)) {
            personNoteLoading = true;
        }
        personNoteError = "";
        personNoteErrorKind = "";
        try {
            const loaded = await onLoadPersonNote(targetDocId);
            if (!detailAlive || request !== personNoteRequest || current.docId !== targetDocId || current.itemId !== targetItemId || personNoteDraftRevision !== draftRevision) return;
            personNote = loaded;
            personNoteDraft = loaded;
            if (!preserveSaved) personNoteSaved = false;
        } catch (error) {
            if (detailAlive && request === personNoteRequest && current.docId === targetDocId && current.itemId === targetItemId && personNoteDraftRevision === draftRevision) {
                personNoteError = requestErrorMessage(error);
                personNoteErrorKind = "load";
            }
        } finally {
            if (detailAlive && request === personNoteRequest) personNoteLoading = false;
        }
    }

    async function savePersonNoteState(rethrowOnFailure = false): Promise<void> {
        if (!onSavePersonNote || personNoteSaving) return;
        const targetDocId = current.docId;
        const targetItemId = current.itemId;
        const draftRevision = personNoteDraftRevision;
        const draft = personNoteDraft;
        const expected = personNote;
        personNoteSaving = true;
        personNoteError = "";
        personNoteErrorKind = "";
        personNoteSaved = false;
        try {
            const saved = await onSavePersonNote(targetDocId, draft, expected);
            if (!detailAlive || current.docId !== targetDocId || current.itemId !== targetItemId || personNoteDraftRevision !== draftRevision) return;
            personNote = saved;
            personNoteDraft = saved;
            personNoteSaved = true;
            onChanged();
        } catch (error) {
            if (detailAlive && current.docId === targetDocId && current.itemId === targetItemId && personNoteDraftRevision === draftRevision) {
                personNoteError = requestErrorMessage(error);
                personNoteErrorKind = "save";
            }
            if (rethrowOnFailure) throw error;
        } finally {
            personNoteSaving = false;
        }
    }
    useCloseGuard({
        busy: () => busy || deleting || personNoteSaving || personNoteLegacyBusy || followUpBusy || cadenceSaving,
        dirty: () => noteText.trim().length > 0 || personNoteDraft !== personNote || cadenceDirty,
        changes: () => [
            ...(noteText.trim() ? [text("guardNoteDraft", "互动备注尚未记录：{text}", { text: noteText.trim() })] : []),
            ...(personNoteDraft !== personNote ? ["人物独立备注尚未保存"] : []),
            ...(cadenceDirty ? [text("guardCadenceDraft", "联系节奏尚未保存")] : []),
        ],
        save: async () => {
            if (noteText.trim()) await persistNote();
            if (personNoteDraft !== personNote) await savePersonNoteState(true);
            if (cadenceDirty) await saveCadence(true);
        },
    });
    async function navigate(person: ContactSummary | null) {
        if (person && await canLeave.requestClose()) onNavigate(person);
    }
    let recorded: boolean = $state(false);
    let insights: import("../../services/insights").PersonInsights | null = $state(null);
    let insightsLoading = $state(true);
    let insightsError = $state("");
    let othersLoading = $state(true);
    let othersError = $state("");
    let insightsRequest = 0;
    let editing = $state(false);
    let deleting = $state(false);
    let activeTab: "overview" | "activity" | "relations" = $state("overview");
    $effect(() => {
        if (initialTab) {
            untrack(() => {
                activeTab = initialTab;
            });
        }
    });
    const tabIds = ["overview", "activity", "relations"] as const;
    async function selectTab(next: typeof activeTab): Promise<boolean> {
        if (next === activeTab) return true;
        if (!(await canLeave.requestClose())) return false;
        activeTab = next;
        return true;
    }
    async function handleTabKeydown(event: KeyboardEvent) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const index = tabIds.indexOf(activeTab);
        const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
        const tablist = event.currentTarget as HTMLElement;
        if (await selectTab(tabIds[next])) tablist.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
    }
    let activitySearch = $state("");
    let activitySource = $state("");
    let activityType = $state<InteractionType | "all">("all");
    let recordType = $state<InteractionType>("meeting");
    let activityLimit = $state(20);
    // 日期回顾（F10）
    let activityFrom = $state("");
    let activityTo = $state("");
    const sourceLabels = { manual: "手动记录", diary: "笔记捕获", api: "外部联动" };
    const filteredTimeline = $derived.by(() => {
        const query = activitySearch.trim().toLowerCase();
        return (insights?.timeline ?? [])
            .filter((item) => inDateRange(item.localDate, activityFrom, activityTo))
            .filter((item) => (!activitySource || item.source === activitySource) &&
                (!query || `${item.localDate} ${item.note ?? ""}`.toLowerCase().includes(query)) &&
                (activityType === "all" || item.type === activityType));
    });
    const pagedTimeline = $derived(filteredTimeline.slice(0, activityLimit));
    const monthGroups = $derived(groupByMonth(pagedTimeline));
    const historyToday = $derived.by(() => {
        const timeline = insights?.timeline ?? [];
        return onThisDay(timeline, toLocalDateKey(new Date()));
    });

    let activitySubTab: "log" | "milestones" = $state("log");

    const contactMilestones = $derived.by(() => {
        return extractMilestoneEvents({
            timeline: insights?.timeline ?? [],
            lifecycleHistory: lifecycleRecord?.history ?? [],
            anniversaries,
            promises,
        });
    });

    function setQuickRange(days: number) {
        const today = toLocalDateKey(new Date());
        activityFrom = addReviewDays(today, -(days - 1));
        activityTo = today;
        activityLimit = 20;
    }

    function clearDateRange() {
        activityFrom = "";
        activityTo = "";
        activityType = "all";
        activityLimit = 20;
    }

    async function deleteTimelineItem(eventId: string) {
        if (busy || !onDeleteInteraction) return;
        const confirmed = await confirmDialog({
            title: "删除互动记录",
            message: `删除「${current.name}」的这条互动吗？只删除本人的记录，其他参与者与人物文档会保留。`,
            confirmLabel: "删除",
            cancelLabel: "取消",
            danger: true,
        });
        if (!confirmed) return;
        busy = true;
        errorText = "";
        try {
            await onDeleteInteraction(current.docId, eventId);
            recorded = false;
            onChanged();
            await loadInsights();
        } catch (error) {
            errorText = requestErrorMessage(error);
        } finally { busy = false; }
    }

    let editingTimeline = $state<{ eventId: string; date: string; type: InteractionType; note: string; initial: string } | null>(null);
    let timelineEditError = $state("");
    const timelineEditDirty = $derived(editingTimeline !== null
        && JSON.stringify([editingTimeline.date, editingTimeline.type, editingTimeline.note.trim()]) !== editingTimeline.initial);
    $effect(() => {
        void current.docId;
        untrack(() => {
            editingTimeline = null;
            timelineEditError = "";
        });
    });
    useCloseGuard({
        busy: () => false,
        dirty: () => timelineEditDirty,
        changes: () => (timelineEditDirty ? ["互动修改尚未保存"] : []),
        save: async () => {
            await commitEditTimelineItem();
            if (editingTimeline) throw new Error(timelineEditError || "互动修改尚未保存");
        },
    });

    function startEditTimelineItem(item: { eventId: string; localDate: string; type: InteractionType; note?: string }) {
        timelineEditError = "";
        const note = item.note ?? "";
        editingTimeline = {
            eventId: item.eventId,
            date: item.localDate,
            type: item.type,
            note,
            initial: JSON.stringify([item.localDate, item.type, note.trim()]),
        };
    }

    async function commitEditTimelineItem() {
        const draft = editingTimeline;
        if (busy || !draft || !onAmendInteraction) return;
        if (!timelineEditDirty) {
            editingTimeline = null;
            return;
        }
        if (!draft.date) {
            timelineEditError = "请选择互动日期";
            return;
        }
        busy = true;
        timelineEditError = "";
        try {
            await onAmendInteraction(current.docId, draft.eventId, { localDate: draft.date, type: draft.type, note: draft.note });
            editingTimeline = null;
            onChanged();
            await loadInsights();
        } catch (error) {
            timelineEditError = requestErrorMessage(error);
        } finally { busy = false; }
    }

    async function loadInsights() {
        const request = ++insightsRequest;
        insightsLoading = true;
        insightsError = "";
        try {
            const result = await onLoadInsights(current.docId);
            if (request === insightsRequest) insights = result;
        } catch (error) {
            if (request === insightsRequest) insightsError = requestErrorMessage(error);
        } finally {
            if (request === insightsRequest) insightsLoading = false;
        }
    }

    loadInsights();
    loadPersonNoteState();
    loadKinships();
    loadPromises();
    loadLifecycleStage();
    loadScratchpads();
    loadSocialPreferences();
    loadItineraries();
    loadOrigin();

    // ---- 多通讯条目与多维度信息条目（支持多手机号、多微信号、多邮箱、地址、自定义等） ----
    let channels = $state<ContactChannel[]>([]);
    let channelsSaving = $state(false);
    let channelsError = $state("");
    let addingChannel = $state(false);
    let editingChannelId = $state<string | null>(null);

    // 新增条目表单
    let draftType = $state<ChannelType>("phone");
    let draftLabel = $state("工作手机");
    let draftValue = $state("");
    let draftIsPrimary = $state(false);

    // 编辑条目表单
    let editType = $state<ChannelType>("phone");
    let editLabel = $state("");
    let editValue = $state("");
    let editIsPrimary = $state(false);

    async function loadChannels() {
        if (!onLoadChannels || !current?.docId) {
            channels = alignChannelsWithContact(current, []);
            return;
        }
        const targetDocId = current.docId;
        channelsError = "";
        try {
            const raw = await onLoadChannels(targetDocId);
            if (detailAlive && current.docId === targetDocId) {
                if (raw.length > 0 || channels.length === 0) {
                    channels = alignChannelsWithContact(current, raw);
                }
            }
        } catch (err) {
            if (detailAlive && current.docId === targetDocId && channels.length === 0) {
                channels = alignChannelsWithContact(current, []);
            }
        }
    }

    function openAddChannel(type: ChannelType = "phone") {
        draftType = type;
        const meta = CHANNEL_TYPE_MAP[type];
        draftLabel = meta.presetLabels[0] || meta.label;
        draftValue = "";
        draftIsPrimary = false;
        channelsError = "";
        editingChannelId = null;
        addingChannel = true;
    }

    function changeDraftType(nextType: ChannelType) {
        draftType = nextType;
        const meta = CHANNEL_TYPE_MAP[nextType];
        draftLabel = meta.presetLabels[0] || meta.label;
    }

    async function handleSaveNewChannel() {
        const val = draftValue.trim();
        if (!val) {
            channelsError = "请输入条目内容";
            return;
        }
        if (!onSaveChannels || channelsSaving) return;
        channelsSaving = true;
        channelsError = "";
        try {
            const newEntry: ContactChannel = {
                id: newChannelId(),
                type: draftType,
                label: draftLabel.trim() || CHANNEL_TYPE_MAP[draftType].label,
                value: val,
                isPrimary: draftIsPrimary,
                createdAt: Date.now(),
            };
            const nextList = draftIsPrimary
                ? [newEntry, ...channels.map((c) => (c.type === draftType ? { ...c, isPrimary: false } : c))]
                : [...channels, newEntry];
            await onSaveChannels(current.docId, nextList);
            channels = nextList;
            addingChannel = false;
            draftValue = "";

            if (draftIsPrimary) {
                await syncPrimaryChannelToDatabase(draftType, val);
            }
            onChanged();
        } catch (err) {
            channelsError = `保存条目失败：${requestErrorMessage(err)}`;
        } finally {
            channelsSaving = false;
        }
    }

    function startEditChannel(channel: ContactChannel) {
        addingChannel = false;
        editingChannelId = channel.id;
        editType = channel.type;
        editLabel = channel.label;
        editValue = channel.value;
        editIsPrimary = channel.isPrimary ?? false;
        channelsError = "";
    }

    async function handleSaveEditedChannel(id: string) {
        const val = editValue.trim();
        if (!val) {
            channelsError = "条目内容不能为空";
            return;
        }
        if (!onSaveChannels || channelsSaving) return;
        channelsSaving = true;
        channelsError = "";
        try {
            const nextList = channels.map((c) => {
                if (c.id === id) {
                    return {
                        ...c,
                        type: editType,
                        label: editLabel.trim() || CHANNEL_TYPE_MAP[editType].label,
                        value: val,
                        isPrimary: editIsPrimary,
                    };
                }
                if (editIsPrimary && c.type === editType) {
                    return { ...c, isPrimary: false };
                }
                return c;
            });
            await onSaveChannels(current.docId, nextList);
            channels = nextList;
            editingChannelId = null;

            if (editIsPrimary) {
                await syncPrimaryChannelToDatabase(editType, val);
            }
            onChanged();
        } catch (err) {
            channelsError = `修改条目失败：${requestErrorMessage(err)}`;
        } finally {
            channelsSaving = false;
        }
    }

    async function handleRemoveChannel(id: string) {
        if (!onSaveChannels || channelsSaving) return;
        channelsSaving = true;
        channelsError = "";
        try {
            const nextList = channels.filter((c) => c.id !== id);
            await onSaveChannels(current.docId, nextList);
            channels = nextList;
            if (editingChannelId === id) editingChannelId = null;
            onChanged();
        } catch (err) {
            channelsError = `删除条目失败：${requestErrorMessage(err)}`;
        } finally {
            channelsSaving = false;
        }
    }

    async function syncPrimaryChannelToDatabase(type: ChannelType, val: string) {
        try {
            if (type === "phone" && current.phone !== val) {
                await updateContactFields(settings, current.itemId, {
                    name: current.name,
                    phone: val,
                    email: current.email,
                    wechat: current.wechat,
                    website: current.website,
                    birthday: current.birthday,
                    isLunar: current.isLunar,
                    group: current.group,
                    tags: current.tags,
                });
                current.phone = val;
            } else if (type === "wechat" && current.wechat !== val) {
                await updateContactFields(settings, current.itemId, {
                    name: current.name,
                    phone: current.phone,
                    email: current.email,
                    wechat: val,
                    website: current.website,
                    birthday: current.birthday,
                    isLunar: current.isLunar,
                    group: current.group,
                    tags: current.tags,
                });
                current.wechat = val;
            } else if (type === "email" && current.email !== val) {
                await updateContactFields(settings, current.itemId, {
                    name: current.name,
                    phone: current.phone,
                    email: val,
                    wechat: current.wechat,
                    website: current.website,
                    birthday: current.birthday,
                    isLunar: current.isLunar,
                    group: current.group,
                    tags: current.tags,
                });
                current.email = val;
            }
        } catch (e) {
            console.warn("[LvContacts] 同步主条目到总表异常：", e);
        }
    }

    // ---- 实体纸质名片档案（保持原图比例、长边 1200px 高清压缩、点击放大查阅） ----
    let businessCardUrl = $state("");
    let cardSaving = $state(false);
    let cardError = $state("");
    let cardViewerOpen = $state(false);
    let cardFileInput: HTMLInputElement | undefined = $state();

    /** 名片查看器动态层级：跟随思源递增的 window.siyuan.zIndex，避免长会话中被原生弹窗反盖 */
    function viewerZIndex(): number {
        try {
            const currentZ = (window as any).siyuan?.zIndex;
            return typeof currentZ === "number" ? Math.max(1000, currentZ + 20) : 1000;
        } catch {
            return 1000;
        }
    }

    async function loadBusinessCard() {
        if (!onLoadBusinessCard || !current?.docId) return;
        const targetDocId = current.docId;
        cardError = "";
        try {
            const url = await onLoadBusinessCard(targetDocId);
            if (detailAlive && current.docId === targetDocId) {
                if (url || !businessCardUrl) {
                    businessCardUrl = url;
                }
            }
        } catch (err) {
            if (detailAlive && current.docId === targetDocId && !businessCardUrl) businessCardUrl = "";
        }
    }

    async function handleBusinessCardUpload(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || cardSaving || !onSaveBusinessCard) return;
        cardSaving = true;
        cardError = "";
        try {
            const processed = await processBusinessCardFile(file, 1200);
            await onSaveBusinessCard(current.docId, processed.dataUrl);
            businessCardUrl = processed.dataUrl;
            onChanged();
        } catch (err) {
            cardError = `上传名片失败：${requestErrorMessage(err)}`;
        } finally {
            cardSaving = false;
            input.value = "";
        }
    }

    async function handleDeleteBusinessCard() {
        const ok = await confirmDialog({
            title: "删除实体名片",
            message: `确定删除 ${current.name} 的名片照片吗？`,
            confirmLabel: "删除名片",
            cancelLabel: "保留",
            danger: true,
        });
        if (!ok || !onSaveBusinessCard || cardSaving) return;
        cardSaving = true;
        cardError = "";
        try {
            await onSaveBusinessCard(current.docId, "");
            businessCardUrl = "";
            cardViewerOpen = false;
            onChanged();
        } catch (err) {
            cardError = `删除名片失败：${requestErrorMessage(err)}`;
        } finally {
            cardSaving = false;
        }
    }

    loadChannels();
    loadBusinessCard();

    let kinships = $state<KinshipMemberItem[]>([]);

    async function loadKinships() {
        if (!onLoadKinships || !current?.docId) return;
        const targetDocId = current.docId;
        try {
            const list = await onLoadKinships(targetDocId);
            if (detailAlive && current.docId === targetDocId) kinships = list;
        } catch (err) {
            console.warn("[LvContacts] 读取亲属成员失败：", err);
            if (detailAlive && current.docId === targetDocId) kinships = [];
        }
    }

    let promises = $state<PersonPromiseItem[]>([]);

    async function loadPromises() {
        if (!onLoadPromises || !current?.docId) return;
        const targetDocId = current.docId;
        try {
            const list = await onLoadPromises(targetDocId);
            if (detailAlive && current.docId === targetDocId) promises = list;
        } catch (err) {
            console.warn("[LvContacts] 读取双向承诺失败：", err);
            if (detailAlive && current.docId === targetDocId) promises = [];
        }
    }

    let lifecycleRecord = $state<PersonLifecycleRecord | null>(null);

    async function loadLifecycleStage() {
        if (!onLoadLifecycleStage || !current?.docId) return;
        const targetDocId = current.docId;
        try {
            const res = await onLoadLifecycleStage(targetDocId);
            if (detailAlive && current.docId === targetDocId) lifecycleRecord = res;
        } catch (err) {
            console.warn("[LvContacts] 读取交往阶段失败：", err);
            if (detailAlive && current.docId === targetDocId) lifecycleRecord = null;
        }
    }

    let scratchpads = $state<PersonScratchpadItem[]>([]);

    async function loadScratchpads() {
        if (!onLoadScratchpads || !current?.docId) return;
        const targetDocId = current.docId;
        try {
            const list = await onLoadScratchpads(targetDocId);
            if (detailAlive && current.docId === targetDocId) scratchpads = list;
        } catch (err) {
            console.warn("[LvContacts] 读取闪念便签失败：", err);
            if (detailAlive && current.docId === targetDocId) scratchpads = [];
        }
    }

    let socialPreferences = $state<PersonSocialPreferenceItem[]>([]);

    async function loadSocialPreferences() {
        if (!onLoadSocialPreferences || !current?.docId) return;
        const targetDocId = current.docId;
        try {
            const list = await onLoadSocialPreferences(targetDocId);
            if (detailAlive && current.docId === targetDocId) socialPreferences = list;
        } catch (err) {
            console.warn("[LvContacts] 读取社交偏好失败：", err);
            if (detailAlive && current.docId === targetDocId) socialPreferences = [];
        }
    }

    let itineraries = $state<PersonItineraryItem[]>([]);

    async function loadItineraries() {
        if (!onLoadItineraries || !current?.docId) return;
        const targetDocId = current.docId;
        try {
            const list = await onLoadItineraries(targetDocId);
            if (detailAlive && current.docId === targetDocId) itineraries = list;
        } catch (err) {
            console.warn("[LvContacts] 读取拜访行程失败：", err);
            if (detailAlive && current.docId === targetDocId) itineraries = [];
        }
    }

    let currentOrigin = $state<PersonOrigin | null>(null);
    let originEditing = $state(false);
    let originSaving = $state(false);
    let originError = $state("");
    let metAtDraft = $state("");
    let introducedByDraft = $state("");
    let preferencesDraft = $state("");
    let preMeetingBriefOpen = $state(false);
    let preMeetingBriefCopied = $state(false);
    let preMeetingBriefCopyTimer: ReturnType<typeof setTimeout> | null = null;
    let preMeetingBriefCalloutCopied = $state(false);
    let preMeetingBriefCalloutCopyTimer: ReturnType<typeof setTimeout> | null = null;
    let preMeetingBriefDailyCopied = $state(false);
    let preMeetingBriefDailyCopyTimer: ReturnType<typeof setTimeout> | null = null;
    let greetingReminderSending = $state(false);
    let greetingReminderSent = $state(false);
    let greetingReminderError = $state("");
    let greetingReminderTimer: ReturnType<typeof setTimeout> | null = null;

    const originDirty = $derived(
        originEditing && (
            metAtDraft.trim() !== (currentOrigin?.metAt ?? "") ||
            introducedByDraft !== (currentOrigin?.introducedByDocId ?? "") ||
            preferencesDraft.trim() !== (currentOrigin?.preferences ?? "")
        ),
    );

    async function loadOrigin() {
        if (!onLoadOrigin || !current?.docId) return;
        const targetDocId = current.docId;
        try {
            const origin = await onLoadOrigin(targetDocId);
            if (detailAlive && current.docId === targetDocId) {
                currentOrigin = origin;
                if (!originEditing) {
                    metAtDraft = origin?.metAt ?? "";
                    introducedByDraft = origin?.introducedByDocId ?? "";
                    preferencesDraft = origin?.preferences ?? "";
                }
            }
        } catch (err) {
            console.warn("[LvContacts] 读取初识溯源失败：", err);
            if (detailAlive && current.docId === targetDocId) currentOrigin = null;
        }
    }

    async function handleSaveOrigin(rethrow = false) {
        if (!onSaveOrigin || originSaving) return;
        originSaving = true;
        originError = "";
        try {
            const updated = await onSaveOrigin({
                personDocId: current.docId,
                metAt: metAtDraft.trim() || undefined,
                introducedByDocId: introducedByDraft || undefined,
                preferences: preferencesDraft.trim() || undefined,
            });
            if (detailAlive) {
                const hasContent = Boolean(updated?.metAt || updated?.introducedByDocId || updated?.preferences);
                currentOrigin = hasContent ? updated : null;
                originEditing = false;
                originError = "";
                onChanged();
            }
        } catch (err) {
            if (detailAlive) originError = requestErrorMessage(err);
            if (rethrow) throw err;
        } finally {
            if (detailAlive) originSaving = false;
        }
    }

    useCloseGuard({
        busy: () => originSaving || greetingReminderSending,
        dirty: () => originDirty,
        changes: () => (originDirty ? ["初识溯源与引荐人尚未保存"] : []),
        save: async () => {
            if (originDirty) await handleSaveOrigin(true);
        },
    });

    async function handleCopyPreMeetingBrief() {
        const textToCopy = formatPreMeetingBriefText(preMeetingBrief);
        try {
            await copyPlainText(textToCopy);
            preMeetingBriefCopied = true;
            if (preMeetingBriefCopyTimer) clearTimeout(preMeetingBriefCopyTimer);
            preMeetingBriefCopyTimer = setTimeout(() => {
                if (detailAlive) preMeetingBriefCopied = false;
            }, 2000);
        } catch (err) {
            copyFieldError = `复制会前简报失败：${requestErrorMessage(err)}`;
            if (copyFieldErrorTimer) clearTimeout(copyFieldErrorTimer);
            copyFieldErrorTimer = setTimeout(() => { copyFieldError = ""; }, 2500);
        }
    }

    async function handleCopyPreMeetingBriefCallout() {
        const textToCopy = formatPreMeetingBriefCallout(preMeetingBrief);
        try {
            await copyPlainText(textToCopy);
            preMeetingBriefCalloutCopied = true;
            if (preMeetingBriefCalloutCopyTimer) clearTimeout(preMeetingBriefCalloutCopyTimer);
            preMeetingBriefCalloutCopyTimer = setTimeout(() => {
                if (detailAlive) preMeetingBriefCalloutCopied = false;
            }, 2000);
        } catch (err) {
            copyFieldError = `复制思源引述块失败：${requestErrorMessage(err)}`;
            if (copyFieldErrorTimer) clearTimeout(copyFieldErrorTimer);
            copyFieldErrorTimer = setTimeout(() => { copyFieldError = ""; }, 2500);
        }
    }

    async function handleCopyPreMeetingBriefDaily() {
        const textToCopy = formatPreMeetingBriefDailyNote(preMeetingBrief);
        try {
            await copyPlainText(textToCopy);
            preMeetingBriefDailyCopied = true;
            if (preMeetingBriefDailyCopyTimer) clearTimeout(preMeetingBriefDailyCopyTimer);
            preMeetingBriefDailyCopyTimer = setTimeout(() => {
                if (detailAlive) preMeetingBriefDailyCopied = false;
            }, 2000);
        } catch (err) {
            copyFieldError = `复制思源日记块失败：${requestErrorMessage(err)}`;
            if (copyFieldErrorTimer) clearTimeout(copyFieldErrorTimer);
            copyFieldErrorTimer = setTimeout(() => { copyFieldError = ""; }, 2500);
        }
    }

    async function handleSendGreetingReminder() {
        if (!onSendGreetingReminder || greetingReminderSending || !relationshipHealth.overdue) return;
        greetingReminderSending = true;
        greetingReminderError = "";
        try {
            const ok = await onSendGreetingReminder(current.name, relationshipHealth.overdueDays);
            if (!detailAlive) return;
            if (ok) {
                greetingReminderSent = true;
                if (greetingReminderTimer) clearTimeout(greetingReminderTimer);
                greetingReminderTimer = setTimeout(() => {
                    if (detailAlive) greetingReminderSent = false;
                }, 3000);
            } else {
                greetingReminderError = "未检测到已启用的小驴管家，无法同步问候备忘";
            }
        } catch (err) {
            if (detailAlive) greetingReminderError = requestErrorMessage(err);
        } finally {
            if (detailAlive) greetingReminderSending = false;
        }
    }

    const upcomingAnniversaryMilestones = $derived.by(() => {
        return extractUpcomingMilestones(anniversaries, current.name, new Date(), 14);
    });

    // ---- 谈资与事实画像（RF-09 / Issue #135；D-0040 统一承载偏好与忌口红线） ----
    let facts: PersonFactItem[] = $state([]);
    let factsLoading = $state(false);
    let factsSaving = $state(false);
    let factsError = $state("");
    let factsSaveError = $state("");
    let factsReadVerified = $state(false);
    let newFactText = $state("");
    let newFactCategory: FactCategory = $state("quote");
    let newFactIsTaboo = $state(false);
    let newFactSource = $state("");
    let detailSaveAsFact = $state(false);
    let detailFactCategory: FactCategory = $state("quote");

    const mergedSocialPreferences = $derived.by<PersonSocialPreferenceItem[]>(() => {
        const seen = new Set(socialPreferences.map((item) => item.content.trim()));
        const fromFacts: PersonSocialPreferenceItem[] = [];
        for (const fact of facts) {
            if (fact.category !== "preference") continue;
            const trimmed = fact.text.trim();
            if (!trimmed || seen.has(trimmed)) continue;
            seen.add(trimmed);
            fromFacts.push({
                id: fact.id,
                personDocId: current.docId,
                category: fact.isTaboo ? "taboos" : "dietary",
                content: trimmed,
                isTaboo: Boolean(fact.isTaboo),
                createdAt: 0,
                updatedAt: 0,
            });
        }
        return [...fromFacts, ...socialPreferences];
    });

    const preferenceMicroTags = $derived.by<SocialPreferenceMicroTag[]>(() => {
        return extractPreferenceMicroTags(mergedSocialPreferences, 4);
    });
    let extractedFactsPreview = $state<PersonFactItem[]>([]);

    function handleAutoExtractFacts(): void {
        const text = noteText.trim();
        if (!text) return;
        const autoFacts = extractFactsFromText(text, toLocalDateKey(new Date()));
        if (autoFacts.length > 0) {
            extractedFactsPreview = autoFacts;
        }
    }

    async function ensureVerifiedFactsBaseline(targetDocId: string): Promise<PersonFactItem[]> {
        if (factsReadVerified) return facts;
        if (!onLoadPersonFacts) return facts;
        const loaded = await onLoadPersonFacts(targetDocId);
        if (detailAlive && current.docId === targetDocId) {
            facts = loaded;
            factsReadVerified = true;
            factsError = "";
        }
        return loaded;
    }

    async function adoptExtractedFact(fact: PersonFactItem): Promise<void> {
        if (!onSavePersonFacts || !current?.docId || factsSaving) return;
        const targetDocId = current.docId;
        factsSaving = true;
        factsSaveError = "";
        try {
            const baseline = await ensureVerifiedFactsBaseline(targetDocId);
            const next = [fact, ...baseline];
            await onSavePersonFacts(targetDocId, next);
            facts = next;
            extractedFactsPreview = extractedFactsPreview.filter((f) => f.id !== fact.id);
        } catch (err) {
            factsSaveError = `保存事实失败：${requestErrorMessage(err)}`;
        } finally {
            factsSaving = false;
        }
    }

    async function adoptAllExtractedFacts(): Promise<void> {
        if (!onSavePersonFacts || !current?.docId || extractedFactsPreview.length === 0 || factsSaving) return;
        const targetDocId = current.docId;
        factsSaving = true;
        factsSaveError = "";
        try {
            const baseline = await ensureVerifiedFactsBaseline(targetDocId);
            const next = [...extractedFactsPreview, ...baseline];
            await onSavePersonFacts(targetDocId, next);
            facts = next;
            extractedFactsPreview = [];
        } catch (err) {
            factsSaveError = `保存事实失败：${requestErrorMessage(err)}`;
        } finally {
            factsSaving = false;
        }
    }

    async function loadFacts(): Promise<void> {
        if (!onLoadPersonFacts || !current?.docId) return;
        const targetDocId = current.docId;
        factsLoading = true;
        factsError = "";
        factsSaveError = "";
        factsReadVerified = false;
        try {
            const list = await onLoadPersonFacts(targetDocId);
            if (detailAlive && current.docId === targetDocId) {
                facts = list;
                factsReadVerified = true;
            }
        } catch (err) {
            if (detailAlive && current.docId === targetDocId) {
                facts = [];
                factsReadVerified = false;
                factsError = `读取事实画像失败：${err instanceof Error ? err.message : String(err)}`;
            }
        } finally {
            if (detailAlive && current.docId === targetDocId) factsLoading = false;
        }
    }

    async function handleAddFact(): Promise<void> {
        if (!onSavePersonFacts || !current?.docId || !newFactText.trim() || factsSaving) return;
        const targetDocId = current.docId;
        factsSaving = true;
        factsSaveError = "";
        try {
            const baseline = await ensureVerifiedFactsBaseline(targetDocId);
            const newItem: PersonFactItem = {
                id: `fact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                text: newFactText.trim(),
                category: newFactCategory,
                date: toLocalDateKey(new Date()),
                ...(newFactSource.trim() ? { sourceRef: newFactSource.trim() } : {}),
                ...(newFactCategory === "preference" && newFactIsTaboo ? { isTaboo: true } : {}),
            };
            const next = [newItem, ...baseline];
            await onSavePersonFacts(targetDocId, next);
            facts = next;
            newFactText = "";
            newFactSource = "";
            newFactIsTaboo = false;
        } catch (err) {
            factsSaveError = `保存事实失败：${requestErrorMessage(err)}`;
        } finally {
            factsSaving = false;
        }
    }

    async function handleRemoveFact(id: string): Promise<void> {
        if (!onSavePersonFacts || !current?.docId || factsSaving) return;
        const targetDocId = current.docId;
        factsSaving = true;
        factsSaveError = "";
        try {
            const baseline = await ensureVerifiedFactsBaseline(targetDocId);
            const next = baseline.filter((f) => f.id !== id);
            await onSavePersonFacts(targetDocId, next);
            facts = next;
        } catch (err) {
            factsSaveError = `删除事实失败：${requestErrorMessage(err)}`;
        } finally {
            factsSaving = false;
        }
    }
    let flashcardToastId = $state("");
    let flashcardToastTimer: ReturnType<typeof setTimeout> | null = null;
    async function makeFactFlashcard(fact: PersonFactItem) {
        const catLabel = FACT_CATEGORY_META[fact.category]?.label || "社交备忘";
        const front = `[人脉常识] ${current.name} 的【${catLabel}】是什么？`;
        const back = `${fact.text}${fact.sourceRef ? `（出处：${fact.sourceRef}）` : ""}`;
        try {
            const pushed = await pushFlashcardSafely({
                front,
                back,
                deckName: "人脉常识",
                tags: ["人脉常识", current.name],
                sourceDocId: current.docId,
            });
            if (!pushed) {
                await copyPlainText(`Q: ${front}\nA: ${back}`);
            }
            flashcardToastId = fact.id;
            if (flashcardToastTimer) clearTimeout(flashcardToastTimer);
            flashcardToastTimer = setTimeout(() => { flashcardToastId = ""; }, 1800);
        } catch (err) {
            factsSaveError = `制作闪卡失败：${requestErrorMessage(err)}`;
        }
    }

    loadFacts();

    // ---- 互动备注模板（F09） ----
    const templatesSupported = $derived(Boolean(onListTemplates && onSaveTemplates));
    let templates: NoteTemplate[] = $state([]);
    let templateLoadError = $state("");
    let templateChoice = $state("");
    let templateManagerOpen = $state(false);

    async function loadTemplates() {
        if (!onListTemplates) return;
        templateLoadError = "";
        try {
            templates = await onListTemplates();
        } catch (error) {
            templates = [];
            templateLoadError = requestErrorMessage(error);
        }
    }
    loadTemplates();

    async function applyTemplate() {
        if (!templateChoice) return;
        const template = templates.find((item) => item.id === templateChoice);
        if (!template) return;
        if (noteText.trim() && !(await confirmDialog({ message: "应用模板将覆盖当前备注，继续吗？" }))) {
            templateChoice = "";
            return;
        }
        const aff = current.profile?.affiliations?.state === "known" ? current.profile.affiliations.value.work?.[0] : undefined;
        const region = extractNormalizedRegion(current);
        const cityStr = region.city !== "未知" ? region.city : (region.province && region.province !== "未知" ? region.province : "");
        noteText = renderTemplate(template.content, {
            name: current.name,
            date: toLocalDateKey(new Date()),
            lastInteraction: insights?.timeline?.[0]?.localDate ?? "无",
            company: aff?.orgName || (current as any).company || "",
            title: aff?.title || "",
            city: cityStr,
        });
        recorded = false;
        templateChoice = "";
    }

    async function persistTemplates(list: NoteTemplate[], expected: readonly NoteTemplate[]): Promise<NoteTemplate[]> {
        const saved = await onSaveTemplates!(list, expected);
        templates = saved;
        return saved;
    }

    async function reloadTemplates(): Promise<NoteTemplate[]> {
        const latest = await onListTemplates!();
        templates = latest;
        templateLoadError = "";
        return latest;
    }

    const relatedPeople = $derived(
        resolveRelated(current, others),
    );
    const candidates = $derived(
        others.filter((item) => item.itemId !== current.itemId && !item.isSelf && !relatedPeople.some((related) => related.itemId === item.itemId)),
    );
    const recommendedTies = $derived.by<PersonTieRecommendation[]>(() => {
        if (!current.docId || others.length === 0) return [];
        return discoverPersonTies(current.docId, others, [], {
            knownCoAttendance: insights?.coAttendance,
            knownCommonOrgs: commonOrgs,
            minScore: 1,
            maxResults: 6,
        });
    });
    const orderedPeople = $derived(navigationOrder ?? others);
    const currentIndex = $derived(orderedPeople.findIndex((item) => item.itemId === current.itemId));
    const previousPerson = $derived(currentIndex > 0 ? orderedPeople[currentIndex - 1] : null);
    const nextPerson = $derived(currentIndex >= 0 && currentIndex < orderedPeople.length - 1 ? orderedPeople[currentIndex + 1] : null);
    const birthday = $derived(nextBirthday(current.birthday, current.isLunar));

    /* Mobile Spec v1 专项 2：会前速览卡滑动切换上一位/下一位，顶部圆点指示器同步 */
    const visibleBriefDots = $derived.by(() => {
        const total = orderedPeople.length;
        if (total <= 7) return Array.from({ length: total }, (_, i) => i);
        const start = Math.max(0, Math.min(currentIndex - 3, total - 7));
        return Array.from({ length: 7 }, (_, i) => start + i);
    });

    let briefTouchStartX = 0;
    let briefTouchStartY = 0;
    function onBriefTouchStart(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest("button, a, input, select, textarea, [role='button'], [role='tab'], summary")) {
            briefTouchStartX = 0;
            briefTouchStartY = 0;
            return;
        }
        briefTouchStartX = e.touches[0].clientX;
        briefTouchStartY = e.touches[0].clientY;
    }
    function onBriefTouchEnd(e: TouchEvent) {
        if (e.changedTouches.length !== 1 || briefTouchStartX === 0) return;
        const dx = e.changedTouches[0].clientX - briefTouchStartX;
        const dy = e.changedTouches[0].clientY - briefTouchStartY;
        briefTouchStartX = 0;
        briefTouchStartY = 0;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            if (dx < 0 && nextPerson && !busy) {
                lvLaunchpad.haptic(6);
                void navigate(nextPerson);
            } else if (dx > 0 && previousPerson && !busy) {
                lvLaunchpad.haptic(6);
                void navigate(previousPerson);
            }
        }
    }

    async function loadOthers() {
        if (!detailAlive) return;
        const request = ++othersRequest;
        othersLoading = true;
        othersError = "";
        const target = { docId: current.docId, itemId: current.itemId };
        try {
            const people = await listContacts(settings);
            if (!detailAlive || request !== othersRequest || current.docId !== target.docId || current.itemId !== target.itemId) return;
            others = people;
            const matches = people.filter((item) => item.docId === target.docId || item.itemId === target.itemId);
            if (matches.length === 1 && matches[0].docId === target.docId && matches[0].itemId === target.itemId) {
                if (current.avatar && !matches[0].avatar) matches[0].avatar = current.avatar;
                current = matches[0];
            }
            else othersError = "原人物的文档与行绑定已变化或不唯一，当前详情保留；请重新核对稳定文档 ID";
        } catch (error) {
            if (detailAlive && request === othersRequest && current.docId === target.docId && current.itemId === target.itemId) {
                othersError = requestErrorMessage(error);
            }
        } finally {
            if (detailAlive && request === othersRequest) othersLoading = false;
        }
    }

    loadOthers();

    function isRelationMutationReport(value: unknown): value is RelationMutationReport {
        return typeof value === "object" && value !== null && "fact" in value && "projections" in value;
    }

    function rememberRelationProjections(results: readonly RelationProjectionResult[]) {
        const merged = new Map(relationProjections.map((item) => [item.docId, item]));
        for (const result of results) merged.set(result.docId, result);
        relationProjections = [...merged.values()];
    }

    async function retryRelatedDocuments() {
        if (busy || !detailAlive) return;
        busy = true;
        errorText = "";
        try {
            const result = await retryRelationProjections(settings, pendingRelationProjections.map((item) => item.docId));
            if (!detailAlive) return;
            rememberRelationProjections(result);
            onChanged();
            await loadOthers();
        } catch (error) {
            if (detailAlive) errorText = requestErrorMessage(error);
        } finally {
            if (detailAlive) busy = false;
        }
    }

    async function mutate(action: () => Promise<unknown>, onFailure?: () => void) {
        if (busy) return;
        busy = true;
        errorText = "";
        try {
            const result = await action();
            if (!detailAlive) return;
            onChanged();
            const fresh = await refreshPerson(settings, current);
            if (!detailAlive) return;
            if (fresh) {
                if (current.avatar && !fresh.avatar) fresh.avatar = current.avatar;
                current = fresh;
            }
            if (isRelationMutationReport(result)) {
                rememberRelationProjections(result.projections);
                await loadOthers();
            }
        } catch (error) {
            if (detailAlive) {
                errorText = requestErrorMessage(error);
                onFailure?.();
            }
        } finally {
            if (detailAlive) busy = false;
        }
    }

    function mutateRelationAction(operation: "add" | "remove", other: ContactSummary): void {
        void mutate(async () => {
            const result = operation === "add"
                ? await addRelation(settings, current, other)
                : await removeRelation(settings, current, other);
            pendingRelationMutation = null;
            if (operation === "add") {
                // 标准库 v1.6.0：capsule 不承载动作按钮，撤销确认改由紧凑卡片承载
                lvNotify.card({
                    source: "小驴人脉",
                    message: `已建立与「${other.name}」的关联关系`,
                    level: "success",
                    duration: 5000,
                    actions: [
                        {
                            label: "撤销",
                            primary: true,
                            onClick: async () => {
                                try {
                                    await removeRelation(settings, current, other);
                                    await refreshAfterEdit();
                                    lvNotify.capsule({
                                        source: "小驴人脉",
                                        message: `已撤销与「${other.name}」的关联`,
                                        level: "info",
                                    });
                                } catch (err) {
                                    lvNotify.card({
                                        source: "小驴人脉",
                                        title: "撤销关系失败",
                                        message: `未能撤销关联关系：${err instanceof Error ? err.message : String(err)}`,
                                        level: "error",
                                    });
                                }
                            },
                        },
                    ],
                });
            } else {
                lvNotify.card({
                    source: "小驴人脉",
                    message: `已解除与「${other.name}」的关联关系`,
                    level: "info",
                    duration: 5000,
                    actions: [
                        {
                            label: "撤销",
                            primary: true,
                            onClick: async () => {
                                try {
                                    await addRelation(settings, current, other);
                                    await refreshAfterEdit();
                                    lvNotify.capsule({
                                        source: "小驴人脉",
                                        message: `已恢复与「${other.name}」的关联`,
                                        level: "success",
                                    });
                                } catch (err) {
                                    lvNotify.card({
                                        source: "小驴人脉",
                                        title: "撤销解除失败",
                                        message: `未能恢复关联关系：${err instanceof Error ? err.message : String(err)}`,
                                        level: "error",
                                    });
                                }
                            },
                        },
                    ],
                });
            }
            return result;
        }, () => { pendingRelationMutation = { operation, other }; });
    }

    function retryRelationMutation(): void {
        const pending = pendingRelationMutation;
        if (pending) mutateRelationAction(pending.operation, pending.other);
    }

    async function refreshAfterEdit() {
        const fresh = await refreshPerson(settings, current);
        if (fresh && detailAlive) {
            if (current.avatar && !fresh.avatar) fresh.avatar = current.avatar;
            current = fresh;
        }
        await loadOthers();
        await loadInsights();
        if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
        onChanged();
    }

    // ---- E-32 会面谈资与备忘 ----
    const topicsSupported = $derived(Boolean(onLoadTopics));
    let topics = $state<import("../../domain/topics").PersonTopicItem[]>([]);
    let topicsLoading = $state(false);
    let topicsError = $state("");
    let newTopicText = $state("");
    let addingTopic = $state(false);
    let copiedTopicId = $state("");
    let pendingConvertedTopicId = $state("");
    let busyTopicId = $state("");

    async function loadTopics() {
        if (!onLoadTopics) return;
        const docId = current.docId;
        topicsLoading = true;
        topicsError = "";
        try {
            const list = await onLoadTopics(docId);
            if (detailAlive && current.docId === docId) topics = list;
        } catch (error) {
            if (detailAlive && current.docId === docId) topicsError = requestErrorMessage(error);
        } finally {
            if (detailAlive && current.docId === docId) topicsLoading = false;
        }
    }
    loadTopics();

    async function handleAddTopic() {
        if (!onAddTopic || addingTopic || !newTopicText.trim()) return;
        addingTopic = true;
        topicsError = "";
        try {
            const list = await onAddTopic(current.docId, newTopicText.trim());
            if (detailAlive) {
                topics = list;
                newTopicText = "";
                onChanged();
            }
        } catch (error) {
            if (detailAlive) topicsError = requestErrorMessage(error);
        } finally {
            if (detailAlive) addingTopic = false;
        }
    }

    async function handleRemoveTopic(topicId: string) {
        if (!onRemoveTopic || Boolean(busyTopicId)) return;
        busyTopicId = topicId;
        try {
            const list = await onRemoveTopic(current.docId, topicId);
            if (detailAlive) {
                topics = list;
                onChanged();
            }
        } catch (error) {
            if (detailAlive) topicsError = requestErrorMessage(error);
        } finally {
            busyTopicId = "";
        }
    }

    let copiedTopicTimer: ReturnType<typeof setTimeout> | null = null;
    async function handleCopyTopic(topic: import("../../domain/topics").PersonTopicItem) {
        try {
            await copyPlainText(topic.text);
            copiedTopicId = topic.id;
            if (copiedTopicTimer) clearTimeout(copiedTopicTimer);
            copiedTopicTimer = setTimeout(() => {
                if (copiedTopicId === topic.id) copiedTopicId = "";
            }, 1500);
        } catch (err) {
            topicsError = `复制失败：${requestErrorMessage(err)}`;
        }
    }

    async function handleConvertToInteraction(topic: import("../../domain/topics").PersonTopicItem) {
        if (noteText.trim() && noteText.trim() !== topic.text) {
            const ok = await confirmDialog({
                title: text("topicsConvertConfirmTitle", "替换互动备注草稿"),
                message: text("topicsConvertConfirmMsg", "当前已有未记录的互动备注草稿，转入谈资将替换当前草稿。确定继续吗？"),
                confirmLabel: text("topicsConvertConfirmBtn", "确认替换"),
                cancelLabel: text("topicsConvertCancelBtn", "取消"),
            });
            if (!ok) return;
        }
        noteText = topic.text;
        recorded = false;
        pendingConvertedTopicId = topic.id;
        const noteInput = document.querySelector<HTMLInputElement>(".lvct-detail__record input");
        noteInput?.focus();
    }

    let copiedField = $state<string>("");
    let copyFieldError = $state<string>("");
    let copiedFieldTimer: ReturnType<typeof setTimeout> | null = null;
    let copyFieldErrorTimer: ReturnType<typeof setTimeout> | null = null;

    // svelte-ignore state_referenced_locally
    let privacyMaskActive = $state(preferences?.privacyShieldEnabled ?? false);
    let revealSeconds = $state(0);
    let revealInterval: ReturnType<typeof setInterval> | null = null;

    $effect(() => {
        if (preferences && typeof preferences.privacyShieldEnabled === "boolean") {
            privacyMaskActive = preferences.privacyShieldEnabled;
        }
    });

    let vcardCopied = $state(false);
    let vcardCopiedTimer: ReturnType<typeof setTimeout> | null = null;
    let generatingFlashcards = $state(false);
    let flashcardsDocInfo = $state<{ docId: string; hpath: string; count: number } | null>(null);
    let flashcardsError = $state("");

    async function handleGenerateFlashcards(): Promise<void> {
        if (!onCreateFlashcardsDoc || generatingFlashcards) return;
        generatingFlashcards = true;
        flashcardsError = "";
        try {
            const res = await onCreateFlashcardsDoc(current, facts, topics);
            if (detailAlive) {
                if (res) {
                    flashcardsDocInfo = res;
                } else {
                    flashcardsError = text("detailFlashcardsFailed", "生成闪卡文档失败，请检查笔记本设置");
                }
            }
        } catch (err) {
            if (detailAlive) flashcardsError = requestErrorMessage(err);
        } finally {
            if (detailAlive) generatingFlashcards = false;
        }
    }

    let vcfExported = $state(false);
    let vcfExportedTimer: ReturnType<typeof setTimeout> | null = null;

    function handleExportVcf(): void {
        const vcfText = exportSinglePersonVcf(current);
        const blob = new Blob([vcfText], { type: "text/vcard;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${current.name.trim() || "联系人"}.vcf`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        vcfExported = true;
        if (vcfExportedTimer) clearTimeout(vcfExportedTimer);
        vcfExportedTimer = setTimeout(() => { vcfExported = false; }, 1800);
    }

    async function handleCopyVcf(): Promise<void> {
        const vcfText = exportSinglePersonVcf(current);
        try {
            await copyPlainText(vcfText);
            vcardCopied = true;
            if (vcardCopiedTimer) clearTimeout(vcardCopiedTimer);
            vcardCopiedTimer = setTimeout(() => { vcardCopied = false; }, 1800);
        } catch (err) {
            console.warn("[LvContacts] 复制名片文本失败", err);
            copyFieldError = requestErrorMessage(err);
            if (copyFieldErrorTimer) clearTimeout(copyFieldErrorTimer);
            copyFieldErrorTimer = setTimeout(() => { copyFieldError = ""; }, 2500);
        }
    }

    function togglePrivacyMask(): void {
        if (privacyMaskActive) {
            if (revealSeconds > 0) {
                privacyMaskActive = false;
                revealSeconds = 0;
                if (revealInterval) clearInterval(revealInterval);
            } else {
                revealSeconds = 5;
                if (revealInterval) clearInterval(revealInterval);
                revealInterval = setInterval(() => {
                    revealSeconds -= 1;
                    if (revealSeconds <= 0) {
                        if (revealInterval) clearInterval(revealInterval);
                    }
                }, 1000);
            }
        } else {
            privacyMaskActive = true;
            revealSeconds = 0;
        }
    }

    async function handleCopyField(value: string, fieldKey: string) {
        if (!value) return;
        try {
            await copyPlainText(value);
            copiedField = fieldKey;
            copyFieldError = "";
            if (copiedFieldTimer) clearTimeout(copiedFieldTimer);
            copiedFieldTimer = setTimeout(() => {
                if (copiedField === fieldKey) copiedField = "";
            }, 1800);
        } catch (err) {
            copyFieldError = requestErrorMessage(err);
            if (copyFieldErrorTimer) clearTimeout(copyFieldErrorTimer);
            copyFieldErrorTimer = setTimeout(() => {
                copyFieldError = "";
            }, 2500);
        }
    }

    // ---- E-14 人物详情各区块折叠偏好 ----
    let localCollapsed = $state<DetailCollapsedSections>({});
    $effect(() => {
        localCollapsed = { ...(collapsedSections ?? {}) };
    });

    function isSectionCollapsed(key: DetailSectionKey): boolean {
        return Boolean(localCollapsed[key]);
    }

    function toggleSection(key: DetailSectionKey) {
        const next = !isSectionCollapsed(key);
        localCollapsed = { ...localCollapsed, [key]: next };
        onToggleSection?.(key, next);
    }

    // ---- E-26 礼物点子与偏好清单 ----
    const giftIdeasSupported = $derived(Boolean(onLoadGiftIdeas));
    let giftIdeas = $state<GiftIdeaItem[]>([]);
    let giftIdeasLoading = $state(false);
    let giftIdeasError = $state("");
    let newGiftTitle = $state("");
    let newGiftType = $state<GiftIdeaType>("idea");
    let newGiftPrice = $state<string | number>("");
    let newGiftOccasion = $state("");
    let addingGift = $state(false);
    let busyGiftId = $state("");

    async function loadGiftIdeas() {
        if (!onLoadGiftIdeas) return;
        const docId = current.docId;
        giftIdeasLoading = true;
        giftIdeasError = "";
        try {
            const list = await onLoadGiftIdeas(docId);
            if (detailAlive && current.docId === docId) giftIdeas = list;
        } catch (error) {
            if (detailAlive && current.docId === docId) giftIdeasError = requestErrorMessage(error);
        } finally {
            if (detailAlive && current.docId === docId) giftIdeasLoading = false;
        }
    }
    loadGiftIdeas();

    async function handleAddGiftIdea() {
        if (!onAddGiftIdea || addingGift || !newGiftTitle.trim()) return;
        addingGift = true;
        giftIdeasError = "";
        try {
            const rawPrice = typeof newGiftPrice === "number" ? newGiftPrice : newGiftPrice.trim() ? Number(newGiftPrice.trim()) : undefined;
            const item: GiftIdeaItem = {
                id: newGiftIdeaId(),
                personDocId: current.docId,
                type: newGiftType,
                status: "idea",
                title: newGiftTitle.trim(),
                priceEstimate: typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : undefined,
                targetOccasion: newGiftOccasion.trim() || undefined,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const list = await onAddGiftIdea(item);
            if (detailAlive) {
                giftIdeas = list;
                newGiftTitle = "";
                newGiftPrice = "";
                newGiftOccasion = "";
                onChanged();
            }
        } catch (error) {
            if (detailAlive) giftIdeasError = requestErrorMessage(error);
        } finally {
            if (detailAlive) addingGift = false;
        }
    }

    async function handleToggleGiftStatus(item: GiftIdeaItem) {
        if (!onUpdateGiftIdea || Boolean(busyGiftId)) return;
        busyGiftId = item.id;
        const nextStatus: GiftIdeaStatus = item.status === "idea" ? "purchased" : item.status === "purchased" ? "given" : "idea";
        try {
            const list = await onUpdateGiftIdea(current.docId, item.id, { status: nextStatus });
            if (detailAlive) {
                giftIdeas = list;
                onChanged();
            }
        } catch (error) {
            if (detailAlive) giftIdeasError = requestErrorMessage(error);
        } finally {
            busyGiftId = "";
        }
    }

    let convertedGiftIds = $state<string[]>([]);
    let exchangeReloadKey = $state(0);

    async function handleConvertGiftToExchange(item: GiftIdeaItem) {
        if (!onCreateExchange || Boolean(busyGiftId) || convertedGiftIds.includes(item.id)) return;
        busyGiftId = item.id;
        giftIdeasError = "";
        const todayStr = toLocalDateKey(new Date());
        const exchange = convertGiftIdeaToExchange(item, todayStr);
        try {
            await onCreateExchange({
                requestId: newExchangeRequestId(),
                personDocId: exchange.personDocId,
                kind: exchange.kind,
                direction: exchange.direction,
                description: exchange.description,
                amount: exchange.amount,
                currency: exchange.currency,
                occurredOn: exchange.occurredOn,
                dueOn: exchange.dueOn,
                note: exchange.note,
            });
            if (item.status !== "given" && onUpdateGiftIdea) {
                const updated = await onUpdateGiftIdea(current.docId, item.id, { status: "given" });
                if (detailAlive) giftIdeas = updated;
            }
            if (detailAlive) {
                convertedGiftIds = [...convertedGiftIds, item.id];
                exchangeReloadKey += 1;
            }
            onChanged();
        } catch (error) {
            if (detailAlive) giftIdeasError = requestErrorMessage(error);
        } finally {
            busyGiftId = "";
        }
    }

    async function handleRemoveGiftIdea(ideaId: string) {
        if (!onRemoveGiftIdea || Boolean(busyGiftId)) return;
        busyGiftId = ideaId;
        try {
            const list = await onRemoveGiftIdea(current.docId, ideaId);
            if (detailAlive) {
                giftIdeas = list;
                onChanged();
            }
        } catch (error) {
            if (detailAlive) giftIdeasError = requestErrorMessage(error);
        } finally {
            busyGiftId = "";
        }
    }

    // ---- E-36 重要日期与周年纪念日 ----
    const anniversariesSupported = $derived(Boolean(onLoadAnniversaries));
    let anniversaries = $state<AnniversaryItem[]>([]);
    let anniversariesLoading = $state(false);
    let anniversariesError = $state("");
    let newAnnivTitle = $state("");
    let newAnnivCategory = $state<AnniversaryCategory>("wedding");
    let newAnnivDate = $state(toLocalDateKey(new Date()));
    let newAnnivLunar = $state(false);
    let addingAnniv = $state(false);
    let busyAnnivId = $state("");

    async function loadAnniversaries() {
        if (!onLoadAnniversaries) return;
        const docId = current.docId;
        anniversariesLoading = true;
        anniversariesError = "";
        try {
            const list = await onLoadAnniversaries(docId);
            if (detailAlive && current.docId === docId) anniversaries = list;
        } catch (error) {
            if (detailAlive && current.docId === docId) anniversariesError = requestErrorMessage(error);
        } finally {
            if (detailAlive && current.docId === docId) anniversariesLoading = false;
        }
    }
    loadAnniversaries();

    async function handleAddAnniversary() {
        if (!onAddAnniversary || addingAnniv || !newAnnivTitle.trim()) return;
        addingAnniv = true;
        anniversariesError = "";
        try {
            const item: AnniversaryItem = {
                id: newAnniversaryId(),
                personDocId: current.docId,
                title: newAnnivTitle.trim(),
                category: newAnnivCategory,
                date: newAnnivDate,
                isLunar: newAnnivLunar,
                remindDaysBefore: 7,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const list = await onAddAnniversary(item);
            if (detailAlive) {
                anniversaries = list;
                newAnnivTitle = "";
                onChanged();
                if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
            }
        } catch (error) {
            if (detailAlive) anniversariesError = requestErrorMessage(error);
        } finally {
            if (detailAlive) addingAnniv = false;
        }
    }

    async function handleRemoveAnniversary(annivId: string) {
        if (!onRemoveAnniversary || Boolean(busyAnnivId)) return;
        busyAnnivId = annivId;
        try {
            const list = await onRemoveAnniversary(current.docId, annivId);
            if (detailAlive) {
                anniversaries = list;
                onChanged();
                if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
            }
        } catch (error) {
            if (detailAlive) anniversariesError = requestErrorMessage(error);
        } finally {
            busyAnnivId = "";
        }
    }

    async function handleToggleAnnivRemind(anniv: AnniversaryItem) {
        if (!onUpdateAnniversary || Boolean(busyAnnivId)) return;
        busyAnnivId = anniv.id;
        const nextDisabled = !anniv.remindDisabled;
        try {
            const list = await onUpdateAnniversary(current.docId, anniv.id, { remindDisabled: nextDisabled });
            if (detailAlive) {
                anniversaries = list;
                onChanged();
                if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
            }
        } catch (error) {
            if (detailAlive) anniversariesError = requestErrorMessage(error);
        } finally {
            busyAnnivId = "";
        }
    }

    function handleExportIcs() {
        if (!onExportAnniversariesIcs) return;
        const res = onExportAnniversariesIcs(current, anniversaries);
        const blob = new Blob([res.content], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    // ---- E-37 协作项目与主题 ----
    const projectsSupported = $derived(Boolean(onLoadProjects));
    let projects = $state<PersonProjectItem[]>([]);
    let projectsLoading = $state(false);
    let projectsError = $state("");
    let newProjTitle = $state("");
    let newProjRole = $state("");
    let newProjDocId = $state("");
    let addingProj = $state(false);
    let busyProjectId = $state("");

    async function loadProjects() {
        if (!onLoadProjects) return;
        const docId = current.docId;
        projectsLoading = true;
        projectsError = "";
        try {
            const list = await onLoadProjects(docId);
            if (detailAlive && current.docId === docId) projects = list;
        } catch (error) {
            if (detailAlive && current.docId === docId) projectsError = requestErrorMessage(error);
        } finally {
            if (detailAlive && current.docId === docId) projectsLoading = false;
        }
    }
    loadProjects();

    async function handleAddProject() {
        if (!onAddProject || addingProj || !newProjTitle.trim()) return;
        addingProj = true;
        projectsError = "";
        try {
            const item: PersonProjectItem = {
                id: newProjectId(),
                personDocId: current.docId,
                title: newProjTitle.trim(),
                docId: newProjDocId.trim() || undefined,
                status: "active",
                role: newProjRole.trim() || undefined,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const list = await onAddProject(item);
            if (detailAlive) {
                projects = list;
                newProjTitle = "";
                newProjRole = "";
                newProjDocId = "";
                onChanged();
            }
        } catch (error) {
            if (detailAlive) projectsError = requestErrorMessage(error);
        } finally {
            if (detailAlive) addingProj = false;
        }
    }

    async function handleRemoveProject(projectId: string) {
        if (!onRemoveProject || Boolean(busyProjectId)) return;
        busyProjectId = projectId;
        try {
            const list = await onRemoveProject(current.docId, projectId);
            if (detailAlive) {
                projects = list;
                onChanged();
            }
        } catch (error) {
            if (detailAlive) projectsError = requestErrorMessage(error);
        } finally {
            busyProjectId = "";
        }
    }

    async function handleToggleProjectStatus(proj: PersonProjectItem) {
        if (!onUpdateProject || Boolean(busyProjectId)) return;
        busyProjectId = proj.id;
        const nextStatus = getNextProjectStatus(proj.status);
        try {
            const list = await onUpdateProject(current.docId, proj.id, { status: nextStatus });
            if (detailAlive) {
                projects = list;
                onChanged();
            }
        } catch (error) {
            if (detailAlive) projectsError = requestErrorMessage(error);
        } finally {
            busyProjectId = "";
        }
    }

    // ---- 会面简报导出（F11） ----
    let briefingExportOpen = $state(false);
    let briefingLimit = $state(10);
    let briefingGeneratedAt = $state("");
    let briefingCopied = $state(false);
    let briefingCopying = $state(false);
    let briefingCopyTimer: ReturnType<typeof setTimeout> | null = null;
    let briefingDocBusy = $state(false);
    let briefingDocCreated = $state<{ docId: string; hpath: string } | null>(null);
    let briefingDocError = $state("");
    let cardModalOpen = $state(false);
    let siyuanRefCopied = $state(false);
    let siyuanRefTimer: ReturnType<typeof setTimeout> | null = null;
    let siyuanUriCopied = $state(false);
    let siyuanUriTimer: ReturnType<typeof setTimeout> | null = null;
    let timelineCopied = $state(false);
    let timelineCopyTimer: ReturnType<typeof setTimeout> | null = null;

    async function copyTimelineMarkdown() {
        if (filteredTimeline.length === 0) return;
        const lines = [`## 与 ${current.name} 的往来记录`, ""];
        for (const item of filteredTimeline) {
            const typeLabel = INTERACTION_TYPE_LABELS[item.type]?.label ?? "互动";
            const icon = INTERACTION_TYPE_LABELS[item.type]?.icon ?? "📝";
            const noteStr = item.note ? `：${item.note}` : "";
            lines.push(`- ${item.localDate} ${icon} ${typeLabel}${noteStr}`);
        }
        try {
            await copyPlainText(lines.join("\n"));
            timelineCopied = true;
            if (timelineCopyTimer) clearTimeout(timelineCopyTimer);
            timelineCopyTimer = setTimeout(() => {
                timelineCopied = false;
            }, 1500);
        } catch (err) {
            errorText = `复制失败：${requestErrorMessage(err)}`;
        }
    }

    let convertedBlockIds = $state<string[]>([]);
    let recordInputEl: HTMLInputElement | undefined = $state();

    async function scrollToRecordSection() {
        if (await selectTab("overview")) {
            await tick();
            recordInputEl?.scrollIntoView({ behavior: "smooth", block: "center" });
            recordInputEl?.focus();
        }
    }
    const allConvertedBlockIds = $derived.by(() => {
        const ids = new Set<string>(convertedBlockIds);
        if (insights?.timeline) {
            for (const item of insights.timeline) {
                if (item.externalRef?.startsWith("block:")) {
                    ids.add(item.externalRef.slice("block:".length));
                }
            }
        }
        return ids;
    });

    let backlinkQuery = $state("");
    let backlinkFilterKind = $state<"all" | "link" | "mention">("all");

    const filteredBacklinks = $derived.by(() => {
        if (!insights?.backlinks) return [];
        let list = insights.backlinks;
        if (backlinkFilterKind !== "all") {
            list = list.filter((item) => item.kind === backlinkFilterKind);
        }
        const q = backlinkQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((item) =>
                item.content.toLowerCase().includes(q) ||
                item.docTitle.toLowerCase().includes(q) ||
                item.date.includes(q),
            );
        }
        return list;
    });

    const backlinkMonthGroups = $derived.by(() => {
        const list = filteredBacklinks.map((bItem) => {
            const timeInfo = parseBacklinkOccurredTime(bItem);
            return {
                ...bItem,
                timeInfo,
                localDate: timeInfo.localDate,
            };
        });
        return groupByMonth(list);
    });

    let copiedBlockUriId = $state("");
    let copiedBlockUriTimer: ReturnType<typeof setTimeout> | null = null;

    async function copyBlockUri(blockId: string, event?: MouseEvent) {
        if (!blockId) return;
        const uri = `siyuan://blocks/${blockId}`;
        if (event?.ctrlKey || event?.metaKey) {
            window.open(uri, "_self");
            return;
        }
        try {
            await copyPlainText(uri);
            copiedBlockUriId = blockId;
            if (copiedBlockUriTimer) clearTimeout(copiedBlockUriTimer);
            copiedBlockUriTimer = setTimeout(() => {
                if (copiedBlockUriId === blockId) copiedBlockUriId = "";
            }, 1500);
        } catch (err) {
            errorText = `复制块链接失败：${requestErrorMessage(err)}`;
        }
    }

    let backlinkSummaryCopied = $state(false);
    let backlinkSummaryTimer: ReturnType<typeof setTimeout> | null = null;

    async function copyBacklinkSummaryMarkdown() {
        if (!filteredBacklinks.length) return;
        const lines = [`## 关于 ${current.name} 的笔记反链与提及（共 ${filteredBacklinks.length} 条）`, ""];
        for (const b of filteredBacklinks) {
            const timeInfo = parseBacklinkOccurredTime(b);
            const kindTag = b.kind === "mention" ? "💡 提及" : "🔗 双链";
            lines.push(`- ${timeInfo.localDate} ${kindTag} 📝 《${b.docTitle}》：${b.content}`);
        }
        try {
            await copyPlainText(lines.join("\n"));
            backlinkSummaryCopied = true;
            if (backlinkSummaryTimer) clearTimeout(backlinkSummaryTimer);
            backlinkSummaryTimer = setTimeout(() => {
                backlinkSummaryCopied = false;
            }, 1500);
        } catch (err) {
            errorText = `复制反链摘要失败：${requestErrorMessage(err)}`;
        }
    }

    interface EditingBacklinkDraft {
        blockId: string;
        date: string;
        type: InteractionType;
        note: string;
        originalItem: import("../../services/insights").BacklinkMentionItem;
    }
    let editingBacklink = $state<EditingBacklinkDraft | null>(null);
    let batchConverting = $state(false);
    let backlinksCollapsed = $state(false);

    function startEditBacklink(item: import("../../services/insights").BacklinkMentionItem) {
        if (editingBacklink?.blockId === item.blockId) {
            editingBacklink = null;
            return;
        }
        const timeInfo = parseBacklinkOccurredTime(item);
        const note = cleanInteractionNote(item.content, item.docTitle);
        const type = inferInteractionType(item.content);
        editingBacklink = {
            blockId: item.blockId,
            date: timeInfo.localDate,
            type,
            note,
            originalItem: item,
        };
    }

    async function commitEditBacklink() {
        const draft = editingBacklink;
        if (!draft || busy) return;
        const item = draft.originalItem;
        const targetDate = draft.date || toLocalDateKey();
        const occurredAt = new Date(`${targetDate}T12:00:00`).getTime();
        busy = true;
        try {
            await onRecord(current.docId, draft.note.trim() || undefined, draft.type, {
                occurredAt,
                source: "diary",
                externalRef: `block:${item.blockId}`,
            });
            convertedBlockIds = [...convertedBlockIds, item.blockId];
            editingBacklink = null;
            await loadInsights();
            onChanged();
            if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
        } catch (err) {
            console.warn("[LvContacts] 反链微调转互动未完成", err);
            if (detailAlive) insightsError = requestErrorMessage(err);
        } finally {
            busy = false;
        }
    }

    async function convertAllBacklinks() {
        if (!insights?.backlinks || busy || batchConverting) return;
        const unconverted = insights.backlinks.filter((item) => !allConvertedBlockIds.has(item.blockId));
        if (unconverted.length === 0) return;
        batchConverting = true;
        busy = true;
        const newlyConverted: string[] = [];
        try {
            for (const item of unconverted) {
                const timeInfo = parseBacklinkOccurredTime(item);
                const note = cleanInteractionNote(item.content, item.docTitle);
                const type = inferInteractionType(item.content);
                await onRecord(current.docId, note, type, {
                    occurredAt: timeInfo.occurredAt,
                    source: "diary",
                    externalRef: `block:${item.blockId}`,
                    skipDocSync: true,
                });
                newlyConverted.push(item.blockId);
            }
            convertedBlockIds = [...convertedBlockIds, ...newlyConverted];
            await loadInsights();
            onChanged();
            if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
        } catch (err) {
            console.warn("[LvContacts] 批量反链转互动未完成", err);
            if (detailAlive) insightsError = requestErrorMessage(err);
        } finally {
            busy = false;
            batchConverting = false;
        }
    }

    async function convertBacklinkToInteraction(item: import("../../services/insights").BacklinkMentionItem) {
        if (!item || busy || allConvertedBlockIds.has(item.blockId)) return;
        const timeInfo = parseBacklinkOccurredTime(item);
        const note = cleanInteractionNote(item.content, item.docTitle);
        const type = inferInteractionType(item.content);
        busy = true;
        try {
            await onRecord(current.docId, note, type, {
                occurredAt: timeInfo.occurredAt,
                source: "diary",
                externalRef: `block:${item.blockId}`,
            });
            convertedBlockIds = [...convertedBlockIds, item.blockId];
            await loadInsights();
            onChanged();
            if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
        } catch (err) {
            console.warn("[LvContacts] 反链转互动未完成", err);
            if (detailAlive) insightsError = requestErrorMessage(err);
        } finally {
            busy = false;
        }
    }

    let docSynced = $state(false);
    let docSyncTimer: ReturnType<typeof setTimeout> | null = null;
    let docSyncing = $state(false);

    async function handleSyncDocProfile() {
        if (!onSyncDocProfile || !current?.docId || docSyncing) return;
        docSyncing = true;
        copyFieldError = "";
        try {
            await onSyncDocProfile(current);
            docSynced = true;
            if (docSyncTimer) clearTimeout(docSyncTimer);
            docSyncTimer = setTimeout(() => {
                docSynced = false;
            }, 2000);
        } catch (err) {
            copyFieldError = `同步档案到正文未完成：${requestErrorMessage(err)}`;
            if (copyFieldErrorTimer) clearTimeout(copyFieldErrorTimer);
            copyFieldErrorTimer = setTimeout(() => {
                copyFieldError = "";
            }, 4000);
        } finally {
            docSyncing = false;
        }
    }

    async function copySiyuanRef() {
        const refText = `((${current.docId} "${current.name}"))`;
        try {
            await copyPlainText(refText);
            siyuanRefCopied = true;
            if (siyuanRefTimer) clearTimeout(siyuanRefTimer);
            siyuanRefTimer = setTimeout(() => {
                siyuanRefCopied = false;
            }, 2000);
        } catch (err) {
            console.warn("[LvContacts] 复制思源块引用失败", err);
        }
    }

    async function copySiyuanUri() {
        const uriText = `siyuan://blocks/${current.docId}`;
        try {
            await copyPlainText(uriText);
            siyuanUriCopied = true;
            if (siyuanUriTimer) clearTimeout(siyuanUriTimer);
            siyuanUriTimer = setTimeout(() => {
                siyuanUriCopied = false;
            }, 2000);
        } catch (err) {
            console.warn("[LvContacts] 复制思源 URI 失败", err);
        }
    }

    async function copyBriefing() {
        if (!briefingPreview || briefingCopying) return;
        briefingCopying = true;
        try {
            await copyPlainText(briefingPreview);
            briefingCopied = true;
            if (briefingCopyTimer) clearTimeout(briefingCopyTimer);
            briefingCopyTimer = setTimeout(() => {
                briefingCopied = false;
            }, 2000);
        } catch (err) {
            errorText = `复制简报失败：${requestErrorMessage(err)}`;
        } finally {
            briefingCopying = false;
        }
    }

    onDestroy(() => {
        if (preMeetingBriefCopyTimer) clearTimeout(preMeetingBriefCopyTimer);
        if (preMeetingBriefCalloutCopyTimer) clearTimeout(preMeetingBriefCalloutCopyTimer);
        if (preMeetingBriefDailyCopyTimer) clearTimeout(preMeetingBriefDailyCopyTimer);
        if (greetingReminderTimer) clearTimeout(greetingReminderTimer);
        if (briefingCopyTimer) clearTimeout(briefingCopyTimer);
        if (siyuanRefTimer) clearTimeout(siyuanRefTimer);
        if (siyuanUriTimer) clearTimeout(siyuanUriTimer);
        if (timelineCopyTimer) clearTimeout(timelineCopyTimer);
        if (copiedBlockUriTimer) clearTimeout(copiedBlockUriTimer);
        if (backlinkSummaryTimer) clearTimeout(backlinkSummaryTimer);
        if (docSyncTimer) clearTimeout(docSyncTimer);
        if (copiedTopicTimer) clearTimeout(copiedTopicTimer);
        if (copiedFieldTimer) clearTimeout(copiedFieldTimer);
        if (copyFieldErrorTimer) clearTimeout(copyFieldErrorTimer);
        if (revealInterval) clearInterval(revealInterval);
        if (vcardCopiedTimer) clearTimeout(vcardCopiedTimer);
        if (vcfExportedTimer) clearTimeout(vcfExportedTimer);
        if (flashcardToastTimer) clearTimeout(flashcardToastTimer);
    });
    function openBriefingExport() {
        const now = new Date();
        const pad = (value: number) => String(value).padStart(2, "0");
        briefingGeneratedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        briefingDocCreated = null;
        briefingDocError = "";
        briefingExportOpen = true;
    }
    const briefingInput = $derived.by((): import("../../domain/briefing-export").BriefingExportInput | null => {
        if (!briefingExportOpen) return null;
        return {
            person: current,
            timeline: insights?.timeline ?? [],
            followUps: openFollowUps.map((item) => ({ title: item.title, dueDate: item.dueDate })),
            relatedNames: relatedPeople.map((item) => item.name),
            coAttendance: insights?.coAttendance ?? [],
            limit: briefingLimit,
            generatedAt: briefingGeneratedAt,
            topics: topics.map((item) => item.text),
            anniversaries: anniversaries.map((a) => {
                const proj = nextAnniversary(a);
                return {
                    title: a.title,
                    category: a.category,
                    date: a.date,
                    isLunar: a.isLunar,
                    daysUntil: proj?.daysUntil,
                    yearsCount: proj?.yearsCount,
                    displayDate: proj?.displayDate,
                };
            }),
            commonOrgs: commonOrgs.map((org) => ({
                orgName: org.orgName,
                peers: org.peers.map((p) => ({
                    name: p.name,
                    samePeriod: p.samePeriod,
                    overlapText: p.overlapText,
                })),
            })),
            backlinks: (insights?.backlinks ?? []).slice(0, 5).map((b) => ({
                date: b.date,
                docTitle: b.docTitle,
                content: b.content,
                kind: b.kind,
                blockId: b.blockId,
            })),
            kinships: kinships.map((k) => ({
                role: k.role,
                name: k.name,
                relationLabel: k.relationLabel,
                birthYearOrDate: k.birthYearOrDate,
                note: k.note,
            })),
            promises: promises.map((p) => ({
                direction: p.direction,
                title: p.title,
                detail: p.detail,
                promisedOn: p.promisedOn,
                dueOn: p.dueOn,
                status: p.status,
                fulfilledOn: p.fulfilledOn,
            })),
            socialPreferences: mergedSocialPreferences.map((p) => ({
                category: p.category,
                content: p.content,
                isTaboo: p.isTaboo,
            })),
        };
    });
    const briefingPreview = $derived.by(() => {
        if (!briefingInput) return "";
        return buildBriefingMarkdown(briefingInput);
    });
    async function handleCreateBriefingDoc() {
        if (!onCreateBriefingDoc || !briefingInput || briefingDocBusy) return;
        briefingDocBusy = true;
        briefingDocError = "";
        try {
            const res = await onCreateBriefingDoc(briefingInput);
            if (res) {
                briefingDocCreated = res;
            } else {
                briefingDocError = text("briefingDocFail", "未能创建简报文档，请检查笔记本配置");
            }
        } catch (err: unknown) {
            briefingDocError = err instanceof Error ? err.message : String(err);
        } finally {
            briefingDocBusy = false;
        }
    }
    function downloadBriefing() {
        const blob = new Blob([briefingPreview], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        const stamp = toLocalDateKey(new Date());
        anchor.download = buildBriefingFilename(current.name, stamp);
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    async function confirmDelete() {
        if (deleting || busy) return;
        const confirmed = await confirmDialog({
            title: "移除联系人",
            message: `确定从人脉名册移除「${current.name}」吗？人物文档会保留。`,
            confirmLabel: "移除",
            cancelLabel: "取消",
            danger: true,
        });
        if (!confirmed) return;
        deleting = true;
        errorText = "";
        try {
            if (onRemoveContactToTrash) {
                await onRemoveContactToTrash(current);
            } else {
                await removeContact(settings, current);
            }
            onDeleted();
        } catch (error) {
            errorText = requestErrorMessage(error);
        } finally {
            deleting = false;
        }
    }

    // ---- 跟进计划（F05） ----
    const followUpSupported = $derived(Boolean(onListFollowUps && onCreateFollowUp && onSetFollowUpStatus && onSnoozeFollowUp));
    /* B12：组织归属区块（onLoadOrgMemberships 接线即显示） */
    const orgSectionSupported = $derived(Boolean(onLoadOrgMemberships));
    let followUps: FollowUpItem[] = $state([]);
    let followUpsLoading = $state(true);
    let followUpsLoadedDocId = $state("");
    const initialFollowUpDate = toLocalDateKey(new Date());
    let followUpTitle = $state("");
    let followUpDate = $state(initialFollowUpDate);
    let followUpSavedTitle = $state("");
    let followUpSavedDate = $state(initialFollowUpDate);
    let followUpBusy = $state(false);
    let followUpRecorded = $state(false);
    let followUpError = $state("");
    /* 写入已经成功但随后列表回读失败时，不能把成功误报为写入失败。 */
    let followUpActionError = $state("");
    /** 写后回读/同步失败时保留原请求和输入；编辑任一字段后必须放弃该 key。 */
    let followUpFailedRequest = $state<{ requestId: string; title: string; dueDate: string } | null>(null);
    let followUpRefreshWarning = $state("");
    let followUpRequest = 0;
    let followUpRequestId = $state("");
    let snoozeForId = $state("");
    let snoozeCustomDate = $state("");
    const todayKey = $derived(toLocalDateKey(new Date()));
    const followUpPlanDirty = $derived(hasFollowUpDraft({
        title: followUpTitle,
        dueDate: followUpDate,
        savedTitle: followUpSavedTitle,
        savedDueDate: followUpSavedDate,
        snoozeCustomDate: "",
    }));
    const followUpSnoozeDirty = $derived(snoozeCustomDate.trim().length > 0);
    const followUpDraftDirty = $derived(followUpPlanDirty || followUpSnoozeDirty);
    const openFollowUps = $derived(followUps.filter((item) => item.status === "open"));
    const closedFollowUps = $derived(followUps.filter((item) => item.status !== "open"));

    /* 跟进输入没有「保存并离开」：离开确认只能放弃或取消，避免隐式创建/推迟。 */
    useCloseGuard({
        busy: () => busy || deleting || personNoteSaving || followUpBusy || cadenceSaving,
        dirty: () => followUpDraftDirty,
        changes: () => [
            ...(followUpPlanDirty ? [text("guardFollowUpDraft", "跟进计划草稿尚未添加")] : []),
            ...(followUpSnoozeDirty ? [text("guardSnoozeDraft", "推迟日期尚未应用")] : []),
        ],
    });

    async function loadFollowUps(): Promise<boolean> {
        if (!onListFollowUps) return false;
        const request = ++followUpRequest;
        const targetDocId = current.docId;
        if (followUpsLoadedDocId !== targetDocId || Boolean(followUpError)) {
            followUpsLoading = true;
        }
        followUpError = ""; /* FUNC-01.12：重试先清错误态，成功后不得残留旧错误分支 */
        try {
            const next = await onListFollowUps(targetDocId);
            /* 旧请求被新请求取代时，交给当前请求继续显示结果，不制造假失败。 */
            if (!detailAlive || request !== followUpRequest || current.docId !== targetDocId) return true;
            followUps = next;
            followUpsLoadedDocId = targetDocId;
            followUpRefreshWarning = "";
            return true;
        } catch (error) {
            if (detailAlive && request === followUpRequest && current.docId === targetDocId) {
                followUpError = requestErrorMessage(error);
                followUpsLoadedDocId = "";
                return false;
            }
            return true;
        } finally {
            if (detailAlive && request === followUpRequest) followUpsLoading = false;
        }
    }

    async function refreshFollowUpsAfterMutation(): Promise<void> {
        const refreshed = await loadFollowUps();
        if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {});
        if (!refreshed && detailAlive) {
            followUpRefreshWarning = text(
                "fuSavedRefreshFail",
                "已保存，但跟进列表刷新失败。请点击“重试”核实最新状态；不要重复提交。",
            );
        }
    }

    loadFollowUps();

    /* ---- B12：组织归属投影（可选：未接线时隐藏该区） ---- */
    let orgMemberships: import("../../services/org").PersonOrgMembershipView[] = $state([]);
    let orgLoading = $state(false);
    let orgReadError = $state("");
    let orgReadRequest = 0;
    let orgCandidatesRequest = 0;
    let orgCandidatesLoading = $state(false);
    let createOrganizationTrigger: HTMLButtonElement | undefined = $state();
    let addOrganizationSelect: HTMLSelectElement | undefined = $state();
    let orgCandidatesError = $state("");
    let orgMembershipReport = $state<OrgMembershipWriteReport | null>(null);
    let removingOrgMembershipId = $state("");
    let editingOrgMembershipId = $state("");
    let editOrgDepartment = $state("");
    let editOrgTitle = $state("");
    let editOrgJoinedOn = $state("");
    let editOrgLeftOn = $state("");
    let editOrgStatus = $state<"active" | "former">("active");
    let editOrgStatusLabel = $state("");
    let editOrgNote = $state("");
    let editOrgAffiliationKind = $state<OrgAffiliationKind>("unspecified");
    let editingOrgSnapshot = $state<OrgMembership | null>(null);
    let removingOrgSnapshot = $state<OrgMembership | null>(null);

    function orgMembershipSnapshot(membership: import("../../services/org").PersonOrgMembershipView): OrgMembership {
        return { id: membership.id, orgDocId: membership.orgDocId, personDocId: current.docId,
            department: membership.department, title: membership.title, joinedOn: membership.joinedOn,
            leftOn: membership.leftOn, status: membership.status,
            ...(membership.statusLabel ? { statusLabel: membership.statusLabel } : {}),
            ...(membership.affiliationKind === undefined ? {} : { affiliationKind: membership.affiliationKind }),
            ...(membership.note ? { note: membership.note } : {}) };
    }
    async function loadOrgMemberships(): Promise<void> {
        if (!onLoadOrgMemberships) return;
        const request = ++orgReadRequest;
        const docId = current.docId;
        orgLoading = true;
        orgReadError = "";
        try {
            const next = await onLoadOrgMemberships(docId);
            if (detailAlive && request === orgReadRequest && docId === current.docId) orgMemberships = next;
        } catch (error) {
            if (detailAlive && request === orgReadRequest && docId === current.docId) orgReadError = requestErrorMessage(error);
        } finally { if (detailAlive && request === orgReadRequest && docId === current.docId) orgLoading = false; }
    }

    loadOrgMemberships();

    /* ---- B13.5 双向编辑完整版：人物详情内直接添加/移除组织归属 ---- */
    const orgAddSupported = $derived(Boolean(onLoadOrgCandidates && onAddOrgMembership));
    const orgRemoveSupported = $derived(Boolean(onRemoveOrgMembership));
    let orgCandidates: ReadonlyArray<{ docId: string; name: string; archived?: boolean }> = $state([]);
    let addOrgDocId = $state("");
    let addOrgDepartment = $state("");
    let addOrgTitle = $state("");
    let addOrgJoinedOn = $state("");
    let addOrgAffiliationKind = $state<OrgAffiliationKind>("unspecified");
    let addOrgStatus = $state<OrgMembershipStatus>("active");
    let addOrgStatusLabel = $state("");
    let addOrgNote = $state("");
    let addOrgLeftOn = $state("");
    const selectedAddOrg = $derived(orgCandidates.find((org) => org.docId === addOrgDocId));
    let addOrgBusy = $state(false);
    let orgAction = $state<"create" | "add" | "edit" | "remove" | "">("");
    let addOrgError = $state("");
    /*
     * 候选列表不能随状态下拉先行过滤掉已有当前组织：用户需要先选中
     * 该组织，才能把这次操作明确改成“补录历史”。否则同组织多段经历
     * 在详情页没有可达路径（状态控件又依赖先选组织）。提交时仍由
     * addOrgMembership 保持 active 幂等保护。
     */
    const orgCandidateOptions = $derived(orgCandidates);
    function hasActiveOrgMembership(orgDocId: string): boolean {
        return orgMemberships.some((membership) => membership.orgDocId === orgDocId && membership.status === "active");
    }
    useCloseGuard({
        busy: () => addOrgBusy,
        dirty: () => Boolean(addOrgDocId || addOrgDepartment.trim() || addOrgTitle.trim() || addOrgJoinedOn || addOrgLeftOn || addOrgStatusLabel.trim() || addOrgNote.trim() || addOrgStatus !== "active" || addOrgAffiliationKind !== "unspecified"
            || editingOrgMembershipId || removingOrgMembershipId),
        changes: () => [text("orgUnsaved", "组织管理中的修改尚未完成")],
    });
    async function loadOrgCandidates(): Promise<void> {
        if (!onLoadOrgCandidates) return;
        const request = ++orgCandidatesRequest;
        orgCandidatesLoading = true;
        orgCandidatesError = "";
        try {
            const next = await onLoadOrgCandidates();
            if (detailAlive && request === orgCandidatesRequest) orgCandidates = next;
        } catch (error) {
            if (detailAlive && request === orgCandidatesRequest) orgCandidatesError = requestErrorMessage(error);
        } finally { if (detailAlive && request === orgCandidatesRequest) orgCandidatesLoading = false; }
    }
    async function createOrganizationFromDetail(): Promise<void> {
        if (!onCreateOrganization || addOrgBusy || orgCandidatesLoading) return;
        addOrgBusy = true;
        orgAction = "create";
        addOrgError = "";
        const personDocId = current.docId;
        try {
            const created = await onCreateOrganization();
            if (!detailAlive || current.docId !== personDocId) return;
            await loadOrgCandidates();
            if (!detailAlive || current.docId !== personDocId || !created) return;
            // 新组织的稳定身份来自创建结果；不能按同名猜测或覆盖其他归属草稿。
            if (!orgCandidates.some((org) => org.docId === created.docId)) orgCandidates = [...orgCandidates, created];
            addOrgDocId = created.docId;
            if (created.name.trim() === "家庭") addOrgAffiliationKind = "family";
        } catch (error) {
            if (detailAlive) addOrgError = requestErrorMessage(error);
        } finally {
            if (detailAlive) { addOrgBusy = false; orgAction = ""; }
            await tick();
            const target = createOrganizationTrigger ?? addOrganizationSelect;
            if (detailAlive && target?.isConnected && !target.disabled) target.focus({ preventScroll: true });
        }
    }
    async function addOrgMembership(): Promise<void> {
        if (!onAddOrgMembership || addOrgBusy || orgLoading || orgReadError || orgCandidatesError || orgCandidatesLoading || addOrgDocId === "") return;
        if (addOrgStatus === "active" && orgMemberships.some((membership) => membership.orgDocId === addOrgDocId && membership.status === "active")) {
            addOrgError = "该组织已有当前归属；请编辑已有记录，或将本次状态设为已离开/毕业以补录历史期间。";
            return;
        }
        addOrgBusy = true;
        orgAction = "add";
        addOrgError = "";
        try {
            const report = await onAddOrgMembership(current.docId, addOrgDocId, {
                department: addOrgDepartment.trim(),
                title: addOrgTitle.trim(),
                joinedOn: addOrgJoinedOn,
                leftOn: addOrgLeftOn,
                status: addOrgStatus,
                statusLabel: addOrgStatusLabel.trim(),
                affiliationKind: addOrgAffiliationKind,
                note: addOrgNote.trim(),
            });
            if (!detailAlive) return;
            orgMembershipReport = report ?? null;
            addOrgDocId = "";
            addOrgDepartment = "";
            addOrgTitle = "";
            addOrgJoinedOn = "";
            addOrgAffiliationKind = "unspecified";
            addOrgLeftOn = "";
            addOrgStatus = "active";
            addOrgStatusLabel = "";
            addOrgNote = "";
            onChanged();
            await loadOrgMemberships();
            await loadOrgCandidates();
        } catch (error) {
            if (detailAlive) addOrgError = requestErrorMessage(error);
        } finally {
            if (detailAlive) { addOrgBusy = false; orgAction = ""; }
        }
    }
    async function removeOrgMembership(membershipId: string): Promise<void> {
        if (!onRemoveOrgMembership || addOrgBusy || orgLoading || orgReadError || removingOrgMembershipId !== membershipId) return;
        addOrgBusy = true;
        orgAction = "remove";
        addOrgError = "";
        try {
            const report = await onRemoveOrgMembership(membershipId, removingOrgSnapshot ?? undefined);
            if (!detailAlive) return;
            orgMembershipReport = report ?? null;
            removingOrgMembershipId = "";
            onChanged();
            await loadOrgMemberships();
            await loadOrgCandidates();
        } catch (error) {
            if (detailAlive) addOrgError = requestErrorMessage(error);
        } finally {
            if (detailAlive) { addOrgBusy = false; orgAction = ""; }
        }
    }

    function startEditOrgMembership(membership: import("../../services/org").PersonOrgMembershipView): void {
        if (addOrgBusy || orgLoading || orgReadError || membership.removed) return;
        editingOrgMembershipId = membership.id;
        editingOrgSnapshot = orgMembershipSnapshot(membership);
        editOrgDepartment = membership.department;
        editOrgTitle = membership.title;
        editOrgJoinedOn = membership.joinedOn;
        editOrgLeftOn = membership.leftOn;
        editOrgStatus = membership.archived ? "former" : membership.status;
        editOrgStatusLabel = membership.statusLabel ?? "";
        editOrgNote = membership.note ?? "";
        editOrgAffiliationKind = membership.affiliationKind ?? "unspecified";
    }

    async function saveEditOrgMembership(): Promise<void> {
        if (!onUpdateOrgMembership || addOrgBusy || !editingOrgMembershipId || orgLoading || orgReadError) return;
        addOrgBusy = true;
        orgAction = "edit";
        addOrgError = "";
        try {
            const patch = { department: editOrgDepartment, title: editOrgTitle,
                joinedOn: editOrgJoinedOn, leftOn: editOrgLeftOn, status: editOrgStatus, statusLabel: editOrgStatusLabel,
                affiliationKind: editOrgAffiliationKind,
                ...((editOrgNote.trim() || editingOrgSnapshot?.note !== undefined) ? { note: editOrgNote } : {}) };
            const report = await onUpdateOrgMembership(editingOrgMembershipId, patch, editingOrgSnapshot ?? undefined);
            if (!detailAlive) return;
            orgMembershipReport = report ?? null;
            editingOrgMembershipId = "";
            onChanged();
            await loadOrgMemberships();
            await loadOrgCandidates();
        } catch (error) { if (detailAlive) addOrgError = requestErrorMessage(error); }
        finally { if (detailAlive) { addOrgBusy = false; orgAction = ""; } }
    }

    function affiliationLabel(kind: OrgAffiliationKind | undefined): string {
        return kind === "family" ? "家庭" : kind === "work" ? text("orgAffiliationWork", "工作单位") : kind === "education" ? text("orgAffiliationEducation", "学校") : text("orgAffiliationUnspecified", "未分类");
    }

    function changeAddOrgStatus(status: OrgMembershipStatus): void {
        if (status === "active" && (selectedAddOrg?.archived || (addOrgDocId && hasActiveOrgMembership(addOrgDocId)))) {
            addOrgStatus = "former";
            addOrgError = "该组织已有当前归属或已归档，只能补录历史经历。";
            return;
        }
        addOrgStatus = status;
        if (status === "active") addOrgLeftOn = "";
    }

    function changeAddOrg(docId: string): void {
        addOrgDocId = docId;
        addOrgError = "";
        const org = orgCandidates.find((candidate) => candidate.docId === docId);
        if (org?.archived || hasActiveOrgMembership(docId)) {
            /* 选中已有当前组织后直接进入历史模式，保留稳定组织身份，
             * 让用户继续填写期间/备注，而不是把选择器表现成“无反应”。 */
            addOrgStatus = "former";
            addOrgLeftOn = "";
        } else {
            /* 切换到普通新组织时恢复默认的当前模式，避免上一个
             * 历史补录的状态和结束日期串到新的组织草稿。 */
            addOrgStatus = "active";
            addOrgLeftOn = "";
        }
        if (org?.name.trim() === "家庭") addOrgAffiliationKind = "family";
    }

    function changeEditOrgStatus(status: OrgMembershipStatus): void {
        editOrgStatus = status;
        if (status === "active") editOrgLeftOn = "";
    }

    loadOrgCandidates();

    /* ---- B13.6 共同背景投影（只读展示，零写入；失败降级隐藏） ---- */
    const commonOrgsSupported = $derived(Boolean(onLoadCommonOrgs));
    let commonOrgs: import("../../domain/org-membership").CommonOrgBackground[] = $state([]);
    let commonOrgsLoading = $state(false);
    let commonOrgsFailed = $state(false);
    let commonOrgsRequest = 0;
    async function loadCommonOrgs(): Promise<void> {
        if (!onLoadCommonOrgs) return;
        const request = ++commonOrgsRequest;
        const docId = current.docId;
        commonOrgsLoading = true;
        commonOrgsFailed = false;
        try {
            const next = await onLoadCommonOrgs(docId);
            if (!detailAlive || request !== commonOrgsRequest || docId !== current.docId) return;
            commonOrgs = next;
            commonOrgsFailed = false;
        } catch (error) {
            if (!detailAlive || request !== commonOrgsRequest || docId !== current.docId) return;
            commonOrgs = [];
            commonOrgsFailed = true;
        } finally {
            if (detailAlive && request === commonOrgsRequest && docId === current.docId) commonOrgsLoading = false;
        }
    }

    loadCommonOrgs();

    /* FUNC-01.7-a & K-04：数据变化（跨窗口/宿主）→ 原地重载洞察、跟进与组织成员事实；
       各模块独立守卫未保存草稿，彼此不串锁阻断，当前人物与输入草稿严格保留 */
    let lastSeenRevision = untrack(() => revision);
    let refreshPending = $state(false);
    let orgRefreshPending = $state(false);
    $effect(() => {
        if (revision !== lastSeenRevision) {
            lastSeenRevision = revision;
            refreshPending = true;
            orgRefreshPending = true;
        }
        if (refreshPending && !busy && !followUpBusy && !personNoteSaving && !personNoteLegacyBusy && !cadenceSaving && personNoteDraft === personNote) {
            refreshPending = false;
            void loadOthers();
            void loadInsights();
            void loadFollowUps();
            void loadPersonNoteState(true);
            void loadFacts();
            void loadTopics();
            void loadKinships();
            void loadPromises();
            void loadLifecycleStage();
            void loadScratchpads();
            void loadSocialPreferences();
            void loadGiftIdeas();
            exchangeReloadKey += 1;
            void loadItineraries();
            if (!originEditing && !originSaving) void loadOrigin();
            void loadAnniversaries();
            void loadProjects();
            if (!cadenceDirty) void loadCadence();
            void loadChannels();
            void loadBusinessCard();
        }
        if (orgRefreshPending && !addOrgBusy && !editingOrgMembershipId && !removingOrgMembershipId && !addOrgDocId) {
            orgRefreshPending = false;
            void loadOrgMemberships();
            void loadOrgCandidates();
            void loadCommonOrgs();
        }
    });

    async function createFollowUp() {
        if (followUpBusy || !onCreateFollowUp) return;
        followUpBusy = true;
        followUpError = "";
        followUpActionError = "";
        followUpRefreshWarning = "";
        const title = followUpTitle.trim();
        const dueDate = followUpDate;
        const requestId = followUpRequestId || newFollowUpRequestId();
        followUpRequestId = requestId;
        try {
            await onCreateFollowUp(current.docId, title, dueDate, requestId);
            followUpTitle = "";
            followUpSavedTitle = "";
            followUpSavedDate = followUpDate;
            followUpRecorded = true;
            followUpRequestId = "";
            followUpFailedRequest = null;
            onChanged();
            await refreshFollowUpsAfterMutation();
        } catch (error) {
            followUpActionError = requestErrorMessage(error);
            const failedRequestId = (error as { requestId?: unknown })?.requestId;
            followUpFailedRequest = typeof failedRequestId === "string" && failedRequestId === requestId
                ? { requestId, title, dueDate }
                : null;
        } finally {
            followUpBusy = false;
        }
    }

    function clearFailedFollowUpRequest(): void {
        const failed = followUpFailedRequest;
        if (!failed) return;
        if (failed.title !== followUpTitle.trim() || failed.dueDate !== followUpDate) {
            followUpFailedRequest = null;
            followUpRequestId = "";
        }
    }

    function retryFailedFollowUp(): void {
        const failed = followUpFailedRequest;
        if (!failed || failed.title !== followUpTitle.trim() || failed.dueDate !== followUpDate) return;
        void createFollowUp();
    }

    async function completeFollowUp(item: FollowUpItem) {
        if (followUpBusy || !onSetFollowUpStatus) return;
        followUpBusy = true;
        followUpError = "";
        followUpActionError = "";
        followUpRefreshWarning = "";
        try {
            await onSetFollowUpStatus(item.id, "done");
            await refreshFollowUpsAfterMutation();
            onChanged();
        } catch (error) {
            followUpActionError = requestErrorMessage(error);
        } finally {
            followUpBusy = false;
        }
    }

    async function cancelFollowUp(item: FollowUpItem) {
        if (followUpBusy || !onSetFollowUpStatus) return;
        const confirmed = await confirmDialog({
            title: "取消跟进计划",
            message: `取消跟进「${item.title || text("fuKeepInTouch", "保持联系")}」？取消后不再出现在待办中。`,
            confirmLabel: "取消计划",
            cancelLabel: "保留",
            danger: true,
        });
        if (!confirmed) return;
        followUpBusy = true;
        followUpError = "";
        followUpActionError = "";
        followUpRefreshWarning = "";
        try {
            await onSetFollowUpStatus(item.id, "cancelled");
            await refreshFollowUpsAfterMutation();
            onChanged();
        } catch (error) {
            followUpActionError = requestErrorMessage(error);
        } finally {
            followUpBusy = false;
        }
    }

    async function snooze(item: FollowUpItem, option: SnoozeOption) {
        if (followUpBusy || !onSnoozeFollowUp) return;
        if (option === "custom" && !snoozeCustomDate) return;
        followUpBusy = true;
        followUpError = "";
        followUpActionError = "";
        followUpRefreshWarning = "";
        try {
            await onSnoozeFollowUp(item.id, option, option === "custom" ? snoozeCustomDate : undefined);
            snoozeForId = "";
            snoozeCustomDate = "";
            await refreshFollowUpsAfterMutation();
            onChanged();
        } catch (error) {
            followUpActionError = requestErrorMessage(error);
        } finally {
            followUpBusy = false;
        }
    }

    // ---- 联系节奏（F06） ----
    const cadenceSupported = $derived(Boolean(onGetCadence && onSaveCadence));
    let cadenceLoaded = $state(false);
    const lastContactLabel = $derived.by(() => {
        const first = insights?.timeline?.[0];
        return first?.localDate ?? "";
    });
    const relationshipHealth = $derived.by<RelationshipHealth>(() => {
        const lastTime = insights?.timeline?.[0]?.occurredAt;
        const targetDays = cadenceMode === "custom" ? cadenceDays : 30;
        return computeRelationshipHealth({
            cadenceDays: targetDays,
            lastInteractionTime: lastTime,
            paused: cadenceMode === "paused",
        });
    });

    const currentIntroducer = $derived.by(() => {
        if (!currentOrigin?.introducedByDocId) return null;
        return others.find((p) => p.docId === currentOrigin?.introducedByDocId) ?? null;
    });

    const preMeetingBrief = $derived.by((): PreMeetingBrief => {
        return buildPreMeetingBrief({
            person: current,
            origin: currentOrigin ?? undefined,
            socialPreferences,
            facts,
            timeline: insights?.timeline ?? [],
            coAttendance: insights?.coAttendance ?? [],
            introducerName: currentIntroducer?.name,
            cadenceDays: cadenceMode === "custom" ? cadenceDays : 30,
        });
    });

    async function loadCadence() {
        if (!onGetCadence) return;
        const request = ++cadenceRequest;
        const targetDocId = current.docId;
        cadenceLoaded = false;
        cadenceError = "";
        cadenceLoadError = "";
        try {
            const cadence = await onGetCadence(targetDocId);
            if (!detailAlive || request !== cadenceRequest || current.docId !== targetDocId) return;
            cadenceMode = cadence?.paused ? "paused" : cadence ? "custom" : "global";
            cadenceDays = cadence?.days ?? 14;
            cadenceSavedMode = cadenceMode;
            cadenceSavedDays = cadenceDays;
            cadenceLoadError = "";
            cadenceLoaded = true;
        } catch (error) {
            if (detailAlive && request === cadenceRequest && current.docId === targetDocId) {
                cadenceLoadError = requestErrorMessage(error);
                cadenceLoaded = true;
            }
        }
    }
    loadCadence();

    async function saveCadence(rethrowOnFailure = false) {
        if (cadenceSaving || !onSaveCadence) return;
        cadenceSaving = true;
        cadenceError = "";
        cadenceMessage = "";
        try {
            const days = Math.max(1, Math.min(365, Math.round(cadenceDays || 14)));
            const next: PersonCadence | null = cadenceMode === "global" ? null : { days, paused: cadenceMode === "paused" };
            await onSaveCadence(current.docId, next);
            cadenceDays = days;
            cadenceSavedMode = cadenceMode;
            cadenceSavedDays = days;
            cadenceMessage = cadenceMode === "global"
                ? "已清除覆盖，跟随全局阈值"
                : cadenceMode === "paused"
                    ? "已暂停对该人的联系提醒"
                    : `已设为每 ${days} 天联系一次`;
            onChanged();
        } catch (error) {
            cadenceError = requestErrorMessage(error);
            if (rethrowOnFailure) throw error;
        } finally {
            cadenceSaving = false;
        }
    }

    const personRegion = $derived(extractNormalizedRegion(current));
    const isStarred = $derived(preferences ? isPersonStarred(preferences, current.docId) : false);
    const detailSuggestedTags = $derived(inferPersonaTags({
        name: current.name,
        workText: profileText(current.profile, "work"),
        city: personRegion.city,
        facts,
        topics,
        socialPreferences,
        promises,
        existingTags: current.tags,
    }));

    let adoptingTags = $state(false);

    async function handleAdoptTag(tag: string) {
        if (adoptingTags || busy) return;
        adoptingTags = true;
        try {
            const nextTags = adoptSuggestedTags(current.tags, [tag]);
            await updateContactFields(settings, current.itemId, { ...current, tags: nextTags }, { onlyFields: ["tags"] });
            current = { ...current, tags: nextTags };
            onChanged();
        } catch (err: unknown) {
            errorText = requestErrorMessage(err);
        } finally {
            adoptingTags = false;
        }
    }

    async function handleAdoptAllTags() {
        if (adoptingTags || busy || detailSuggestedTags.length === 0) return;
        adoptingTags = true;
        try {
            const nextTags = adoptSuggestedTags(current.tags, detailSuggestedTags);
            await updateContactFields(settings, current.itemId, { ...current, tags: nextTags }, { onlyFields: ["tags"] });
            current = { ...current, tags: nextTags };
            onChanged();
        } catch (err: unknown) {
            errorText = requestErrorMessage(err);
        } finally {
            adoptingTags = false;
        }
    }

    let avatarFileInput: HTMLInputElement | undefined = $state();
    let avatarSaving = $state(false);
    let avatarError = $state("");

    $effect(() => {
        const docId = current.docId;
        if (docId && !current.avatar && onLoadAvatar) {
            onLoadAvatar(docId).then((av) => {
                if (detailAlive && current.docId === docId && av) {
                    current = { ...current, avatar: av };
                }
            }).catch(() => {});
        }
    });

    async function handleAvatarUpload(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || avatarSaving) return;
        avatarSaving = true;
        avatarError = "";
        try {
            const processed = await processAvatarFile(file, 160);
            if (onSaveAvatar) {
                await onSaveAvatar(current.docId, processed.dataUrl);
            }
            current = { ...current, avatar: processed.dataUrl };
            onChanged();
        } catch (err) {
            avatarError = requestErrorMessage(err);
        } finally {
            avatarSaving = false;
            input.value = "";
        }
    }

    async function handleClearAvatar() {
        if (avatarSaving) return;
        avatarSaving = true;
        avatarError = "";
        try {
            if (onSaveAvatar) {
                await onSaveAvatar(current.docId, "");
            }
            current = { ...current, avatar: "" };
            onChanged();
        } catch (err) {
            avatarError = requestErrorMessage(err);
        } finally {
            avatarSaving = false;
        }
    }

    function handleDetailGlobalKeydown(event: KeyboardEvent) {
        if (cardViewerOpen && event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cardViewerOpen = false;
            return;
        }
        if (addingChannel && event.key === "Escape") {
            event.preventDefault();
            addingChannel = false;
            channelsError = "";
            return;
        }
        if (editingChannelId && event.key === "Escape") {
            event.preventDefault();
            editingChannelId = null;
            channelsError = "";
            return;
        }
        if (editing || deleting || (typeof document !== "undefined" && document.querySelector(".lvct-dialog-mask:not(.lvct-detail)"))) return;
        if (event.altKey && (event.key === "ArrowLeft" || event.key === "Left")) {
            if (previousPerson && !busy) {
                event.preventDefault();
                void navigate(previousPerson);
            }
        } else if (event.altKey && (event.key === "ArrowRight" || event.key === "Right")) {
            if (nextPerson && !busy) {
                event.preventDefault();
                void navigate(nextPerson);
            }
        }
    }
</script>

<svelte:window onkeydown={handleDetailGlobalKeydown} />

<div class="lvct-detail">
    <div class="lvct-detail__header" class:lvct-detail__header--starred={isStarred}>
        <div class="lvct-detail__avatar-wrap" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <div
                class="lvct-detail__avatar"
                data-group={current.group || "未分组"}
                role="button"
                tabindex="0"
                title="点击上传或更换真人头像照片"
                style="cursor: pointer; position: relative;"
                onclick={() => avatarFileInput?.click()}
            >
                {#if current.avatar}
                    <img src={current.avatar} alt={current.name} class="lvct-avatar-img" />
                {:else}
                    {current.name.slice(0, 1)}
                {/if}
                <span class="lvct-detail__avatar-overlay">
                    <Camera size={13} strokeWidth={1.6} />
                </span>
                {#if isStarred}<span class="lvct-detail__avatar-star" title="星标联系人">⭐</span>{/if}
            </div>
            {#if current.avatar}
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small"
                    style="font-size: 10px; padding: 0 4px; line-height: 1.2; color: var(--lvct-text-3);"
                    title="移除照片，恢复默认单字头像"
                    disabled={avatarSaving}
                    onclick={handleClearAvatar}
                >移除照片</button>
            {/if}
            {#if avatarError}
                <span class="ft__smaller ft__error" role="alert">{avatarError}</span>
            {/if}
            <input
                bind:this={avatarFileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style="display: none;"
                onchange={handleAvatarUpload}
                disabled={avatarSaving}
                aria-label="上传联系人头像"
            />
        </div>
        <div class="lvct-detail__id">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h3 style="margin: 0;">{current.name}</h3>
                {#if preferences && onPreferencesChange}
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small lvct-detail__star-btn"
                        class:lvct-detail__star-btn--active={isStarred}
                        style="padding: 0 4px; height: auto; line-height: 1;"
                        title={isStarred ? "取消星标常用" : "设为星标常用"}
                        aria-label={isStarred ? `取消 ${current.name} 的星标` : `将 ${current.name} 设为星标`}
                        onclick={() => {
                            if (preferences && onPreferencesChange) {
                                const next = togglePersonStarred(preferences, current.docId);
                                void onPreferencesChange(next);
                            }
                        }}
                    >
                        <Star size={16} fill={isStarred ? "#f59e0b" : "none"} color={isStarred ? "#f59e0b" : "currentColor"} />
                    </button>
                {/if}
                {#if current.isSelf}
                    <span class="lvct-chip lvct-bucket--today">本人</span>
                {/if}
                {#if relationshipHealth.level !== "unknown"}
                    <span class={`lvct-heat ${heatLevelColorClass(relationshipHealth.level)}`} style="font-size: 11px; padding: 2px 7px; border-radius: 9999px;">
                        {relationshipHealth.level === "hot" ? text("heatHot", "温热")
                        : relationshipHealth.level === "warm" ? text("heatWarm", "常温")
                        : relationshipHealth.level === "cool" ? text("heatCool", "微凉")
                        : relationshipHealth.level === "cold" ? text("heatCold", "渐冻")
                        : relationshipHealth.level === "paused" ? text("heatPaused", "已暂停")
                        : text("heatUnknown", "从未联系")}
                    </span>
                {/if}
            </div>
            <div class="lvct-detail__meta">
                {#if isStarred}
                    <span class="lvct-badge-pill lvct-badge-pill--star">⭐ 核心星标</span>
                {/if}
                {#if current.group}<span class="lvct-detail__group-chip">{current.group}</span>{/if}
                {#if current.birthday}<span class="ft__smaller ft__on-surface">生日 {formatBirthdayDisplay(current.birthday, current.isLunar)}</span>{/if}
                {#if personRegion.city && personRegion.city !== "未知"}
                    <span class="lvct-detail__group-chip" title="所在城市">
                        <span style="display: inline-flex; align-items: center;"><MapPin size={12} class="lvct-icon-inline" /> {personRegion.province && personRegion.province !== personRegion.city ? `${personRegion.province} · ` : ""}{personRegion.city}</span>
                        {#if onOpenPeople}
                            <button
                                type="button"
                                class="b3-button b3-button--text b3-button--small"
                                style="padding: 0 4px; height: auto; line-height: 1; margin-left: 2px;"
                                onclick={() => {
                                    void (async () => {
                                        if (await canLeave.requestClose()) {
                                            onClose();
                                            const matched = others.filter((p) => extractNormalizedRegion(p).city === personRegion.city);
                                            onOpenPeople?.({ itemIds: [current.itemId, ...matched.map((p) => p.itemId)], label: `同城人脉 · ${personRegion.city}` });
                                        }
                                    })();
                                }}
                                title={`筛选 ${personRegion.city} 的同城联系人`}
                            >同城人脉 &gt;</button>
                        {/if}
                    </span>
                {/if}
                {#if insights && insights.backlinks && insights.backlinks.length > 0}
                    <button
                        type="button"
                        class="lvct-chip lvct-chip--group font-size-11"
                        style="cursor: pointer; padding: 2px 8px; display: inline-flex; align-items: center;"
                        title="点击查看全库笔记与日记对该人物的反链与提及"
                        onclick={() => void selectTab("activity")}
                    >
                        <Link2 size={13} class="lvct-icon-inline" /> {insights.backlinks.length} 条反链引用
                    </button>
                {/if}
            </div>
            {#if preferenceMicroTags.length > 0}
                <div class="lvct-detail__micro-prefs-ribbon" role="region" aria-label={text("microPrefsAria", "核心社交偏好速览")}>
                    {#each preferenceMicroTags as tag (tag.id)}
                        <span
                            class="micro-pref-chip {tag.isTaboo ? 'is-taboo' : ''}"
                            title={tag.isTaboo ? text("tabooAlertTip", "红线禁忌：{text}", { text: tag.text }) : text("preferenceTip", "偏好：{text}", { text: tag.text })}
                        >
                            <span class="chip-icon">{tag.icon}</span>
                            <span class="chip-text">{tag.text}</span>
                        </span>
                    {/each}
                </div>
            {/if}
        </div>
        <div class="lvct-detail__header-actions">
            <button class="b3-button b3-button--outline lvct-detail__edit-btn" onclick={() => (editing = true)} disabled={busy || deleting}>{text("detailEdit", "编辑")}</button>
            <button class="b3-button b3-button--primary lvct-detail__quick-record-btn" onclick={scrollToRecordSection} title="为当前联系人快速记录一笔互动">
                <Plus size={14} class="lvct-icon-inline" /> 记互动
            </button>
            <button class="b3-button b3-button--outline lvct-detail__briefing-btn" onclick={openBriefingExport} title="导出格式化会面简报 Markdown">
                <FileText size={14} class="lvct-icon-inline" /> 简报
            </button>
            <button class="b3-button b3-button--outline lvct-detail__nav-btn" onclick={() => navigate(previousPerson)} disabled={!previousPerson || busy} title={previousPerson ? `上一位：${previousPerson.name} (Alt+←)` : undefined}>{text("detailPrevious", "上一位")}</button>
            <button class="b3-button b3-button--outline lvct-detail__nav-btn" onclick={() => navigate(nextPerson)} disabled={!nextPerson || busy} title={nextPerson ? `下一位：${nextPerson.name} (Alt+→)` : undefined}>{text("detailNext", "下一位")}</button>
        </div>
    </div>

    <!-- 顶部思源笔记与外部快捷联动操作条：高频留 2 个，其余进“更多操作”（D-0040 R4） -->
    <div class="lvct-detail__quick-bar" role="toolbar" aria-label="快捷操作">
        <div class="lvct-detail__quick-group" role="group" aria-label="思源与网络连接">
            <button
                type="button"
                class="b3-button b3-button--outline b3-button--small"
                onclick={() => onOpenPersonDoc(current.docId)}
                title={text("detailOpenNoteDocTip", "在思源中打开该联系人的独立文档")}
            >
                <FileText size={13} /> {text("detailOpenNoteDoc", "打开笔记文档")}
            </button>
            <button
                type="button"
                class="b3-button b3-button--outline b3-button--small"
                onclick={copySiyuanRef}
                title={text("detailCopySiyuanRefTip", "复制可在思源笔记正文中粘贴的锚文本双链引用 ((docId '姓名'))")}
            >
                {#if siyuanRefCopied}
                    <Check size={13} class="lvct-text-success" /> {text("detailSiyuanRefCopied", "已复制双链引用 ✓")}
                {:else}
                    <Link size={13} /> {text("detailCopySiyuanRef", "复制双链引用")}
                {/if}
            </button>
        </div>

        <details class="lvct-detail__more-tools">
            <summary class="b3-button b3-button--outline b3-button--small">{text("detailMoreTools", "更多操作 ▾")}</summary>
            <div class="lvct-detail__more-tools-panel" role="group" aria-label="名片与沉淀工具">
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small"
                    onclick={copySiyuanUri}
                    title={text("detailSiyuanUriTip", "复制可在外部应用（如微信、飞书、邮件）中点击直接唤起思源打开该联系人文档的 siyuan:// 链接")}
                >
                    {#if siyuanUriCopied}
                        <Check size={13} class="lvct-text-success" /> {text("detailSiyuanUriCopied", "已复制深度链接 ✓")}
                    {:else}
                        <ExternalLink size={13} /> {text("detailCopySiyuanUri", "复制深度链接")}
                    {/if}
                </button>
                {#if onOpenGraphPerson}
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small"
                        onclick={() => void (async () => { if (await canLeave.requestClose()) { onClose(); onOpenGraphPerson?.(current.docId); } })()}
                        title={text("detailOpenGraphTip", "在关系图谱中聚焦该联系人的一度/二度网络")}
                    >
                        <Network size={13} /> {text("detailOpenGraph", "图谱聚焦")}
                    </button>
                {/if}
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small lvct-detail__business-card-btn"
                    onclick={() => (cardModalOpen = true)}
                    title={text("detailGenerateCardTip", "生成高保真视觉名片海报与社交微卡片（支持复制 SVG 或下载矢量图）")}
                >
                    <Image size={13} /> {text("detailGenerateCard", "生成名片海报")}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small"
                    onclick={handleExportVcf}
                    title={text("detailExportVcfTip", "导出为标准手机通讯录 .vcf 名片文件（可直接通过微信/隔空投送发给手机导入）")}
                >
                    {#if vcfExported}
                        <Check size={13} class="lvct-text-success" /> {text("detailVcfExported", "已导出名片 ✓")}
                    {:else}
                        <ContactRound size={13} /> {text("detailExportVcf", "导出名片 (.vcf)")}
                    {/if}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small"
                    onclick={handleCopyVcf}
                    title={text("detailCopyVcfTip", "复制该联系人的标准 vCard 3.0 名片文本到剪贴板")}
                >
                    {#if vcardCopied}
                        <Check size={13} class="lvct-text-success" /> {text("detailVcfCopied", "已复制名片 ✓")}
                    {:else}
                        <Copy size={13} /> {text("detailCopyVcf", "复制名片")}
                    {/if}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small"
                    onclick={openBriefingExport}
                    title={text("detailExportBriefingTip", "一键导出会前备忘、背景资料与谈资简报")}
                >
                    <CalendarDays size={13} /> {text("detailExportBriefing", "导出会前简报")}
                </button>
                {#if onCreateFlashcardsDoc}
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small lvct-detail__flashcard-btn"
                        onclick={handleGenerateFlashcards}
                        disabled={generatingFlashcards}
                        title={text("detailFlashcardsBtnTitle", "将该联系人的基本资料、画像事实与谈资一键生成为思源复习闪卡（Riff Cards）")}
                    >
                        <Layers size={13} /> {generatingFlashcards ? text("detailFlashcardsGenerating", "闪卡生成中…") : text("detailFlashcardsBtn", "复习闪卡 ↗")}
                    </button>
                {/if}
                {#if onSyncDocProfile}
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small"
                        onclick={handleSyncDocProfile}
                        title={text("detailSyncDocTip", "将该联系人的基本资料与往来互动，同步写入到思源独立笔记文档正文中，实现文档即档案")}
                        disabled={docSyncing}
                    >
                        {#if docSynced}
                            <Check size={13} class="lvct-text-success" /> {text("detailDocSynced", "已同步到正文")}
                        {:else}
                            <RefreshCw size={13} /> {docSyncing ? text("detailDocSyncing", "同步中…") : text("detailSyncDocProfile", "同步档案到正文")}
                        {/if}
                    </button>
                {/if}
            </div>
        </details>
    </div>

    {#if flashcardsDocInfo}
        <div class="lvct-detail__flashcards-notice fn__flex" role="status" style="align-items: center; justify-content: space-between; margin: 4px 0 10px; padding: 6px 12px; background: color-mix(in srgb, var(--b3-theme-primary) 10%, var(--b3-theme-surface)); border: 1px solid color-mix(in srgb, var(--b3-theme-primary) 30%, transparent); border-radius: 6px; font-size: 12px;">
            <span>{text("detailFlashcardsNotice", "🎴 已生成 {count} 张人脉记忆闪卡至 {hpath}", { count: flashcardsDocInfo.count, hpath: flashcardsDocInfo.hpath })}</span>
            <div class="fn__flex" style="gap: 6px;">
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small"
                    style="padding: 0 4px; font-size: 11.5px; color: var(--b3-theme-primary);"
                    onclick={() => onOpenPersonDoc(flashcardsDocInfo!.docId)}
                >
                    {text("detailOpenInMainEditor", "在主编辑器打开 ↗")}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small"
                    style="padding: 0 4px; font-size: 11px;"
                    onclick={() => (flashcardsDocInfo = null)}
                    title={text("detailCloseNotice", "关闭提示")}
                >
                    ✕
                </button>
            </div>
        </div>
    {/if}
    {#if flashcardsError}
        <div class="ft__smaller lvct-text-danger" style="margin-bottom: 8px;">{flashcardsError}</div>
    {/if}

    <!-- ⚡ 会前 30 秒破冰速览卡 (Monica 标杆融合) -->
    <details
        class="lvct-premeeting-brief"
        bind:open={preMeetingBriefOpen}
        ontouchstart={onBriefTouchStart}
        ontouchend={onBriefTouchEnd}
    >
        {#if orderedPeople.length > 1}
            <div class="lvct-premeeting-brief__dots" role="tablist" aria-label="待联络人切换指示器">
                {#each visibleBriefDots as dotIdx (dotIdx)}
                    <button
                        type="button"
                        role="tab"
                        class="lvct-premeeting-brief__dot"
                        class:lvct-premeeting-brief__dot--active={dotIdx === currentIndex}
                        aria-selected={dotIdx === currentIndex}
                        title={`切换至 ${orderedPeople[dotIdx]?.name ?? ''}`}
                        onclick={(e) => {
                            e.stopPropagation();
                            if (dotIdx !== currentIndex && !busy) {
                                lvLaunchpad.haptic(6);
                                void navigate(orderedPeople[dotIdx]);
                            }
                        }}
                    ></button>
                {/each}
            </div>
        {/if}
        <summary class="lvct-premeeting-brief__summary">
            <div class="lvct-premeeting-brief__summary-left">
                <span class="lvct-premeeting-brief__badge">⚡ 会前 30 秒破冰速览</span>
                <span class="lvct-premeeting-brief__headline">
                    {preMeetingBrief.statusSummary}
                </span>
            </div>
            <div class="lvct-premeeting-brief__summary-actions">
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small lvct-premeeting-brief__copy-btn"
                    onclick={(e) => { e.stopPropagation(); e.preventDefault(); void handleCopyPreMeetingBrief(); }}
                    title="一键复制纯文本会前备忘录"
                >
                    {#if preMeetingBriefCopied}
                        <Check size={12} strokeWidth={1.6} class="lvct-text-success" /> 已复制备忘
                    {:else}
                        <Copy size={12} strokeWidth={1.6} /> 复制速览
                    {/if}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small lvct-premeeting-brief__callout-btn"
                    onclick={(e) => { e.stopPropagation(); e.preventDefault(); void handleCopyPreMeetingBriefCallout(); }}
                    title="复制为思源引述块 Markdown（>>> 语法，贴入笔记即成卡片）"
                >
                    {#if preMeetingBriefCalloutCopied}
                        <Check size={12} strokeWidth={1.6} class="lvct-text-success" /> 已复制引述块
                    {:else}
                        <Quote size={12} strokeWidth={1.6} /> 复制引述块
                    {/if}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small lvct-premeeting-brief__daily-btn"
                    onclick={(e) => { e.stopPropagation(); e.preventDefault(); void handleCopyPreMeetingBriefDaily(); }}
                    title="复制为思源日记块 Markdown（带原生双链与 meeting-brief 属性）"
                >
                    {#if preMeetingBriefDailyCopied}
                        <Check size={12} strokeWidth={1.6} class="lvct-text-success" /> 已复制日记块
                    {:else}
                        <Calendar size={12} strokeWidth={1.6} /> 复制日记块
                    {/if}
                </button>
            </div>
        </summary>
        <div class="lvct-premeeting-brief__content">
            <div class="lvct-premeeting-brief__grid">
                <div class="lvct-premeeting-brief__cell">
                    <span class="lvct-premeeting-brief__label">💬 上次聊了什么</span>
                    <p class="lvct-premeeting-brief__val">{preMeetingBrief.lastMetText}</p>
                </div>
                <div class="lvct-premeeting-brief__cell">
                    <span class="lvct-premeeting-brief__label">🌱 初识溯源</span>
                    <p class="lvct-premeeting-brief__val">{preMeetingBrief.originText}</p>
                </div>
                {#if preMeetingBrief.dietAndPreferences.length > 0}
                    <div class="lvct-premeeting-brief__cell">
                        <span class="lvct-premeeting-brief__label">❤️ 喜好忌口习惯</span>
                        <div class="lvct-premeeting-brief__chips">
                            {#each preMeetingBrief.dietAndPreferences as pref}
                                <span class="lvct-chip lvct-chip--fact">{pref}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                {#if preMeetingBrief.taboos.length > 0}
                    <div class="lvct-premeeting-brief__cell lvct-premeeting-brief__cell--taboo">
                        <span class="lvct-premeeting-brief__label">⚠️ 敏感话题雷区</span>
                        <div class="lvct-premeeting-brief__chips">
                            {#each preMeetingBrief.taboos as taboo}
                                <span class="lvct-chip lvct-chip--error">{taboo}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                {#if preMeetingBrief.sharedNetwork.length > 0}
                    <div class="lvct-premeeting-brief__cell">
                        <span class="lvct-premeeting-brief__label">👥 共同熟人交集</span>
                        <div class="lvct-premeeting-brief__chips">
                            {#each preMeetingBrief.sharedNetwork as net}
                                <span class="lvct-chip lvct-chip--group">{net}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </details>

    <div class="lvct-detail__tabs" role="tablist" tabindex="-1" aria-label="人物详情内容" onkeydown={handleTabKeydown}>
        <button id="lvct-detail-tab-overview" type="button" role="tab" aria-controls="lvct-detail-panel-overview" aria-selected={activeTab === "overview"} tabindex={activeTab === "overview" ? 0 : -1} class:lvct-detail__tab--active={activeTab === "overview"} onclick={() => void selectTab("overview")}>{text("detailOverview", "概览")}</button>
        <button id="lvct-detail-tab-activity" type="button" role="tab" aria-controls="lvct-detail-panel-activity" aria-selected={activeTab === "activity"} tabindex={activeTab === "activity" ? 0 : -1} class:lvct-detail__tab--active={activeTab === "activity"} onclick={() => void selectTab("activity")}>{text("detailActivity", "互动")}</button>
        <button id="lvct-detail-tab-relations" type="button" role="tab" aria-controls="lvct-detail-panel-relations" aria-selected={activeTab === "relations"} tabindex={activeTab === "relations" ? 0 : -1} class:lvct-detail__tab--active={activeTab === "relations"} onclick={() => void selectTab("relations")}>{text("detailRelations", "相关人")}</button>
    </div>

    {#if activeTab === "overview"}
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -- tabpanel semantics are required for the tablist contract. -->
    <section id="lvct-detail-panel-overview" role="tabpanel" aria-labelledby="lvct-detail-tab-overview" tabindex="0">
    {#if current.profile}
        <div class="lvct-detail__profile-strip">
            <PersonProfileSummary profile={current.profile} compact hideEmpty />
        </div>
    {/if}

    <section class="lvct-detail__section lvct-detail__relationship-snapshot" aria-labelledby="lvct-relationship-snapshot-title">
        {#if !current.isSelf && (relationshipHealth.level === "cold" || (relationshipHealth.overdue && relationshipHealth.overdueDays >= 14))}
            <div class="lvct-detail__cooling-alert" role="status" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 8px 12px; margin-bottom: 12px; background: color-mix(in srgb, var(--lv-heat-cold) 10%, var(--lvct-bg-surface)); border: 1px solid color-mix(in srgb, var(--lv-heat-cold) 35%, transparent); border-radius: var(--lvct-r-md);">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--lvct-text-1);">
                    <span style="font-size: 14px;">❄️</span>
                    <span><b>关系已渐冻冷却</b> · 距上次联系已过去 {relationshipHealth.elapsedDays ?? "多"} 天，建议主动问候联络</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small"
                        style="padding: 2px 8px; font-size: 11px; color: var(--lv-brand);"
                        onclick={() => void selectTab("activity")}
                    >记一笔互动</button>
                </div>
            </div>
        {/if}

        {#if !current.isSelf && upcomingAnniversaryMilestones.length > 0}
            <AnniversaryMilestoneBanner
                milestones={upcomingAnniversaryMilestones}
                onApplyGreeting={async (greeting) => {
                    if (noteText.trim() && noteText.trim() !== greeting) {
                        const ok = await confirmDialog({
                            title: text("topicsConvertConfirmTitle", "替换互动备注草稿"),
                            message: "当前已有未记录的互动备注草稿，填入祝贺词将替换当前草稿。确定继续吗？",
                            confirmLabel: text("topicsConvertConfirmBtn", "确认替换"),
                            cancelLabel: text("topicsConvertCancelBtn", "取消"),
                        });
                        if (!ok) return;
                    }
                    noteText = greeting;
                }}
                {i18n}
            />
        {/if}

        <div class="lvct-detail__section-head">
            <div>
                <h4 id="lvct-relationship-snapshot-title">关系摘要</h4>
            </div>
            {#if insightsError}
                <button type="button" class="b3-button b3-button--text" disabled={insightsLoading} onclick={loadInsights}>重试互动</button>
            {:else}
                <button type="button" class="b3-button b3-button--text" onclick={() => void selectTab("activity")}>查看互动</button>
            {/if}
        </div>
        <dl class="lvct-detail__relationship-grid">
            <div>
                <dt>最近互动</dt>
                <dd>
                    {insightsLoading ? "读取中…" : insightsError ? "读取失败" : lastContactLabel || "尚无互动"}
                    {#if insights && insights.timeline && insights.timeline.length > 0}
                        <button
                            type="button"
                            class="b3-button b3-button--text b3-button--small"
                            style="padding: 0 4px; font-size: 11px; margin-left: 4px;"
                            onclick={() => void selectTab("activity")}
                        >全部 {insights.timeline.length} 条往来 &gt;</button>
                    {/if}
                </dd>
            </div>
            <div>
                <dt>待办跟进</dt>
                <dd>
                    {followUpsLoading ? "读取中…" : followUpError ? "读取失败" : openFollowUps.length > 0 ? `${openFollowUps.length} 条` : "暂无"}
                    {#if followUpError}
                        <button type="button" class="b3-button b3-button--text" disabled={followUpsLoading} onclick={loadFollowUps}>重试跟进</button>
                    {/if}
                </dd>
            </div>
            <div>
                <dt>联系节奏</dt>
                <dd>
                    {cadenceSupported && !cadenceLoaded ? "读取中…" : cadenceLoadError ? "读取失败" : !cadenceSupported ? "未启用" : cadenceMode === "paused" ? "已暂停" : cadenceMode === "custom" ? `每 ${cadenceDays} 天` : "跟随全局阈值"}
                    {#if cadenceLoadError}<button type="button" class="b3-button b3-button--text" onclick={loadCadence}>重试</button>{/if}
                </dd>
            </div>
            <div>
                <dt>关系温度</dt>
                <dd>
                    {#if insightsLoading || (cadenceSupported && !cadenceLoaded)}
                        <span class="ft__smaller ft__on-surface">读取中…</span>
                    {:else}
                        <span class={`lvct-heat ${heatLevelColorClass(relationshipHealth.level)}`}>
                            {relationshipHealth.level === "hot" ? text("heatHot", "温热")
                            : relationshipHealth.level === "warm" ? text("heatWarm", "常温")
                            : relationshipHealth.level === "cool" ? text("heatCool", "微凉")
                            : relationshipHealth.level === "cold" ? text("heatCold", "渐冻")
                            : relationshipHealth.level === "paused" ? text("heatPaused", "已暂停")
                            : text("heatUnknown", "从未联系")}
                        </span>
                    {/if}
                </dd>
            </div>
            <div>
                <dt>相关人</dt>
                <dd>{current.relatedItemIds.length > 0 ? `${current.relatedItemIds.length} 位` : "尚未建立"}</dd>
            </div>
        </dl>
    </section>
    {#if !current.phone && !current.email && !current.wechat && !current.website && current.tags.length === 0}
        <div class="lvct-detail__empty-contact-card" role="region" aria-label={text("detailEmptyContactTitle", "联系资料未填写")}>
            <div class="fn__flex" style="align-items: center; gap: 8px;">
                <Phone size={14} class="lvct-text-muted" />
                <span class="ft__smaller ft__on-surface"><b>{text("detailEmptyContactTitle", "联系资料还未填写")}</b> · {text("detailEmptyContactDesc", "补充电话、微信、邮箱或标签，方便日常联络。")}</span>
            </div>
            <button class="b3-button b3-button--outline b3-button--small" onclick={() => (editing = true)}>{text("detailAddContactFields", "+ 补充资料")}</button>
        </div>
    {/if}
    <section class="lvct-detail__section lvct-detail__comm-section">
        <div class="lvct-detail__fields-header fn__flex" style="align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div class="fn__flex" style="align-items: center; gap: 8px;">
                <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: var(--lvct-text-1);">通讯与多维资料条目</h4>
                <span class="lvct-chip font-size-11" style="padding: 1px 6px;">{channels.length} 项</span>
            </div>
            <div class="fn__flex" style="align-items: center; gap: 6px;">
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small lvct-privacy-shield-btn"
                    style="padding: 2px 6px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;"
                    title={privacyMaskActive ? (revealSeconds > 0 ? text("detailPrivacyRevealedTip", "已临时显形，将在 {seconds} 秒后重新自动掩盖", { seconds: revealSeconds }) : text("detailPrivacyClickToReveal", "点击暂时显形 5 秒，或长按关闭遮罩")) : text("detailPrivacyMaskTip", "开启离席隐私保护盾（投屏/录屏或离席时对电话、微信、邮箱自动打码遮罩）")}
                    onclick={togglePrivacyMask}
                >
                    {#if privacyMaskActive && revealSeconds === 0}
                        <EyeOff size={13} style="color: var(--lv-brand, #ea580c);" />
                        <span style="color: var(--lv-brand, #ea580c); font-weight: 500;">{text("detailPrivacyShieldActive", "隐私盾保护中")}</span>
                    {:else if privacyMaskActive && revealSeconds > 0}
                        <Eye size={13} style="color: var(--lvct-success, #16a34a);" />
                        <span style="color: var(--lvct-success, #16a34a); font-weight: 500;">已显形 ({revealSeconds}s)</span>
                    {:else}
                        <Shield size={13} />
                        <span>隐私盾</span>
                    {/if}
                </button>
                <button
                    type="button"
                    class="b3-button b3-button--outline b3-button--small"
                    style="padding: 2px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                    onclick={() => openAddChannel("phone")}
                    title="添加新的手机号、微信号、邮箱或自定义条目"
                >
                    <Plus size={12} /> 添加条目
                </button>
            </div>
        </div>

        {#if addingChannel}
            <!-- 新增条目卡片 -->
            <div class="lvct-channel-form-card" role="region" aria-label="添加新条目">
                <div class="lvct-channel-form__types">
                    {#each CHANNEL_TYPES as meta}
                        <button
                            type="button"
                            class="b3-chip font-size-11 lvct-channel-type-btn {draftType === meta.type ? 'is-active' : ''}"
                            onclick={() => changeDraftType(meta.type)}
                        >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                        </button>
                    {/each}
                </div>
                <div class="lvct-channel-form__presets">
                    <span class="ft__smaller ft__on-surface">常用标签：</span>
                    {#each CHANNEL_TYPE_MAP[draftType].presetLabels as plabel}
                        <button
                            type="button"
                            class="b3-button b3-button--text b3-button--small font-size-11"
                            style="padding: 1px 5px;"
                            onclick={() => (draftLabel = plabel)}
                        >
                            {plabel}
                        </button>
                    {/each}
                </div>
                <div class="lvct-channel-form__row">
                    <input
                        type="text"
                        class="b3-text-field b3-text-field--small"
                        style="width: 120px;"
                        placeholder="标签名称"
                        bind:value={draftLabel}
                    />
                    <input
                        type="text"
                        class="b3-text-field b3-text-field--small fn__flex-1"
                        placeholder={CHANNEL_TYPE_MAP[draftType].placeholder}
                        bind:value={draftValue}
                        onkeydown={(e) => { if (e.key === "Enter") void handleSaveNewChannel(); }}
                    />
                    <label class="fn__flex" style="align-items: center; gap: 4px; font-size: 11.5px; cursor: pointer;">
                        <input type="checkbox" bind:checked={draftIsPrimary} />
                        <span>设为主条目</span>
                    </label>
                </div>
                {#if channelsError}
                    <div class="ft__smaller lvct-text-danger" style="margin-top: 4px;">{channelsError}</div>
                {/if}
                <div class="lvct-channel-form__actions">
                    <button
                        type="button"
                        class="b3-button b3-button--primary b3-button--small"
                        disabled={channelsSaving}
                        onclick={handleSaveNewChannel}
                    >
                        {channelsSaving ? "保存中…" : "确认添加"}
                    </button>
                    <button
                        type="button"
                        class="b3-button b3-button--cancel b3-button--small"
                        disabled={channelsSaving}
                        onclick={() => { addingChannel = false; channelsError = ""; }}
                    >
                        取消
                    </button>
                </div>
            </div>
        {/if}

        <div class="lvct-channels-list">
            {#if channels.length === 0}
                <div class="lvct-channel-empty">暂无通讯条目，点击上方“添加条目”进行扩充</div>
            {:else}
                {#each channels as ch (ch.id)}
                    {@const isMasked = privacyMaskActive && revealSeconds === 0 && (ch.type === "phone" || ch.type === "wechat" || ch.type === "email")}
                    {@const displayValue = isMasked
                        ? (ch.type === "phone" ? maskPhone(ch.value) : ch.type === "wechat" ? maskWechat(ch.value) : maskEmail(ch.value))
                        : ch.value}
                    {@const actionHref = getChannelActionHref(ch)}
                    {@const meta = CHANNEL_TYPE_MAP[ch.type] || CHANNEL_TYPE_MAP.custom}

                    {#if editingChannelId === ch.id}
                        <!-- 行内编辑条目 -->
                        <div class="lvct-channel-form-card lvct-channel-form-card--edit">
                            <div class="lvct-channel-form__row">
                                <span class="lvct-chip font-size-11">{meta.icon} {meta.label}</span>
                                <input
                                    type="text"
                                    class="b3-text-field b3-text-field--small"
                                    style="width: 110px;"
                                    placeholder="标签"
                                    bind:value={editLabel}
                                />
                                <input
                                    type="text"
                                    class="b3-text-field b3-text-field--small fn__flex-1"
                                    placeholder="条目内容"
                                    bind:value={editValue}
                                    onkeydown={(e) => { if (e.key === "Enter") void handleSaveEditedChannel(ch.id); }}
                                />
                                <label class="fn__flex" style="align-items: center; gap: 4px; font-size: 11px; cursor: pointer;">
                                    <input type="checkbox" bind:checked={editIsPrimary} />
                                    <span>主条目</span>
                                </label>
                                <button
                                    type="button"
                                    class="b3-button b3-button--primary b3-button--small"
                                    disabled={channelsSaving}
                                    onclick={() => void handleSaveEditedChannel(ch.id)}
                                >
                                    保存
                                </button>
                                <button
                                    type="button"
                                    class="b3-button b3-button--cancel b3-button--small"
                                    disabled={channelsSaving}
                                    onclick={() => { editingChannelId = null; channelsError = ""; }}
                                >
                                    取消
                                </button>
                            </div>
                            {#if channelsError}
                                <div class="ft__smaller lvct-text-danger" style="margin-top: 4px;">{channelsError}</div>
                            {/if}
                        </div>
                    {:else}
                        <!-- 正常条目卡片 -->
                        <div class="lvct-channel-item">
                            <div class="lvct-channel-item__lead">
                                <span class="lvct-channel-badge lvct-channel-badge--{ch.type}">
                                    <span class="lvct-channel-icon">{meta.icon}</span>
                                    <span class="lvct-channel-label">{ch.label}</span>
                                </span>
                                {#if ch.isPrimary}
                                    <span class="lvct-channel-primary-tag" title="主要联系方式">主</span>
                                {/if}
                            </div>
                            <div class="lvct-channel-item__body">
                                {#if actionHref}
                                    <a
                                        href={actionHref}
                                        class="lvct-channel-val-link"
                                        target={ch.type === "social" || (ch.type === "custom" && actionHref.startsWith("http")) ? "_blank" : undefined}
                                        rel="noopener noreferrer"
                                        title={actionHref.startsWith("tel:") ? "点击呼叫拨号" : actionHref.startsWith("mailto:") ? "点击撰写邮件" : "点击打开外部链接"}
                                    >
                                        {displayValue}
                                    </a>
                                {:else}
                                    <span class="lvct-channel-val-text">{displayValue}</span>
                                {/if}
                            </div>
                            <div class="lvct-channel-item__actions">
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small lvct-channel-action-btn"
                                    title={copiedField === ch.id ? "已复制到剪贴板" : `复制${ch.label}`}
                                    onclick={() => handleCopyField(ch.value, ch.id)}
                                >
                                    {#if copiedField === ch.id}
                                        <span class="lvct-text-success ft__smaller">已复制 ✓</span>
                                    {:else}
                                        <Copy size={12} />
                                    {/if}
                                </button>
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small lvct-channel-action-btn"
                                    title="编辑此条目"
                                    onclick={() => startEditChannel(ch)}
                                >
                                    <Edit3 size={12} />
                                </button>
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small lvct-channel-action-btn lvct-text-danger"
                                    title="删除此条目"
                                    onclick={() => void handleRemoveChannel(ch.id)}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    {/if}
                {/each}
            {/if}
        </div>

        <!-- 标签与生日等其余基础信息保持并存 -->
        <dl class="lvct-detail__fields" style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--b3-theme-surface-lighter);">
            <div>
                <dt>标签</dt>
                <dd>
                    {#if current.tags.length > 0}
                        <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                            {#each current.tags as tag}
                                <span class="lvct-chip lvct-chip--tag">{tag}</span>
                            {/each}
                        </div>
                    {:else}
                        <span class="ft__smaller ft__on-surface">暂无标签</span>
                    {/if}
                    {#if detailSuggestedTags.length > 0}
                        <div class="lvct-detail__suggested-tags" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center; margin-top: 6px;">
                            <span class="ft__smaller" style="color: var(--lv-brand, #ea580c); display: inline-flex; align-items: center; gap: 3px;">
                                <Sparkles size={11} /> {text("detailTagInferenceTitle", "画像标签推断：")}
                            </span>
                            {#each detailSuggestedTags as stag}
                                <button
                                    type="button"
                                    class="b3-chip font-size-11 lvct-detail__suggested-tag-btn"
                                    style="cursor: pointer;"
                                    disabled={adoptingTags}
                                    title={text("detailAdoptTagTip", "点击直接采纳此画像标签")}
                                    onclick={() => void handleAdoptTag(stag)}
                                >+ {stag}</button>
                            {/each}
                            {#if detailSuggestedTags.length > 1}
                                <button
                                    type="button"
                                    class="b3-button b3-button--text b3-button--small lvct-detail__adopt-all-btn"
                                    style="padding: 1px 6px; font-size: 11px; color: var(--lv-brand, #ea580c);"
                                    disabled={adoptingTags}
                                    onclick={() => void handleAdoptAllTags()}
                                    title={text("detailAdoptAllTagsTip", "一键采纳全部推荐画像标签")}
                                >
                                    {adoptingTags ? "采纳中…" : text("detailAdoptAllTags", "全部采纳 ({n})", { n: detailSuggestedTags.length })}
                                </button>
                            {/if}
                        </div>
                    {/if}
                </dd>
            </div>
            {#if birthday}
                <div>
                    <dt>下次生日</dt>
                    <dd>{birthday.date.toLocaleDateString("zh-CN")}（公历{current.isLunar ? `，对应${birthday.label}` : ""}） · {birthday.daysUntil === 0 ? "今天" : `${birthday.daysUntil} 天后`}</dd>
                </div>
            {/if}
        </dl>
    </section>

    <section class="lvct-detail__section">
        <h4>{text("detailRecordTitle", "记一笔互动")}</h4>
        {#if templatesSupported}
            {#if templateLoadError}
                <div class="lvct-form__error" role="alert">
                    模板读取失败：{templateLoadError}
                    <button type="button" class="b3-button b3-button--outline" onclick={loadTemplates}>重试模板</button>
                </div>
            {/if}
            <div class="lvct-detail__record fn__flex lvct-detail__template-row">
                <select class="b3-select fn__flex-1" aria-label="选用备注模板" bind:value={templateChoice} onchange={applyTemplate} disabled={busy || templates.length === 0}>
                    <option value="">{templates.length === 0 ? text("tplEmptyHint", "暂无模板，点「管理模板」创建") : text("tplPick", "选用模板…")}</option>
                    {#each templates as template (template.id)}<option value={template.id}>{template.name}</option>{/each}
                </select>
                <button class="b3-button b3-button--outline" onclick={() => (templateManagerOpen = true)} disabled={busy}>{text("tplManage", "管理模板")}</button>
            </div>
        {/if}
        <div class="lvct-detail__record-types" role="radiogroup" aria-label="互动类型" style="display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 6px 0;">
            {#each INTERACTION_TYPES as itype}
                <button
                    type="button"
                    class="b3-button b3-button--text"
                    style="padding: 3px 10px; font-size: 11px; border-radius: var(--lv-r-pill, 9999px); {recordType === itype ? 'background: var(--b3-theme-primary); color: var(--lvct-on-accent); font-weight: 600;' : 'opacity: 0.8;'}"
                    aria-checked={recordType === itype}
                    role="radio"
                    onclick={() => { recordType = itype; }}
                >
                    {INTERACTION_TYPE_LABELS[itype].icon} {INTERACTION_TYPE_LABELS[itype].label}
                </button>
            {/each}
        </div>
        <!-- Mobile Spec v1 专项 3：常用快捷模板 chips -->
        <div class="lvct-quick-template-chips" role="group" aria-label="快捷模板" style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
            <button
                type="button"
                class="b3-chip font-size-11"
                style="border-radius: var(--lv-r-pill, 9999px); cursor: pointer; touch-action: manipulation; padding: 2px 9px;"
                disabled={busy}
                onclick={() => applyQuickInteractionChip("call", "电话联络 30 分钟")}
            >📞 电话联络 30 分钟</button>
            <button
                type="button"
                class="b3-chip font-size-11"
                style="border-radius: var(--lv-r-pill, 9999px); cursor: pointer; touch-action: manipulation; padding: 2px 9px;"
                disabled={busy}
                onclick={() => applyQuickInteractionChip("message", "微信互动")}
            >💬 微信互动</button>
            <button
                type="button"
                class="b3-chip font-size-11"
                style="border-radius: var(--lv-r-pill, 9999px); cursor: pointer; touch-action: manipulation; padding: 2px 9px;"
                disabled={busy}
                onclick={() => applyQuickInteractionChip("meeting", "见面交流")}
            >🤝 见面交流</button>
        </div>
        <div class="lvct-detail__record fn__flex" style="gap: 8px; align-items: center;">
            <input
                bind:this={recordInputEl}
                class="b3-text-field fn__flex-1"
                type="text"
                placeholder={text("detailRecordPlaceholder", "做了什么、聊了什么（可留空）")}
                aria-label={text("detailRecordLabel", "互动备注")}
                bind:value={noteText}
                oninput={() => (recorded = false)}
                disabled={busy}
                onkeydown={(e) => {
                    if (e.key === "Enter" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
                        e.preventDefault();
                        if (!busy) void mutate(persistNote);
                    }
                }}
            />
            <button
                class="b3-button b3-button--primary"
                style="border-radius: var(--lv-r-pill, 9999px); padding: 4px 16px; white-space: nowrap; font-size: 12px;"
                disabled={busy}
                onclick={() =>
                    mutate(persistNote)}
            >{recorded ? text("detailRecorded", "已记录 ✓") : text("detailRecord", "记录")}</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--lvct-text-2);">
                    <input type="checkbox" bind:checked={detailSaveAsFact} disabled={busy} />
                    <span>💡 同时沉淀为社交画像事实（提炼观点与关键备忘）</span>
                </label>
                {#if noteText.trim().length >= 4}
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small"
                        style="padding: 1px 6px; font-size: 11px; color: var(--lv-brand, #ea580c); display: inline-flex; align-items: center; gap: 4px;"
                        disabled={busy}
                        onclick={handleAutoExtractFacts}
                    >
                        <Sparkles size={12} /> 智能提炼事实
                    </button>
                {/if}
            </div>
            {#if extractedFactsPreview.length > 0}
                <div style="display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; background: color-mix(in srgb, var(--lv-brand, #ea580c) 6%, var(--lvct-bg-surface)); border: 1px dashed color-mix(in srgb, var(--lv-brand, #ea580c) 30%, transparent); border-radius: var(--lvct-r-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span class="ft__smaller" style="color: var(--lv-brand, #ea580c); font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
                            <Sparkles size={12} /> 从互动备注智能提炼出 {extractedFactsPreview.length} 项事实备忘：
                        </span>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" class="b3-button b3-button--text b3-button--small" style="font-size: 11px; padding: 0 4px; color: var(--lv-brand, #ea580c);" onclick={adoptAllExtractedFacts}>一键全部采纳</button>
                            <button type="button" class="b3-button b3-button--text b3-button--small" style="font-size: 11px; padding: 0 4px;" onclick={() => (extractedFactsPreview = [])}>关闭</button>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        {#each extractedFactsPreview as ef (ef.id)}
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 6px; background: var(--lvct-bg-elevated); border-radius: var(--lvct-r-xs); font-size: 12px;">
                                <div>
                                    <b>{ef.category === "quote" ? "💡 [观点]" : ef.category === "preference" ? "❤️ [喜好]" : ef.category === "background" ? "💼 [背景]" : "📌 [事实]"}</b> {ef.text}
                                </div>
                                <button type="button" class="b3-button b3-button--text b3-button--small" style="font-size: 11px; padding: 1px 6px;" onclick={() => adoptExtractedFact(ef)}>+ 采纳</button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
            {#if detailSaveAsFact}
                <div style="display: flex; gap: 4px; padding-left: 20px; flex-wrap: wrap;">
                    <button type="button" class="b3-chip font-size-11" class:b3-chip--primary={detailFactCategory === "quote"} disabled={busy} onclick={() => (detailFactCategory = "quote")}>💡 观点见解</button>
                    <button type="button" class="b3-chip font-size-11" class:b3-chip--primary={detailFactCategory === "preference"} disabled={busy} onclick={() => (detailFactCategory = "preference")}>❤️ 喜好忌口</button>
                    <button type="button" class="b3-chip font-size-11" class:b3-chip--primary={detailFactCategory === "background"} disabled={busy} onclick={() => (detailFactCategory = "background")}>💼 背景经历</button>
                    <button type="button" class="b3-chip font-size-11" class:b3-chip--primary={detailFactCategory === "fact"} disabled={busy} onclick={() => (detailFactCategory = "fact")}>📌 关键事实</button>
                </div>
            {/if}
        </div>
        <p class="ft__smaller ft__on-surface">记录后，首页"久未联系"会重新计时。</p>
    </section>

    <!-- 🪪 实体名片档案卡片模块 -->
    <section class="lvct-detail__section lvct-detail__business-card-section">
        <div class="lvct-detail__fields-header fn__flex" style="align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div class="fn__flex" style="align-items: center; gap: 6px;">
                <CreditCard size={14} style="color: var(--lv-brand, #ea580c);" />
                <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: var(--lvct-text-1);">实体纸质名片</h4>
            </div>
            {#if businessCardUrl}
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small font-size-11"
                        style="padding: 2px 7px;"
                        onclick={() => (cardViewerOpen = true)}
                    >
                        <Maximize2 size={12} /> 查看大图
                    </button>
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small font-size-11"
                        style="padding: 2px 7px;"
                        onclick={() => cardFileInput?.click()}
                        disabled={cardSaving}
                    >
                        <Upload size={12} /> 更换
                    </button>
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small font-size-11 lvct-text-danger"
                        style="padding: 2px 7px;"
                        onclick={handleDeleteBusinessCard}
                        disabled={cardSaving}
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            {/if}
        </div>

        <input
            type="file"
            accept="image/*"
            style="display: none;"
            bind:this={cardFileInput}
            onchange={handleBusinessCardUpload}
        />

        {#if cardError}
            <div class="ft__smaller lvct-text-danger" style="margin-bottom: 6px;">{cardError}</div>
        {/if}

        {#if businessCardUrl}
            <div class="lvct-card-preview-container">
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="lvct-card-preview-box"
                    onclick={() => (cardViewerOpen = true)}
                    title="点击放大查看名片大图"
                >
                    <img src={businessCardUrl} alt="纸质名片" class="lvct-card-preview-img" />
                    <div class="lvct-card-preview-overlay">
                        <Maximize2 size={16} />
                        <span>点击放大查看名片</span>
                    </div>
                </div>
            </div>
        {:else}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="lvct-card-upload-dropzone"
                onclick={() => cardFileInput?.click()}
                title="点击选择名片照片上传"
            >
                <div class="lvct-card-upload-inner">
                    <CreditCard size={14} style="color: var(--b3-theme-on-surface-light);" />
                    <span class="lvct-card-upload-title" style="margin: 0; font-size: 12px;">上传纸质名片照片</span>
                    <span class="lvct-card-upload-desc" style="font-size: 11px;">（支持 PNG/JPG/WebP 高清压缩查阅）</span>
                </div>
            </div>
        {/if}
        {#if copyFieldError}
            <p class="b3-label b3-label--error ft__smaller" style="margin: 8px 0 0;">{copyFieldError}</p>
        {/if}
    </section>

    {#if onLoadPersonFacts && onSavePersonFacts}
        <section class="lvct-detail__section lvct-detail__person-facts">
            <div class="lvct-detail__section-head" role="button" tabindex="0" onclick={() => toggleSection("facts")} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection("facts"); } }} style="cursor: pointer; user-select: none;">
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    {#if isSectionCollapsed("facts")}
                        <ChevronRight size={14} />
                    {:else}
                        <ChevronDown size={14} />
                    {/if}
                    <h4 style="margin: 0;">记住的事（偏好忌口与关键事实）</h4>
                    {#if facts.length > 0}
                        <span class="lvct-chip lvct-chip--tag">{facts.length}</span>
                    {/if}
                </div>
            </div>
            {#if !isSectionCollapsed("facts")}
                <p class="ft__smaller ft__on-surface" style="margin: 4px 0 8px 0;">记录对方的独到观点、喜好忌口、经历背景或关键事实，直接保存在人物笔记文档中，自动同步至会前速览与会前速查。</p>
                {#if factsLoading}
                    <p class="ft__smaller ft__on-surface" role="status">正在读取事实画像…</p>
                {:else if factsError}
                    <div class="lvct-form__error" role="alert" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 4px 0 8px;">
                        <span>{factsError}</span>
                        <button type="button" class="b3-button b3-button--text b3-button--small" onclick={loadFacts}>重试</button>
                    </div>
                {:else}
                    {#if facts.length > 0}
                        <ul class="lvct-facts-list">
                            {#each facts as fact (fact.id)}
                                <li class="lvct-facts-item" class:lvct-facts-item--taboo={fact.category === "preference" && fact.isTaboo}>
                                    {#if fact.category === "preference" && fact.isTaboo}
                                        <span class="lvct-chip lvct-chip--error">🚫 忌口红线</span>
                                    {:else}
                                        <span class={`lvct-chip lvct-chip--fact lvct-chip--fact-${fact.category}`}>
                                            {FACT_CATEGORY_META[fact.category]?.icon || '📌'} {FACT_CATEGORY_META[fact.category]?.label || '事实'}
                                        </span>
                                    {/if}
                                    <div class="lvct-facts-content">
                                        <div class="lvct-facts-text">{fact.text}</div>
                                        <div class="lvct-facts-meta">
                                            <span>{fact.date}</span>
                                            {#if fact.sourceRef}
                                                <span>· 出处：{fact.sourceRef}</span>
                                            {/if}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        class="b3-button b3-button--text lvct-facts-del-btn"
                                        onclick={() => makeFactFlashcard(fact)}
                                        title={flashcardToastId === fact.id ? "已复制常识闪卡 Q&A 文本" : "一键制成常识闪卡（复制问答至小驴闪卡复习）"}
                                    >
                                        {#if flashcardToastId === fact.id}<Check size={13} style="color: var(--lvct-success);" />{:else}<Sparkles size={13} />{/if}
                                    </button>
                                    <button
                                        type="button"
                                        class="b3-button b3-button--text lvct-facts-del-btn"
                                        onclick={() => handleRemoveFact(fact.id)}
                                        title="删除此项事实"
                                        disabled={factsSaving}
                                    >
                                        <X size={13} />
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <div class="ft__smaller ft__on-surface" style="padding: 4px 0 8px;">暂无记录的偏好忌口或关键事实</div>
                    {/if}

                    {#if factsSaveError}
                        <div class="lvct-form__error" role="alert" style="margin: 4px 0 8px;">{factsSaveError}</div>
                    {/if}
                    <div class="lvct-facts-form">
                        <div class="lvct-facts-form__cats">
                            {#each (["quote", "preference", "background", "fact"] as const) as cat}
                                <button
                                    type="button"
                                    class="b3-chip"
                                    class:b3-chip--primary={newFactCategory === cat}
                                    onclick={() => { newFactCategory = cat; if (cat !== "preference") newFactIsTaboo = false; }}
                                >
                                    {FACT_CATEGORY_META[cat].icon} {FACT_CATEGORY_META[cat].label}
                                </button>
                            {/each}
                            {#if newFactCategory === "preference"}
                                <button
                                    type="button"
                                    class="b3-chip"
                                    class:lvct-chip--error={newFactIsTaboo}
                                    aria-pressed={newFactIsTaboo}
                                    onclick={() => (newFactIsTaboo = !newFactIsTaboo)}
                                    title="标记为过敏、严格忌口或社交敏感雷区，将在头部与会前速览中醒目预警"
                                >
                                    🚫 {newFactIsTaboo ? "已标为忌口红线" : "设为忌口红线"}
                                </button>
                            {/if}
                        </div>
                        <input
                            class="b3-text-field"
                            style="width: 100%; box-sizing: border-box;"
                            aria-label="记住的事内容"
                            placeholder={newFactCategory === "quote" ? "记录对方的金句或独到见解…" :
                                         newFactCategory === "preference" ? "记录饮食忌口、茶酒偏好或习惯…" :
                                         newFactCategory === "background" ? "记录过往任职、学术背景或家庭情况…" : "记录关键事实备忘…"}
                            bind:value={newFactText}
                            disabled={factsSaving}
                            onkeydown={(e) => { if (e.key === "Enter" && newFactText.trim()) { e.preventDefault(); void handleAddFact(); } }}
                        />
                        <div class="fn__flex" style="gap: 8px; align-items: center;">
                            <input
                                class="b3-text-field"
                                style="flex: 1; font-size: 11px;"
                                aria-label="事实出处（可选）"
                                placeholder="出处（可选，如：行业峰会、朋友圈）"
                                bind:value={newFactSource}
                                disabled={factsSaving}
                            />
                            <button
                                type="button"
                                class="b3-button b3-button--outline"
                                style="flex-shrink: 0;"
                                disabled={!newFactText.trim() || factsSaving}
                                onclick={handleAddFact}
                            >
                                {factsSaving ? "保存中…" : "+ 记录事实"}
                            </button>
                        </div>
                    </div>
                {/if}
            {/if}
        </section>
    {/if}

    {#if onLoadPersonNote && onSavePersonNote}
        <section class="lvct-detail__section lvct-detail__person-note">
            <div class="lvct-detail__section-head" role="button" tabindex="0" onclick={() => toggleSection("notes")} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection("notes"); } }} style="cursor: pointer; user-select: none;">
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    {#if isSectionCollapsed("notes")}
                        <ChevronRight size={14} />
                    {:else}
                        <ChevronDown size={14} />
                    {/if}
                    <h4 style="margin: 0;">个人备注</h4>
                </div>
                {#if personNoteSaved}<span class="lvct-chip lvct-bucket--today">已保存</span>{/if}
            </div>
            {#if !isSectionCollapsed("notes")}
                <p class="ft__smaller ft__on-surface" style="margin: 4px 0 6px 0;">记录特殊情况、偏好或下次见面要注意的事。写入该人物文档，不计入互动次数。</p>
                {#if personNoteLoading}
                    <p class="ft__smaller ft__on-surface" role="status">正在读取个人备注…</p>
                {:else}
                    <textarea
                        class="b3-text-field lvct-detail__person-note-input"
                        rows="4"
                        maxlength="5000"
                        aria-label="个人备注"
                        placeholder="例如：偏好安静的环境，下次见面前提醒准备资料"
                        bind:value={personNoteDraft}
                        oninput={() => { personNoteDraftRevision += 1; personNoteSaved = false; personNoteError = ""; personNoteErrorKind = ""; }}
                        disabled={personNoteSaving || personNoteLegacyBusy}
                    ></textarea>
                    <div class="lvct-detail__person-note-actions">
                        <span class="ft__smaller ft__on-surface">{personNoteDraft.length} / 5000</span>
                        <button type="button" class="b3-button b3-button--text" disabled={personNoteSaving || personNoteLegacyBusy || Boolean(personNoteLegacySnapshot) || personNoteReloadConfirm || personNoteDraft === personNote} onclick={() => void savePersonNoteState()}>
                            {personNoteSaving ? "保存中…" : "保存备注"}
                        </button>
                        <button type="button" class="b3-button b3-button--outline" disabled={personNoteLoading || personNoteSaving || personNoteLegacyBusy || personNoteReloadConfirm} onclick={requestPersonNoteReload}>重新读取</button>
                    </div>
                {/if}
                {#if personNoteReloadConfirm}
                    <div class="lvct-person-fields__confirm" role="group" aria-label="重新读取个人备注前确认草稿">
                        <p>个人备注有未保存的草稿。重新读取最新备注时如何处理？其他区域的草稿会保留。</p>
                        <div class="lvct-person-fields__actions">
                            <button type="button" class="b3-button b3-button--outline" onclick={() => void reloadPersonNote(true)}>保留草稿并读取最新</button>
                            <button type="button" class="b3-button b3-button--cancel" onclick={() => void reloadPersonNote(false)}>放弃草稿并读取最新</button>
                            <button type="button" class="b3-button b3-button--text" onclick={() => (personNoteReloadConfirm = false)}>取消</button>
                        </div>
                    </div>
                {/if}
                {#if personNoteLatestVisible && personNoteDraft !== personNote}
                    <div class="lvct-detail__person-note-latest">
                        <p class="ft__smaller" role="status">已读取最新备注，当前草稿已保留，尚未合并。请核对下方已存内容；再次保存会用当前草稿替换这些内容。</p>
                        <strong>最新已存备注</strong>
                        <pre style="white-space:pre-wrap;overflow-wrap:anywhere;margin:var(--lvct-sp-2) 0" aria-label="最新已存个人备注">{personNote || "（空）"}</pre>
                    </div>
                {/if}
                {#if personNoteError}
                    <div class="lvct-form__error" role="alert">个人备注{personNoteErrorKind === "load" ? "读取" : "保存"}失败：{personNoteError}</div>
                    {#if personNoteErrorKind === "save"}
                        <button type="button" class="b3-button b3-button--outline" disabled={personNoteLoading || personNoteSaving || personNoteLegacyBusy || Boolean(personNoteLegacySnapshot) || personNoteReloadConfirm} onclick={() => void savePersonNoteState()}>重试保存</button>
                    {/if}
                {/if}
                {#if onInspectLegacyPersonNote && onDetachLegacyPersonNote && personNoteErrorKind === "load" && !personNoteLegacyDetached}
                    <button type="button" class="b3-button b3-button--outline" disabled={personNoteLoading || personNoteSaving || personNoteLegacyBusy || personNoteReloadConfirm} onclick={() => void inspectPersonNoteLegacy()}>核对旧备注</button>
                {/if}
                {#if personNoteLegacyBusy}<p class="ft__smaller ft__on-surface" role="status">正在核对旧备注关联，请稍候…</p>{/if}
                {#if personNoteLegacySnapshot}
                    <div class="lvct-person-fields__confirm lvct-detail__person-note-legacy" role="group" aria-label="核对旧备注关联">
                        <p>这里只显示带旧标记的末段，不能代表整份备注。请打开人物文档，核对并复制完整备注。解除关联会保留全部原文，不会自动拼接、删除或覆盖原块。</p>
                        <strong>带旧标记的末段原文</strong>
                        <pre style="white-space:pre-wrap;overflow-wrap:anywhere;margin:var(--lvct-sp-2) 0" aria-label="旧备注末段原文">{personNoteLegacySnapshot.content || "（空段落）"}</pre>
                        <div class="lvct-person-fields__actions">
                            <button type="button" class="b3-button b3-button--outline" disabled={personNoteLegacyBusy} onclick={() => onOpenPersonDoc(current.docId)}>打开人物文档核对</button>
                            <button type="button" class="b3-button b3-button--outline" disabled={personNoteLegacyBusy} onclick={() => void detachPersonNoteLegacy()}>保留原文并解除旧备注关联</button>
                            <button type="button" class="b3-button b3-button--text" disabled={personNoteLegacyBusy} onclick={() => { personNoteLegacySnapshot = null; personNoteLegacyError = ""; }}>取消核对</button>
                        </div>
                    </div>
                {/if}
                {#if personNoteLegacyError}<p class="lvct-form__error" role="alert">{personNoteLegacyError}</p>{/if}
                {#if personNoteLegacyDetached}
                    <p class="ft__smaller lvct-detail__person-note-legacy-detached" role="status">已解除旧备注关联，全部原文仍在人物文档中，当前草稿已保留。请核对并将完整备注粘贴到上方后保存。</p>
                {/if}
            {/if}
        </section>
    {/if}

    {#if orgSectionSupported}
    <section class="lvct-detail__section" aria-busy={addOrgBusy}>
        <div class="fn__flex" style="align-items: center; gap: 8px;">
            <h4 class="fn__flex-1">{text("orgSectionTitle", "组织归属")}</h4>
            {#if onOpenOrgManager}
                <button type="button" class="b3-button b3-button--text" onclick={onOpenOrgManager}>
                    {text("orgSectionManage", "管理归属")}</button>
            {/if}
        </div>
        {#if addOrgBusy}
            <p class="ft__smaller ft__on-surface" role="status" aria-live="polite">
                {orgAction === "create" ? "正在创建组织…" : orgAction === "add" ? "正在添加组织归属…" : orgAction === "edit" ? "正在保存组织归属…" : orgAction === "remove" ? "正在移除组织归属…" : "正在处理组织归属…"}
            </p>
        {/if}
        {#if orgReadError}
            <p class="lvct-form__error" role="alert">{text("orgMembershipReadUnknown", "组织归属读取失败，结果尚未核实。")}{orgReadError}</p>
            <button class="b3-button b3-button--outline" disabled={addOrgBusy || orgLoading} onclick={() => void loadOrgMemberships()}>{text("orgMembershipReload", "重新读取归属")}</button>
        {:else if orgLoading}
            <p role="status">{text("orgMembersLoading", "正在加载成员…")}</p>
        {:else if orgMemberships.length === 0}
            <p class="ft__smaller ft__on-surface">{text("orgSectionEmpty", "未加入任何组织")}</p>
        {:else}
            <ul class="lvct-detail__timeline lvct-detail__org-list">
                {#each orgMemberships as membership (membership.id)}
                    {@const effKind = membership.orgName?.trim() === "家庭" ? "family" : (membership.affiliationKind ?? "unspecified")}
                    {@const kindText = affiliationLabel(effKind)}
                    <li class="lvct-detail__timeline-row lvct-detail__org-timeline-row">
                        <div class="lvct-detail__org-main">
                            <span class="lvct-detail__timeline-note lvct-detail__org-title-wrap">
                                <strong class="lvct-detail__org-name">{membership.orgName}</strong>
                                {#if kindText && kindText !== membership.orgName?.trim()}
                                    <span class="ft__smaller ft__on-surface"> · {kindText}</span>
                                {/if}
                                {#if membership.department}<span class="ft__smaller"> · {membership.department}</span>{/if}
                                {#if membership.title}<span class="ft__smaller"> · {membership.title}</span>{/if}
                            </span>
                            <div class="lvct-detail__org-badges">
                                <span class="lvct-chip {membership.status === "former" ? "lvct-bucket--stale" : "lvct-bucket--today"}">{orgMembershipStatusLabel({ ...membership, affiliationKind: effKind })}</span>
                                {#if membership.removed}<span class="lvct-chip lvct-bucket--stale">组织已移除</span>
                                {:else if membership.archived}<span class="lvct-chip lvct-bucket--stale">{text("orgMembershipArchived", "组织已归档")}</span>{/if}
                                {#if membership.reachable === false}<span class="lvct-chip lvct-bucket--stale">{text("orgMembershipUnreachable", "组织待核实")}</span>{/if}
                                {#if membership.joinedOn || membership.leftOn}
                                    <span class="ft__smaller ft__on-surface lvct-detail__org-period">{membership.joinedOn || "?"}{membership.leftOn ? ` – ${membership.leftOn}` : " – 至今"}</span>
                                {/if}
                                {#if membership.note}<span class="ft__smaller ft__on-surface lvct-detail__org-note" title={membership.note}> · {membership.note}</span>{/if}
                            </div>
                        </div>
                        {#if orgRemoveSupported || onUpdateOrgMembership}
                            <span class="lvct-detail__org-actions">
                                {#if onUpdateOrgMembership}
                                    <button class="b3-button b3-button--text" disabled={addOrgBusy || membership.removed} onclick={() => startEditOrgMembership(membership)}>{text("orgMemberEdit", "编辑")}</button>
                                {/if}
                                {#if orgRemoveSupported}
                                    <button type="button" class="b3-button b3-button--cancel" disabled={addOrgBusy || membership.removed}
                                        aria-label={text("orgMembershipRemoveLabel", "移除归属 {name}", { name: membership.orgName })}
                                        onclick={() => { removingOrgMembershipId = membership.id; removingOrgSnapshot = orgMembershipSnapshot(membership); }}>{text("orgMembershipRemove", "移除")}</button>
                                {/if}
                            </span>
                        {/if}
                        {#if membership.removed}<span class="ft__smaller ft__on-surface lvct-detail__org-full-row">组织已移除；恢复组织后才能维护这段经历。</span>{/if}
                        {#if editingOrgMembershipId === membership.id}
                            <div class="lvct-org-add lvct-org-add--edit lvct-detail__org-full-row">
                                <label class="lvct-org-add__field"><span>归属分类</span>
                                    <select class="b3-select" bind:value={editOrgAffiliationKind} disabled={addOrgBusy} aria-label={text("orgAffiliationKind", "归属分类")}>
                                        <option value="work">{affiliationLabel("work")}</option><option value="education">{affiliationLabel("education")}</option><option value="family">{affiliationLabel("family")}</option><option value="unspecified">{affiliationLabel("unspecified")}</option>
                                    </select>
                                </label>
                                <label class="lvct-org-add__field"><span>当前状态</span>
                                    <select class="b3-select" value={editOrgStatus} onchange={(event) => changeEditOrgStatus(event.currentTarget.value as OrgMembershipStatus)} disabled={addOrgBusy} aria-label={text("orgMemberStatusLabel", "状态")}>
                                        <option value="active" disabled={membership.archived}>{editOrgAffiliationKind === "family" ? "家庭成员" : editOrgAffiliationKind === "education" ? "当前就读" : text("orgStatusActive", "当前在职/就读")}</option>
                                        <option value="former">{editOrgAffiliationKind === "family" ? "曾是家庭成员" : editOrgAffiliationKind === "education" ? "已毕业/离校" : text("orgStatusFormer", "已离开/毕业")}</option>
                                    </select>
                                </label>
                                <label class="lvct-org-add__field"><span>{text("orgMemberDeptLabel", "部门/院系")}</span>
                                    <input class="b3-text-field" bind:value={editOrgDepartment} disabled={addOrgBusy} placeholder="选填，如：研发部" aria-label={text("orgMemberDeptLabel", "部门")} />
                                </label>
                                <label class="lvct-org-add__field"><span>{text("orgMemberTitleLabel", "职位/身份")}</span>
                                    <input class="b3-text-field" bind:value={editOrgTitle} disabled={addOrgBusy} placeholder="选填，如：总监、校友" aria-label={text("orgMemberTitleLabel", "职位")} />
                                </label>
                                <label class="lvct-org-add__field"><span>{text("orgMemberJoinedLabel", "开始日期")}</span>
                                    <input class="b3-text-field" type="date" bind:value={editOrgJoinedOn} disabled={addOrgBusy} aria-label={text("orgMemberJoinedLabel", "加入日期")} />
                                </label>
                                <label class="lvct-org-add__field"><span>{text("orgMemberLeftLabel", "结束日期")}</span>
                                    <input class="b3-text-field" type="date" bind:value={editOrgLeftOn} disabled={addOrgBusy || editOrgStatus === "active"} aria-label={text("orgMemberLeftLabel", "离开日期")} />
                                </label>
                                <label class="lvct-org-add__field"><span>自定义状态</span>
                                    <input class="b3-text-field" maxlength="40" bind:value={editOrgStatusLabel} disabled={addOrgBusy} aria-label="自定义状态" placeholder="如：实习、兼职、休学" />
                                </label>
                                <label class="lvct-org-add__field"><span>{text("orgMemberNote", "经历备注")}</span>
                                    <input class="b3-text-field" maxlength="240" bind:value={editOrgNote} disabled={addOrgBusy} aria-label={text("orgMemberNote", "成员备注")} placeholder={text("orgMemberNotePlaceholder", "仅记录这段组织经历")} />
                                </label>
                                <div class="lvct-org-add__footer">
                                    <span class="ft__smaller ft__on-surface">{text("orgMembershipEditImpact", "保存会更新这段成员记录及双方当前双链；离开保留历史。")}</span>
                                    <div class="lvct-org-add__btns">
                                        <button class="b3-button b3-button--text" disabled={addOrgBusy} onclick={() => void saveEditOrgMembership()}>{addOrgBusy && orgAction === "edit" ? "保存中…" : text("orgMemberSave", "保存")}</button>
                                        <button class="b3-button b3-button--cancel" disabled={addOrgBusy} onclick={() => (editingOrgMembershipId = "")}>{text("orgMemberCancel", "取消")}</button>
                                    </div>
                                </div>
                            </div>
                        {/if}
                        {#if removingOrgMembershipId === membership.id}
                            <div class="lvct-org-remove-confirm lvct-detail__org-full-row" role="group" aria-label={text("orgMembershipRemoveConfirm", "确认移除这段成员历史")}>
                                <p class="ft__smaller">{text("orgMembershipRemoveImpact", "将删除这段成员历史并重建双方当前双链。普通离职请编辑为已离开；人物和组织文档保留。")}</p>
                                <div class="lvct-org-add__btns">
                                    <button class="b3-button b3-button--cancel" disabled={addOrgBusy} onclick={() => void removeOrgMembership(membership.id)}>{addOrgBusy && orgAction === "remove" ? "移除中…" : text("orgMembershipRemoveConfirm", "确认移除这段成员历史")}</button>
                                    <button class="b3-button b3-button--outline" disabled={addOrgBusy} onclick={() => (removingOrgMembershipId = "")}>{text("orgMemberCancel", "取消")}</button>
                                </div>
                            </div>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
        {#if orgAddSupported}
            {#if orgCandidatesError}<p class="lvct-form__error" role="alert">{orgCandidatesError}</p>
                <button class="b3-button b3-button--outline" disabled={addOrgBusy || orgCandidatesLoading} onclick={() => void loadOrgCandidates()}>{text("orgMembershipReloadCandidates", "重新读取组织候选")}</button>
            {/if}
            <details class="lvct-org-add-details" open={orgMemberships.length === 0 || Boolean(addOrgDocId || addOrgError)}>
                <summary class="lvct-org-add-summary">
                    <span class="lvct-org-add-summary__title">+ 添加或新建组织归属</span>
                    <span class="ft__smaller ft__on-surface">{text("orgMembershipAddImpact", "支持登记单位、学校、家庭及历史经历，自动维护双方双链")}</span>
                </summary>
                <div class="lvct-org-add">
                    <label class="lvct-org-add__field lvct-org-add__field--wide"><span>选择组织</span>
                        <select class="b3-select" value={addOrgDocId} onchange={(event) => changeAddOrg(event.currentTarget.value)} disabled={addOrgBusy || orgLoading || orgCandidatesLoading} bind:this={addOrganizationSelect}
                            aria-label={text("orgAddOrgLabel", "选择要加入的组织")}>
                            <option value="">{text("orgAddOrgPick", "选择已有组织…")}</option>
                            {#each orgCandidateOptions as org (org.docId)}
                                <option value={org.docId}>{org.name}{org.archived ? "（已归档，仅补录历史）" : hasActiveOrgMembership(org.docId) ? "（已有当前归属，可补录历史）" : ""}</option>
                            {/each}
                        </select>
                    </label>
                    {#if orgCandidatesLoading}<span class="ft__smaller ft__on-surface" role="status">正在读取组织候选…</span>{/if}
                    <label class="lvct-org-add__field"><span>归属分类</span>
                        <select class="b3-select" bind:value={addOrgAffiliationKind} disabled={addOrgBusy} aria-label={text("orgAffiliationKind", "归属分类")}>
                            <option value="work">{affiliationLabel("work")}</option><option value="education">{affiliationLabel("education")}</option><option value="family">{affiliationLabel("family")}</option><option value="unspecified">{affiliationLabel("unspecified")}</option>
                        </select>
                    </label>
                    <label class="lvct-org-add__field"><span>当前状态</span>
                        <select class="b3-select" value={addOrgStatus} onchange={(event) => changeAddOrgStatus(event.currentTarget.value as OrgMembershipStatus)} disabled={addOrgBusy || !addOrgDocId} aria-label="当前状态">
                            <option value="active" disabled={Boolean(selectedAddOrg?.archived || (addOrgDocId && hasActiveOrgMembership(addOrgDocId)))}>{addOrgAffiliationKind === "family" ? "家庭成员" : addOrgAffiliationKind === "education" ? "当前就读" : "当前在职/就读"}</option>
                            <option value="former">{addOrgAffiliationKind === "family" ? "曾是家庭成员" : addOrgAffiliationKind === "education" ? "已毕业/离校" : "已离开/毕业"}</option>
                        </select>
                    </label>
                    <label class="lvct-org-add__field"><span>{text("orgMemberDeptLabel", "部门/院系")}</span>
                        <input class="b3-text-field" placeholder="选填，如：投资部" bind:value={addOrgDepartment}
                            disabled={addOrgBusy} aria-label={text("orgAddDeptLabel", "归属部门")} />
                    </label>
                    <label class="lvct-org-add__field"><span>{text("orgMemberTitleLabel", "职位/身份")}</span>
                        <input class="b3-text-field" placeholder="选填，如：合伙人" bind:value={addOrgTitle}
                            disabled={addOrgBusy} aria-label={text("orgAddTitleLabel", "归属职位")} />
                    </label>
                    <label class="lvct-org-add__field"><span>开始日期</span>
                        <input class="b3-text-field" type="date" bind:value={addOrgJoinedOn} disabled={addOrgBusy}
                            aria-label={text("orgAddJoinedLabel", "加入日期")} />
                    </label>
                    <label class="lvct-org-add__field"><span>结束日期</span>
                        <input class="b3-text-field" type="date" bind:value={addOrgLeftOn} disabled={addOrgBusy || !addOrgDocId || addOrgStatus === "active"} aria-label="离开日期" />
                    </label>
                    <label class="lvct-org-add__field"><span>自定义状态</span>
                        <input class="b3-text-field" maxlength="40" bind:value={addOrgStatusLabel} disabled={addOrgBusy || !addOrgDocId} aria-label="自定义状态" placeholder="选填，如：实习、休学" />
                    </label>
                    <label class="lvct-org-add__field"><span>{text("orgMemberNote", "经历备注")}</span>
                        <input class="b3-text-field" maxlength="240" bind:value={addOrgNote} disabled={addOrgBusy || !addOrgDocId} aria-label={text("orgMemberNote", "成员备注")} placeholder={text("orgMemberNotePlaceholder", "仅记录这段组织经历")} />
                    </label>
                    {#if selectedAddOrg?.archived}<p class="ft__smaller ft__on-surface lvct-org-add__field--wide">组织已归档，只能补录历史经历；恢复组织后才可添加当前归属。</p>{/if}
                    <div class="lvct-org-add__footer">
                        <span class="ft__smaller ft__on-surface">先选择上方组织再点击「添加归属」，或直接新建组织。</span>
                        <div class="lvct-org-add__btns">
                            {#if onCreateOrganization}
                                <button type="button" class="b3-button b3-button--outline" disabled={addOrgBusy || orgLoading || orgCandidatesLoading} bind:this={createOrganizationTrigger}
                                    onclick={() => void createOrganizationFromDetail()}>{addOrgBusy && orgAction === "create" ? "创建中…" : text("orgCreateFirst", "新建组织")}</button>
                            {/if}
                            <button type="button" class="b3-button b3-button--text" disabled={addOrgBusy || orgLoading || orgCandidatesLoading || !!orgReadError || !!orgCandidatesError || addOrgDocId === ""}
                                onclick={() => void addOrgMembership()}>{addOrgBusy && orgAction === "add" ? "添加中…" : text("orgAddSubmit", "添加归属")}</button>
                        </div>
                    </div>
                </div>
            </details>
        {/if}
        <OrgMembershipResult report={orgMembershipReport} {i18n} />
        {#if addOrgError}
            <p class="lvct-form__error" role="alert">{addOrgError}</p>
            <button class="b3-button b3-button--outline" disabled={addOrgBusy || orgLoading} onclick={() => void loadOrgMemberships()}>{text("orgMembershipReload", "重新读取归属")}</button>
        {/if}
    </section>
    {/if}

    {#if commonOrgsSupported && commonOrgsLoading}
    <p class="ft__smaller ft__on-surface" role="status">正在读取背景信息…</p>
    {/if}
    {#if commonOrgsSupported && (commonOrgs.length > 0 || commonOrgsFailed)}
    <section class="lvct-detail__section">
        <div class="fn__flex" style="align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
            <h4 style="margin: 0;">{text("orgCommonTitle", "共同背景")}</h4>
            <span class="ft__smaller ft__on-surface">{text("orgCommonNote", "依据为组织成员记录；加入时间未知者只标「同组织」，不推断同期。")}</span>
        </div>
        {#if commonOrgsFailed}
            <p class="ft__smaller ft__on-surface" role="alert">{text("orgCommonFailed", "共同背景读取失败。")}</p>
            <button type="button" class="b3-button b3-button--outline" onclick={loadCommonOrgs}>重新读取共同背景</button>
        {:else}
            <div class="lvct-org-common-list">
                {#each commonOrgs as entry (entry.orgDocId)}
                    {@const isFamilyOrg = entry.orgName?.trim() === "家庭"}
                    <div class="lvct-org-common">
                        <div class="lvct-org-common__head">
                            <div class="lvct-org-common__title-group">
                                <span class="lvct-org-common__badge-icon">{isFamilyOrg ? "家" : "组"}</span>
                                <b>{entry.orgName}</b>
                                <span class="lvct-chip lvct-bucket--stale">{entry.peers.length} 人</span>
                            </div>
                            {#if onOpenOrganization}
                                <button class="b3-button b3-button--text lvct-org-common__open-org" onclick={() => onOpenOrganization?.(entry.orgDocId)}>{text("routeOpenOrganization", "查看组织")}</button>
                            {/if}
                        </div>
                        <div class="lvct-org-common__peers">
                            {#each entry.peers as peer (peer.docId)}
                                {@const contact = peer.contact}
                                {@const isUnknownOverlap = peer.overlapText === "同在该组织（加入时间未知）"}
                                {@const subLabel = isFamilyOrg && isUnknownOverlap ? "家庭成员" : isUnknownOverlap ? "同组织成员（加入时间未知）" : peer.overlapText}
                                <div class="lvct-org-common__peer">
                                    <span class="lvct-org-common__avatar">{(peer.name || "?").trim().slice(0, 1)}</span>
                                    <div class="lvct-org-common__peer-info">
                                        <div class="lvct-org-common__peer-top">
                                            <span class="lvct-org-common__peer-name">{peer.name}</span>
                                            <span class="lvct-chip {peer.samePeriod ? "lvct-bucket--today" : "lvct-bucket--stale"}">
                                                {isFamilyOrg ? "家人" : peer.samePeriod ? text("orgCommonSamePeriod", "同期") : text("orgCommonSameOrg", "同组织")}
                                            </span>
                                        </div>
                                        <span class="ft__smaller ft__on-surface lvct-org-common__peer-sub" title={peer.overlapText}>{subLabel}</span>
                                    </div>
                                    {#if contact}
                                        <button type="button" class="b3-button b3-button--text lvct-org-common__peer-btn"
                                            onclick={() => void (async () => {
                                                if (!detailAlive) return;
                                                if (onNavigateDocId) await onNavigateDocId(peer.docId);
                                                else if (await canLeave.requestClose() && detailAlive) onNavigate(contact);
                                            })()}>{text("orgCommonOpen", "查看详情")}</button>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </section>
    {/if}

    {#if onLoadRelationshipLabels && onSaveRelationshipLabels && !current.isSelf}
        <RelationshipLabels personDocId={current.docId} {revision} onLoad={onLoadRelationshipLabels} onSave={onSaveRelationshipLabels} {onChanged} />
    {/if}

    {#if followUpSupported}
    <section class="lvct-detail__section">
        <h4>{text("fuSectionTitle", "跟进计划")}</h4>
        {#if followUpActionError}
            <div class="lvct-form__error" role="alert">{text("fuActionFail", "跟进操作失败：{msg}", { msg: followUpActionError })}</div>
            {#if followUpFailedRequest}
                <button type="button" class="b3-button b3-button--outline" disabled={followUpBusy} onclick={retryFailedFollowUp}>
                    使用原请求重试
                </button>
            {/if}
        {/if}
        {#if followUpRefreshWarning}
            <StatusNotice error message={followUpRefreshWarning} actionLabel={text("commonRetry", "重试")} onAction={() => void loadFollowUps()} />
        {/if}
        {#if followUpError}
            <ViewState compact error title={text("fuLoadFailTitle", "跟进计划加载失败")} description={followUpError}>
                <button type="button" class="b3-button b3-button--outline" onclick={loadFollowUps}>{text("commonRetry", "重试")}</button>
            </ViewState>
        {:else if followUpsLoading}
            <ViewState compact loading title={text("fuLoading", "正在加载跟进计划")} />
        {:else}
            {#if openFollowUps.length === 0}
                <p class="ft__smaller ft__on-surface">{text("fuEmpty", "没有进行中的跟进计划。安排一个日期，到时来联系 TA。")}</p>
            {:else}
                <div class="lvct-detail__timeline">
                    {#each openFollowUps as item (item.id)}
                        <div class="lvct-detail__timeline-row">
                            <span class="ft__on-surface">{item.dueDate}</span>
                            <span class="lvct-detail__timeline-note">{item.title || text("fuKeepInTouch", "保持联系")}</span>
                            {#if item.docMissing}<span class="lvct-chip lvct-bucket--stale">{text("fuDocMissing", "任务块已移除")}</span>{/if}
                            <span class="lvct-chip {item.dueDate < todayKey ? "lvct-bucket--stale" : ""}">{dueLabel(item.dueDate, todayKey)}</span>
                        </div>
                        {#if snoozeForId === item.id}
                            <div class="lvct-detail__snooze">
                                <button type="button" class="b3-button b3-button--outline" disabled={followUpBusy} onclick={() => snooze(item, "tomorrow")}>{text("fuSnoozeTomorrow", "明天")}</button>
                                <button type="button" class="b3-button b3-button--outline" disabled={followUpBusy} onclick={() => snooze(item, "threeDays")}>{text("fuSnoozeThreeDays", "三天后")}</button>
                                <button type="button" class="b3-button b3-button--outline" disabled={followUpBusy} onclick={() => snooze(item, "nextMonday")}>{text("fuSnoozeNextMonday", "下周一")}</button>
                                <button type="button" class="b3-button b3-button--outline" disabled={followUpBusy} onclick={() => snooze(item, "nextMonth")}>{text("fuSnoozeNextMonth", "一个月后")}</button>
                                <span class="lvct-detail__snooze-custom">
                                    <input type="date" class="b3-text-field" aria-label={text("fuSnoozeDateLabel", "指定日期")} bind:value={snoozeCustomDate} />
                                    <button type="button" class="b3-button b3-button--text" disabled={followUpBusy || !snoozeCustomDate} onclick={() => snooze(item, "custom")}>{text("fuSnoozeByDate", "按指定日期推迟")}</button>
                                </span>
                            </div>
                        {/if}
                        <div class="lvct-detail__followup-actions">
                            <button type="button" class="b3-button b3-button--outline" disabled={followUpBusy} onclick={() => { snoozeForId = snoozeForId === item.id ? "" : item.id; snoozeCustomDate = ""; }} aria-expanded={snoozeForId === item.id}>{text("fuPostpone", "推迟")}</button>
                            <button type="button" class="b3-button b3-button--text" aria-label="完成跟进" title="完成跟进；不会自动记录互动" disabled={followUpBusy} onclick={() => completeFollowUp(item)}>{text("fuComplete", "完成")}</button>
                            <button type="button" class="b3-button b3-button--cancel" disabled={followUpBusy} onclick={() => cancelFollowUp(item)}>{text("fuCancelPlan", "取消计划")}</button>
                        </div>
                    {/each}
                </div>
            {/if}
            {#if closedFollowUps.length > 0}
                <p class="ft__smaller ft__on-surface">{text("fuRecentlyClosed", "最近关闭：")}{closedFollowUps.slice(0, 3).map((item) => `${item.title || text("fuKeepInTouch", "保持联系")}（${item.status === "done" ? "已完成" : "已取消"}）`).join("、")}</p>
            {/if}
            <div class="lvct-detail__record fn__flex">
                <input
                    class="b3-text-field fn__flex-1"
                    type="text"
                    placeholder={text("fuTitlePlaceholder", "这次想联系什么？（可选，如：问问面试结果）")}
                    aria-label={text("fuTitleLabel", "跟进标题")}
                    bind:value={followUpTitle}
                    oninput={clearFailedFollowUpRequest}
                    disabled={followUpBusy}
                />
                <input type="date" class="b3-text-field" aria-label={text("fuDateLabel", "计划日期")} bind:value={followUpDate} onchange={clearFailedFollowUpRequest} disabled={followUpBusy} />
                <button class="b3-button b3-button--text" disabled={followUpBusy} onclick={createFollowUp}>
                    {followUpBusy ? text("fuAdding", "添加中…") : followUpRecorded ? text("fuAddAnother", "再加一条") : text("fuAddPlan", "添加计划")}
                </button>
            </div>
            {#if followUpFailedRequest && followUpFailedRequest.title === followUpTitle.trim() && followUpFailedRequest.dueDate === followUpDate}
                <StatusNotice error message="该跟进请求尚未完全核实。使用原请求重试会先核对已有记录，避免重复创建。" actionLabel="用原请求重试" onAction={retryFailedFollowUp} actionDisabled={followUpBusy} />
            {/if}
            <p class="ft__smaller ft__on-surface">到期的计划会出现在首页待办；完成计划不会自动记为互动。需要更新最近联系日期时，请在上方“记一笔互动”中单独记录。</p>
        {/if}
    </section>
    {/if}

    {#if cadenceSupported}
    <section class="lvct-detail__section">
        <h4>{text("cadenceSectionTitle", "联系节奏")}</h4>
        {#if cadenceLoadError}
            <ViewState compact error title={text("cadenceLoadFailTitle", "联系节奏读取失败")} description={cadenceLoadError}>
                <button type="button" class="b3-button b3-button--outline" onclick={loadCadence}>{text("commonRetry", "重试")}</button>
            </ViewState>
        {:else if !cadenceLoaded}
            <ViewState compact loading title={text("cadenceLoading", "正在读取联系节奏")} />
        {:else}
            {#if cadenceError}<div class="lvct-form__error" role="alert">{cadenceError}</div>{/if}
            <p class="ft__smaller ft__on-surface">
                {text("cadenceLastLabel", "上次互动：")}{lastContactLabel || text("cadenceNoInteraction", "还没有互动记录")} · {text("cadenceCurrentLabel", "当前：")}
                {cadenceMode === "paused" ? text("cadencePausedDesc", "已暂停提醒") : cadenceMode === "custom" ? text("cadenceCustomDesc", "自定义 {n} 天", { n: cadenceDays }) : text("cadenceGlobalDesc", "跟随全局阈值")}
            </p>
            <div class="lvct-detail__record fn__flex">
                <select class="b3-select fn__flex-1" aria-label={text("cadenceModeLabel", "联系节奏模式")} bind:value={cadenceMode} disabled={cadenceSaving}>
                    <option value="global">{text("cadenceOptionGlobal", "跟随全局阈值")}</option>
                    <option value="custom">{text("cadenceOptionCustom", "自定义天数")}</option>
                    <option value="paused">{text("cadenceOptionPaused", "暂停提醒")}</option>
                </select>
                {#if cadenceMode === "custom"}
                    <input type="number" inputMode="numeric" class="b3-text-field" min="1" max="365" aria-label="自定义天数" bind:value={cadenceDays} disabled={cadenceSaving} />
                    inputMode="numeric"
                {/if}
                <button class="b3-button b3-button--text" onclick={() => void saveCadence()} disabled={cadenceSaving}>
                    {cadenceSaving ? text("cadenceSaving", "保存中…") : text("cadenceSave", "保存节奏")}
                </button>
            </div>
            <div class="lvct-cadence-tiers" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                {#each CADENCE_TIERS as tier}
                    <button
                        type="button"
                        class="b3-chip font-size-11 lvct-cadence-tier-btn"
                        style="border-radius: var(--lv-r-pill, 9999px); cursor: pointer;"
                        class:b3-chip--primary={cadenceMode === "custom" && cadenceDays === tier.days}
                        onclick={() => { cadenceMode = "custom"; cadenceDays = tier.days; void saveCadence(); }}
                        title={tier.description}
                        disabled={cadenceSaving}
                    >
                        {tier.icon} {tier.label}
                    </button>
                {/each}
            </div>
            {#if onSendGreetingReminder && relationshipHealth.overdue}
                <div style="margin-top: 8px;">
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small"
                        style="border-radius: var(--lv-r-pill, 9999px);"
                        onclick={handleSendGreetingReminder}
                        disabled={greetingReminderSending || greetingReminderSent}
                        title="将逾期问候事项同步到小驴管家备忘录"
                    >
                        <Bell size={12} strokeWidth={1.6} class="lvct-icon-inline" />
                        {greetingReminderSent ? "已同步至管家备忘 ✓" : greetingReminderSending ? "正在同步管家…" : "提醒问候（同步到小驴管家）"}
                    </button>
                    {#if greetingReminderError}
                        <div class="lvct-form__error" role="alert" style="margin-top: 6px;">{greetingReminderError}</div>
                    {/if}
                </div>
            {/if}
            <StatusNotice message={cadenceMessage} onDismiss={() => (cadenceMessage = "")} />
            <p class="ft__smaller ft__on-surface">{text("cadenceNote", "仅影响首页「久未联系」提醒，不写入联系人的数据库字段。")}</p>
        {/if}
    </section>
    {/if}

    <details class="lvct-detail__advanced">
        <summary>
            <span>更多资料与扩展记录</span>
            <span class="ft__smaller ft__on-surface">初识溯源 · 补充资料 · 纪念日 · 谈资礼物 · 承诺行程 · 账本别名</span>
        </summary>
        <section class="lvct-origin-section">
            <div class="lvct-detail__section-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                    <span>🌱 初识溯源与引荐人</span>
                </h4>
                {#if onLoadOrigin && onSaveOrigin && !originEditing}
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small"
                        style="border-radius: var(--lv-r-pill, 9999px);"
                        onclick={() => {
                            originEditing = true;
                            originError = "";
                            metAtDraft = currentOrigin?.metAt ?? "";
                            introducedByDraft = currentOrigin?.introducedByDocId ?? "";
                            preferencesDraft = currentOrigin?.preferences ?? "";
                        }}
                    >
                        <Pencil size={12} strokeWidth={1.6} class="lvct-icon-inline" /> 编辑初识
                    </button>
                {/if}
            </div>
            {#if originEditing}
                <div class="lvct-origin-edit-box">
                    {#if originError}
                        <div class="lvct-form__error" role="alert">{originError}</div>
                    {/if}
                    <label class="lvct-form__item">
                        <span>初识场合或时间：</span>
                        <input class="b3-text-field fn__block" type="text" maxlength="200" placeholder="如：2024年秋季行业峰会、创业路演" bind:value={metAtDraft} oninput={() => (originError = "")} disabled={originSaving} />
                    </label>
                    <label class="lvct-form__item">
                        <span>引荐人（库内好友）：</span>
                        <select class="b3-select fn__block" bind:value={introducedByDraft} onchange={() => (originError = "")} disabled={originSaving}>
                            <option value="">无引荐人（自主结识）</option>
                            {#each others as p (p.docId)}
                                {#if p.docId !== current.docId}
                                    <option value={p.docId}>{p.name} {p.group ? `(${p.group})` : ""}</option>
                                {/if}
                            {/each}
                        </select>
                    </label>
                    <label class="lvct-form__item">
                        <span>喜好忌口与备忘速记：</span>
                        <textarea class="b3-text-field fn__block" rows="2" maxlength="2000" placeholder="如：海鲜过敏、喜欢手冲浅烘、勿聊前东家" bind:value={preferencesDraft} oninput={() => (originError = "")} disabled={originSaving}></textarea>
                    </label>
                    <div class="lvct-origin-actions" style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
                        <button type="button" class="b3-button b3-button--cancel" style="border-radius: var(--lv-r-pill, 9999px);" disabled={originSaving} onclick={() => { originEditing = false; originError = ""; }}>取消</button>
                        <button type="button" class="b3-button b3-button--primary" style="border-radius: var(--lv-r-pill, 9999px);" onclick={() => void handleSaveOrigin()} disabled={originSaving}>
                            {originSaving ? "保存中…" : "保存初识信息"}
                        </button>
                    </div>
                </div>
            {:else}
                <div class="lvct-origin-display">
                    <div class="lvct-origin-row">
                        <span class="lvct-origin-label">初识场合：</span>
                        <span class="lvct-origin-val">{currentOrigin?.metAt || "未记录初识场合与时间"}</span>
                    </div>
                    <div class="lvct-origin-row">
                        <span class="lvct-origin-label">引荐伙伴：</span>
                        {#if currentIntroducer}
                            <button type="button" class="b3-button b3-button--text lvct-origin-link" onclick={() => onOpenPersonDoc?.(currentIntroducer!.docId)}>
                                🤝 {currentIntroducer.name} ↗
                            </button>
                        {:else}
                            <span class="lvct-origin-val">自主结识 / 无引荐人</span>
                        {/if}
                    </div>
                    {#if currentOrigin?.preferences}
                        <div class="lvct-origin-row">
                            <span class="lvct-origin-label">偏好速记：</span>
                            <span class="lvct-origin-val">{currentOrigin.preferences}</span>
                        </div>
                    {/if}
                </div>
            {/if}
        </section>

    {#if onLoadKinships && onAddKinship && onRemoveKinship && !current.isSelf}
        <FamilyKinshipTree
            personDocId={current.docId}
            items={kinships}
            onAddMember={async (item) => {
                const res = await onAddKinship!(item);
                kinships = res;
            }}
            onRemoveMember={async (id) => {
                const res = await onRemoveKinship!(current.docId, id);
                kinships = res;
            }}
            onOpenDoc={onOpenPersonDoc}
            {i18n}
        />
    {/if}

    {#if onLoadPromises && onAddPromise && onUpdatePromise && onRemovePromise && !current.isSelf}
        <PersonPromisesLedger
            personDocId={current.docId}
            personName={current.name}
            items={promises}
            onAddPromise={async (item) => {
                const res = await onAddPromise!(item);
                promises = res;
            }}
            onUpdatePromise={async (id, patch) => {
                const res = await onUpdatePromise!(current.docId, id, patch);
                promises = res;
            }}
            onRemovePromise={async (id) => {
                const res = await onRemovePromise!(current.docId, id);
                promises = res;
            }}
            onConvertPromiseToInteraction={async (prm) => {
                const prefix = prm.direction === "i_promised" ? "【履约兑现-我承诺】" : "【履约兑现-对方承诺】";
                const draft = `${prefix}${prm.title}${prm.detail ? `：${prm.detail}` : ""}`;
                if (noteText.trim() && noteText.trim() !== draft) {
                    const ok = await confirmDialog({
                        title: text("topicsConvertConfirmTitle", "替换互动备注草稿"),
                        message: "当前已有未记录的互动备注草稿，填入信诺履约将替换当前草稿。确定继续吗？",
                        confirmLabel: text("topicsConvertConfirmBtn", "确认替换"),
                        cancelLabel: text("topicsConvertCancelBtn", "取消"),
                    });
                    if (!ok) return;
                }
                noteText = draft;
            }}
            {i18n}
        />
    {/if}

    {#if onLoadSocialPreferences && onAddSocialPreference && onUpdateSocialPreference && onRemoveSocialPreference && !current.isSelf}
        <PersonSocialPreferences
            personDocId={current.docId}
            items={socialPreferences}
            onAdd={async (item) => {
                const res = await onAddSocialPreference!(item);
                socialPreferences = res;
            }}
            onUpdate={async (prefId, patch) => {
                const res = await onUpdateSocialPreference!(current.docId, prefId, patch);
                socialPreferences = res;
            }}
            onRemove={async (prefId) => {
                const res = await onRemoveSocialPreference!(current.docId, prefId);
                socialPreferences = res;
            }}
            {i18n}
        />
    {/if}

    {#if onLoadItineraries && onSaveItinerary && onRemoveItinerary && onToggleItineraryChecklist && !current.isSelf}
        <PersonItinerary
            personDocId={current.docId}
            personName={current.name}
            items={itineraries}
            onSave={async (item) => {
                const res = await onSaveItinerary!(item);
                itineraries = res;
            }}
            onRemove={async (itineraryId) => {
                const res = await onRemoveItinerary!(current.docId, itineraryId);
                itineraries = res;
            }}
            onToggleChecklist={async (itineraryId, checklistId) => {
                const res = await onToggleItineraryChecklist!(current.docId, itineraryId, checklistId);
                itineraries = res;
            }}
            onConvertItineraryToInteraction={async (item) => {
                const loc = item.location ? `在 ${item.location} ` : "";
                const draft = `【会面拜访】${loc}与 ${current.name} 会见交流。\n主题：${item.title}${item.attendees ? `\n参会人员：${item.attendees}` : ""}${item.note ? `\n备忘：${item.note}` : ""}`;
                if (noteText.trim() && noteText.trim() !== draft) {
                    const ok = await confirmDialog({
                        title: text("topicsConvertConfirmTitle", "替换互动备注草稿"),
                        message: "当前已有未记录的互动备注草稿，转为交往记录将替换当前草稿。确定继续吗？",
                        confirmLabel: text("topicsConvertConfirmBtn", "确认替换"),
                        cancelLabel: text("topicsConvertCancelBtn", "取消"),
                    });
                    if (!ok) return;
                }
                noteText = draft;
            }}
            {i18n}
        />
    {/if}

    {#if onLoadScratchpads && onSaveScratchpad && onUpdateScratchpad && onRemoveScratchpad && !current.isSelf}
        <PersonScratchpad
            personDocId={current.docId}
            items={scratchpads}
            onSave={async (item) => {
                const res = await onSaveScratchpad!(item);
                scratchpads = res;
            }}
            onUpdate={async (noteId, patch) => {
                const res = await onUpdateScratchpad!(current.docId, noteId, patch);
                scratchpads = res;
            }}
            onRemove={async (noteId) => {
                const res = await onRemoveScratchpad!(current.docId, noteId);
                scratchpads = res;
            }}
            onConvertToInteraction={async (content) => {
                if (noteText.trim() && noteText.trim() !== content) {
                    const ok = await confirmDialog({
                        title: text("topicsConvertConfirmTitle", "替换互动备注草稿"),
                        message: "当前已有未记录的互动备注草稿，转为互动记录将替换当前草稿。确定继续吗？",
                        confirmLabel: text("topicsConvertConfirmBtn", "确认替换"),
                        cancelLabel: text("topicsConvertCancelBtn", "取消"),
                    });
                    if (!ok) return;
                }
                noteText = content;
            }}
            {i18n}
        />
    {/if}

    {#if topicsSupported}
        <section class="lvct-detail__section lvct-detail__topics-section" aria-labelledby="lvct-topics-title">
            <div class="lvct-detail__section-head" role="button" tabindex="0" onclick={() => toggleSection("topics")} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection("topics"); } }} style="cursor: pointer; user-select: none;">
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    {#if isSectionCollapsed("topics")}
                        <ChevronRight size={14} />
                    {:else}
                        <ChevronDown size={14} />
                    {/if}
                    <h4 id="lvct-topics-title" style="margin: 0;">{text("topicsTitle", "会面谈资与备忘")}</h4>
                    <span class="lvct-chip lvct-chip--neutral" style="font-size: 11px; padding: 1px 6px;">{topics.length}</span>
                </div>
                {#if topicsLoading}
                    <span class="ft__smaller ft__on-surface">{text("topicsLoading", "读取中…")}</span>
                {/if}
            </div>
            {#if !isSectionCollapsed("topics")}
                <p class="ft__smaller ft__on-surface" style="margin: 4px 0 6px 0;">{text("topicsDesc", "记录下次见面想聊的话题、承诺的事情或兴趣关注；导出简报时自动置顶。")}</p>
                {#if topicsError}
                    <p class="ft__smaller lvct-text-danger" role="alert">{topicsError} <button type="button" class="b3-button b3-button--text" onclick={loadTopics}>{text("topicsRetry", "重试")}</button></p>
                {/if}
                <div class="lvct-detail__topics-input-row">
                    <input
                        class="b3-text-field fn__flex-1"
                        type="text"
                        placeholder={text("topicsPlaceholder", "添加一条下次见面想聊的话题或备忘…")}
                        aria-label={text("topicsAddAria", "新增谈资备忘")}
                        bind:value={newTopicText}
                        disabled={addingTopic || topicsLoading}
                        onkeydown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleAddTopic(); } }}
                    />
                    <button
                        type="button"
                        class="b3-button b3-button--outline"
                        disabled={addingTopic || topicsLoading || !newTopicText.trim()}
                        onclick={handleAddTopic}
                    >{addingTopic ? text("topicsAdding", "添加中…") : text("topicsAddBtn", "添加备忘")}</button>
                </div>
                {#if topics.length === 0}
                    <p class="ft__smaller ft__on-surface lvct-detail__topics-empty">{text("topicsEmpty", "暂无谈资备忘。随手记下一两件想聊的事，会前不慌张。")}</p>
                {:else}
                    <ul class="lvct-detail__topics-list" aria-label={text("topicsListAria", "会面谈资备忘列表")}>
                        {#each topics as topic (topic.id)}
                            <li class="lvct-detail__topic-item">
                                <span class="lvct-detail__topic-text" style="display: inline-flex; align-items: center;"><Pin size={12} class="lvct-icon-inline" /> {topic.text}</span>
                                <span class="lvct-detail__topic-actions">
                                    <button
                                        type="button"
                                        class="b3-button b3-button--text"
                                        aria-label={text("topicsCopyAria", "复制话题内容")}
                                        onclick={() => void handleCopyTopic(topic)}
                                    >{copiedTopicId === topic.id ? text("topicsCopied", "已复制 ✓") : text("topicsCopy", "复制")}</button>
                                    <button
                                        type="button"
                                        class="b3-button b3-button--text"
                                        aria-label={text("topicsConvertAria", "将谈资转为互动备注")}
                                        onclick={() => void handleConvertToInteraction(topic)}
                                    >{pendingConvertedTopicId === topic.id ? text("topicsConverted", "已转入草稿") : text("topicsConvertBtn", "转互动")}</button>
                                    <button
                                        type="button"
                                        class="b3-button b3-button--cancel"
                                        aria-label={text("topicsRemoveAria", "移除话题")}
                                        disabled={Boolean(busyTopicId)}
                                        onclick={() => void handleRemoveTopic(topic.id)}
                                    >×</button>
                                </span>
                            </li>
                        {/each}
                    </ul>
                {/if}
            {/if}
        </section>
    {/if}

    {#if giftIdeasSupported}
        <section class="lvct-detail__section lvct-detail__gifts-section" aria-labelledby="lvct-gifts-title">
            <div class="lvct-detail__section-head" role="button" tabindex="0" onclick={() => toggleSection("gifts")} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection("gifts"); } }} style="cursor: pointer; user-select: none;">
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    {#if isSectionCollapsed("gifts")}
                        <ChevronRight size={14} />
                    {:else}
                        <ChevronDown size={14} />
                    {/if}
                    <h4 id="lvct-gifts-title" style="margin: 0;">{text("giftsTitle", "礼物点子与偏好")}</h4>
                    <span class="lvct-chip lvct-chip--neutral" style="font-size: 11px; padding: 1px 6px;">{giftIdeas.length}</span>
                </div>
                {#if giftIdeasLoading}
                    <span class="ft__smaller ft__on-surface">{text("giftsLoading", "读取中…")}</span>
                {/if}
            </div>
            {#if !isSectionCollapsed("gifts")}
                <p class="ft__smaller ft__on-surface" style="margin: 4px 0 6px 0;">{text("giftsDesc", "记录送礼想法与喜好偏好；送出后可一键转为往来账本，未送前不计入账目。")}</p>
                {#if giftIdeasError}
                    <p class="ft__smaller lvct-text-danger" role="alert">{giftIdeasError} <button type="button" class="b3-button b3-button--text" onclick={loadGiftIdeas}>{text("giftsRetry", "重试")}</button></p>
                {/if}
                <div class="lvct-detail__topics-input-row">
                    <select class="b3-select" bind:value={newGiftType} aria-label={text("giftsTypeAria", "点子类型")}>
                        <option value="idea">{text("giftsTypeIdea", "送礼点子")}</option>
                        <option value="preference">{text("giftsTypePref", "喜好偏好")}</option>
                    </select>
                    <input
                        class="b3-text-field fn__flex-1"
                        type="text"
                        placeholder={newGiftType === "idea" ? text("giftsPlaceholderIdea", "礼物名称，如：思源定制手账本") : text("giftsPlaceholderPref", "喜好偏好，如：喜欢黑咖啡无糖")}
                        aria-label={text("giftsTitleAria", "礼物或偏好名称")}
                        bind:value={newGiftTitle}
                        disabled={addingGift || giftIdeasLoading}
                        onkeydown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleAddGiftIdea(); } }}
                    />
                    {#if newGiftType === "idea"}
                        <input
                            class="b3-text-field"
                            style="width: 80px;"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={text("giftsPricePlaceholder", "预算￥")}
                            aria-label={text("giftsPriceAria", "预估预算")}
                            bind:value={newGiftPrice}
                            disabled={addingGift || giftIdeasLoading}
                        />
                    {/if}
                    <button
                        type="button"
                        class="b3-button b3-button--outline"
                        disabled={addingGift || giftIdeasLoading || !newGiftTitle.trim()}
                        onclick={handleAddGiftIdea}
                    >{addingGift ? text("giftsAdding", "添加中…") : text("giftsAddBtn", "添加")}</button>
                </div>
                {#if giftIdeas.length === 0}
                    <p class="ft__smaller ft__on-surface lvct-detail__topics-empty">{text("giftsEmpty", "暂无送礼点子或喜好偏好。记录下来，重要时刻不再为选礼物发愁。")}</p>
                {:else}
                    <ul class="lvct-detail__topics-list" aria-label={text("giftsListAria", "礼物点子与偏好列表")}>
                        {#each giftIdeas as idea (idea.id)}
                            <li class="lvct-detail__topic-item">
                                <span class="lvct-detail__topic-text">
                                    <span class={`lvct-chip ${idea.type === "idea" ? "lvct-bucket--soon" : "lvct-bucket--today"}`}>
                                        {idea.type === "idea" ? text("giftsBadgeIdea", "点子") : text("giftsBadgePref", "偏好")}
                                    </span>
                                    {idea.title}
                                    {#if idea.priceEstimate}
                                        <span class="ft__smaller ft__on-surface">（￥{idea.priceEstimate}）</span>
                                    {/if}
                                    {#if idea.targetOccasion}
                                        <span class="ft__smaller ft__on-surface">· {idea.targetOccasion}</span>
                                    {/if}
                                </span>
                                <span class="lvct-detail__topic-actions">
                                    {#if idea.type === "idea"}
                                        <button
                                            type="button"
                                            class="b3-button b3-button--text"
                                            disabled={Boolean(busyGiftId)}
                                            onclick={() => void handleToggleGiftStatus(idea)}
                                            title={idea.status === "given" ? text("giftsStatusGivenHint", "已送出并同步至互动时间线，点击可流转") : text("giftsStatusAria", "点击切换送礼状态")}
                                        >
                                            {idea.status === "idea" ? text("giftsStatusIdea", "构思中")
                                            : idea.status === "purchased" ? text("giftsStatusPurchased", "已采购待送")
                                            : text("giftsStatusGiven", "已送出 ✓")}
                                        </button>
                                        {#if idea.status === "given" && onCreateExchange}
                                            <button
                                                type="button"
                                                class="b3-button b3-button--outline"
                                                disabled={Boolean(busyGiftId) || convertedGiftIds.includes(idea.id)}
                                                onclick={() => void handleConvertGiftToExchange(idea)}
                                            >{convertedGiftIds.includes(idea.id) ? text("giftsConvertedToExchange", "已入账") : text("giftsConvertToExchange", "转入账本")}</button>
                                        {/if}
                                    {/if}
                                    <button
                                        type="button"
                                        class="b3-button b3-button--cancel"
                                        aria-label={text("giftsRemoveAria", "删除")}
                                        disabled={Boolean(busyGiftId)}
                                        onclick={() => void handleRemoveGiftIdea(idea.id)}
                                    >×</button>
                                </span>
                            </li>
                        {/each}
                    </ul>
                {/if}
            {/if}
        </section>
    {/if}

    {#if anniversariesSupported}
        <section class="lvct-detail__section lvct-detail__anniversaries">
            <div class="lvct-detail__section-head" role="button" tabindex="0" onclick={() => toggleSection("anniversaries")} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection("anniversaries"); } }} style="cursor: pointer; user-select: none;">
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    {#if isSectionCollapsed("anniversaries")}
                        <ChevronRight size={14} />
                    {:else}
                        <ChevronDown size={14} />
                    {/if}
                    <h4 style="margin: 0;">重要日期与纪念日</h4>
                    <span class="lvct-chip lvct-chip--neutral" style="font-size: 11px; padding: 1px 6px;">{anniversaries.length}</span>
                </div>
                {#if onExportAnniversariesIcs && (current.birthday || anniversaries.length > 0)}
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small"
                        style="margin-left: auto;"
                        title={text("exportIcsTip", "导出为 iCalendar (.ics) 标准日历文件，支持导入系统日历")}
                        onclick={(e) => { e.stopPropagation(); handleExportIcs(); }}
                    >
                        <Calendar size={13} style="margin-right: 2px;" />
                        <span>{text("exportIcsBtn", "导出 .ics 日历")}</span>
                    </button>
                {/if}
                {#if anniversariesLoading}
                    <span class="ft__smaller ft__on-surface">读取中…</span>
                {/if}
            </div>
            {#if !isSectionCollapsed("anniversaries")}
                <p class="ft__smaller ft__on-surface" style="margin: 4px 0 6px 0;">登记结婚、相识、入职等周年纪念，到期自动提醒。</p>
                {#if anniversariesError}
                    <p class="ft__smaller lvct-text-danger" role="alert">{anniversariesError} <button type="button" class="b3-button b3-button--text" onclick={loadAnniversaries}>重试</button></p>
                {/if}
                <div class="lvct-detail__anniv-form fn__flex" style="flex-wrap: wrap; gap: 6px; margin: 6px 0;">
                    <input
                        class="b3-text-field fn__flex-1"
                        type="text"
                        aria-label="纪念日名称"
                        placeholder="纪念日名称（如：结婚十周年、相识纪念）"
                        bind:value={newAnnivTitle}
                        disabled={addingAnniv || anniversariesLoading}
                        onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddAnniversary(); } }}
                    />
                    <select class="b3-select" aria-label="纪念日分类" bind:value={newAnnivCategory} disabled={addingAnniv || anniversariesLoading}>
                        {#each ANNIVERSARY_CATEGORIES as cat}
                            <option value={cat}>{ANNIVERSARY_CATEGORY_LABELS[cat].icon} {ANNIVERSARY_CATEGORY_LABELS[cat].label}</option>
                        {/each}
                    </select>
                    <input
                        class="b3-text-field"
                        type="date"
                        aria-label="纪念日日期"
                        style="width: 140px;"
                        bind:value={newAnnivDate}
                        disabled={addingAnniv || anniversariesLoading}
                    />
                    <label class="b3-label" style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                        <input type="checkbox" bind:checked={newAnnivLunar} disabled={addingAnniv || anniversariesLoading} />
                        <span class="ft__smaller">农历</span>
                    </label>
                    <button
                        type="button"
                        class="b3-button b3-button--outline"
                        disabled={addingAnniv || anniversariesLoading || !newAnnivTitle.trim()}
                        onclick={handleAddAnniversary}
                    >添加纪念日</button>
                </div>
                {#if anniversaries.length === 0}
                    <p class="ft__smaller ft__on-surface">暂未登记特殊纪念日。</p>
                {:else}
                    <ul class="lvct-detail__topic-list">
                        {#each anniversaries as anniv (anniv.id)}
                            {@const proj = nextAnniversary(anniv)}
                            <li class="lvct-detail__topic-item">
                                <span class="lvct-detail__topic-text">
                                    <span class="lvct-chip lvct-bucket--soon">
                                        {ANNIVERSARY_CATEGORY_LABELS[anniv.category]?.icon ?? "📅"} {ANNIVERSARY_CATEGORY_LABELS[anniv.category]?.label ?? "纪念日"}
                                    </span>
                                    <b>{anniv.title}</b> · {anniv.date}{anniv.isLunar ? "（农历）" : ""}
                                    {#if proj}
                                        <span class="ft__smaller ft__on-surface">
                                            · 还有 {proj.daysUntil} 天（{proj.displayDate}
                                            {#if proj.yearsCount}，第 {proj.yearsCount} 周年{/if}）
                                        </span>
                                    {/if}
                                </span>
                                <span class="lvct-detail__topic-actions">
                                    {#if onUpdateAnniversary}
                                        <button
                                            type="button"
                                            class="b3-button b3-button--text b3-button--small"
                                            style="font-size: 11px; padding: 1px 6px;"
                                            title={anniv.remindDisabled ? "当前已设置为不再提醒，点击恢复提醒" : "点击设置为不再提醒（免打扰）"}
                                            disabled={Boolean(busyAnnivId)}
                                            onclick={() => void handleToggleAnnivRemind(anniv)}
                                        >
                                            {#if anniv.remindDisabled}
                                                <span class="lvct-text-muted" style="display: inline-flex; align-items: center;"><BellOff size={12} class="lvct-icon-inline" /> 🔕 不再提醒</span>
                                            {:else}
                                                <span style="display: inline-flex; align-items: center;"><Bell size={12} class="lvct-icon-inline" /> 🔔 提醒中</span>
                                            {/if}
                                        </button>
                                    {/if}
                                    <button
                                        type="button"
                                        class="b3-button b3-button--cancel"
                                        aria-label="删除纪念日"
                                        disabled={Boolean(busyAnnivId)}
                                        onclick={() => void handleRemoveAnniversary(anniv.id)}
                                    >×</button>
                                </span>
                            </li>
                        {/each}
                    </ul>
                {/if}
            {/if}
        </section>
    {/if}

    {#if projectsSupported}
        <section class="lvct-detail__section lvct-detail__projects">
            <div class="lvct-detail__section-head" role="button" tabindex="0" onclick={() => toggleSection("projects")} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection("projects"); } }} style="cursor: pointer; user-select: none;">
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    {#if isSectionCollapsed("projects")}
                        <ChevronRight size={14} />
                    {:else}
                        <ChevronDown size={14} />
                    {/if}
                    <h4 style="margin: 0;">协作项目与主题</h4>
                    <span class="lvct-chip lvct-chip--neutral" style="font-size: 11px; padding: 1px 6px;">{projects.length}</span>
                </div>
                {#if projectsLoading}
                    <span class="ft__smaller ft__on-surface">读取中…</span>
                {/if}
            </div>
            {#if !isSectionCollapsed("projects")}
                <p class="ft__smaller ft__on-surface" style="margin: 4px 0 6px 0;">记录共同协作的思源项目、主题讨论与角色分工。</p>
                {#if projectsError}
                    <p class="ft__smaller lvct-text-danger" role="alert">{projectsError} <button type="button" class="b3-button b3-button--text" onclick={loadProjects}>重试</button></p>
                {/if}
                <div class="lvct-detail__anniv-form fn__flex" style="flex-wrap: wrap; gap: 6px; margin: 6px 0;">
                    <input
                        class="b3-text-field fn__flex-1"
                        type="text"
                        aria-label="项目或主题名称"
                        placeholder="项目或主题名称（如：Q4 战略复盘、开源人脉）"
                        bind:value={newProjTitle}
                        disabled={addingProj || projectsLoading}
                        onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddProject(); } }}
                    />
                    <input
                        class="b3-text-field"
                        type="text"
                        style="width: 130px;"
                        aria-label="项目角色分工（可选）"
                        placeholder="角色分工（可选）"
                        bind:value={newProjRole}
                        disabled={addingProj || projectsLoading}
                    />
                    <input
                        class="b3-text-field"
                        type="text"
                        style="width: 170px;"
                        aria-label="关联文档 ID（可选）"
                        placeholder="关联文档 ID（可选）"
                        bind:value={newProjDocId}
                        disabled={addingProj || projectsLoading}
                    />
                    <button
                        type="button"
                        class="b3-button b3-button--outline"
                        disabled={addingProj || projectsLoading || !newProjTitle.trim()}
                        onclick={handleAddProject}
                    >添加项目</button>
                </div>
                {#if projects.length === 0}
                    <p class="ft__smaller ft__on-surface">暂未关联协作项目。</p>
                {:else}
                    <ul class="lvct-detail__topic-list">
                        {#each projects as proj (proj.id)}
                            <li class="lvct-detail__topic-item lvct-detail__project-item">
                                <span class="lvct-detail__topic-text">
                                    <button
                                        type="button"
                                        class="lvct-chip lvct-detail__project-status-btn {getProjectStatusMeta(proj.status).className}"
                                        disabled={Boolean(busyProjectId)}
                                        onclick={() => void handleToggleProjectStatus(proj)}
                                        title={text("toggleProjectStatusTip", "点击切换项目协作状态：进行中 ➔ 已结项 ➔ 已归档")}
                                    >
                                        {getProjectStatusMeta(proj.status).icon} {getProjectStatusMeta(proj.status).label}
                                    </button>
                                    <span class="lvct-chip lvct-chip--neutral font-size-11" style="display: inline-flex; align-items: center;">
                                        <FolderGit2 size={12} class="lvct-icon-inline" /> {proj.role || text("projectRoleDefault", "协同成员")}
                                    </span>
                                    <b>{proj.title}</b>
                                    {#if proj.docId}
                                        <button
                                            type="button"
                                            class="b3-button b3-button--text ft__smaller"
                                            style="padding: 0 4px; margin-left: 4px;"
                                            onclick={() => onOpenPersonDoc(proj.docId!)}
                                        >打开项目文档 ↗</button>
                                    {/if}
                                </span>
                                <span class="lvct-detail__topic-actions">
                                    <button
                                        type="button"
                                        class="b3-button b3-button--cancel"
                                        aria-label="删除项目关联"
                                        disabled={Boolean(busyProjectId)}
                                        onclick={() => void handleRemoveProject(proj.id)}
                                    >×</button>
                                </span>
                            </li>
                        {/each}
                    </ul>
                {/if}
            {/if}
        </section>
    {/if}

    {#if onLoadPersonFields && onSavePersonFields}
        <PersonFieldsEditor personDocId={current.docId} {revision} onLoad={onLoadPersonFields} onSave={onSavePersonFields} onOpenDocument={onOpenPersonDoc ? () => onOpenPersonDoc?.(current.docId) : undefined} />
    {/if}

    <div class="lvct-detail__briefing-row">
        <button class="b3-button b3-button--outline" onclick={openBriefingExport}>导出会面简报</button>
        <span class="ft__smaller ft__on-surface">Markdown：资料 · 最近互动 · 未完成跟进 · 重要日期 · 相关人物 · 共同出席</span>
    </div>

            {#if onLoadExchanges && onCreateExchange && onChangeExchangeStatus}
                <ExchangeLedger
                    personDocId={current.docId}
                    reloadKey={exchangeReloadKey}
                    {i18n}
                    onLoad={onLoadExchanges}
                    onCreate={onCreateExchange}
                    onChangeStatus={onChangeExchangeStatus}
                    onChanged={() => { onChanged(); if (onSyncDocProfile) void onSyncDocProfile(current).catch(() => {}); }}
                />
            {/if}
            {#if onLoadAliases && onAddAlias && onRemoveAlias}
                <PersonAliases
                    personDocId={current.docId}
                    {i18n}
                    onLoad={onLoadAliases}
                    onAdd={onAddAlias}
                    onRemove={onRemoveAlias}
                    {onChanged}
                />
            {/if}
    </details>
    </section>
    {:else if activeTab === "activity"}

    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -- tabpanel semantics are required for the tablist contract. -->
    <section id="lvct-detail-panel-activity" role="tabpanel" aria-labelledby="lvct-detail-tab-activity" tabindex="0">

    <section class="lvct-detail__section">
        <div class="lvct-detail__section-head" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <h4 style="margin: 0;">互动与共同出席{insights ? `（共 ${insights.totalEvents} 条）` : ""}</h4>
            {#if filteredTimeline.length > 0}
                <button
                    type="button"
                    class="b3-button b3-button--text b3-button--small lvct-detail__copy-timeline-btn"
                    style="display: inline-flex; align-items: center; gap: 4px;"
                    title="将当前联系人的互动往来记录格式化为 Markdown 列表复制到剪贴板"
                    onclick={copyTimelineMarkdown}
                >
                    {#if timelineCopied}
                        <Check size={12} class="lvct-text-success" />
                        <span class="lvct-text-success">已复制往来记录 ✓</span>
                    {:else}
                        <Copy size={12} />
                        <span>复制往来记录</span>
                    {/if}
                </button>
            {/if}
        </div>
        {#if historyToday.length > 0}
            <div class="lvct-detail__history" role="region" aria-label="历史上的今天">
                <b><CalendarDays size={14} aria-hidden="true" /> 历史上的今天</b>
                {#each historyToday as item (item.eventId)}
                    <div class="lvct-detail__timeline-row">
                        <span class="ft__on-surface">{item.localDate}</span>
                        <span class="lvct-detail__timeline-note">{item.note || "互动"}</span>
                    </div>
                {/each}
            </div>
        {/if}

        <div class="lvct-detail__activity-subnav fn__flex" style="gap: 6px; margin-bottom: 12px;">
            <button
                type="button"
                class="b3-button b3-button--small {activitySubTab === 'log' ? 'b3-button--primary' : 'b3-button--outline'}"
                onclick={() => activitySubTab = "log"}
            >
                <Clock size={13} style="margin-right: 4px;" />
                {text("activitySubTabLog", "往来明细流水")}
            </button>
            <button
                type="button"
                class="b3-button b3-button--small {activitySubTab === 'milestones' ? 'b3-button--primary' : 'b3-button--outline'}"
                onclick={() => activitySubTab = "milestones"}
            >
                <Flag size={13} style="margin-right: 4px;" />
                {text("activitySubTabMilestones", "历程编年史长卷")} ({contactMilestones.length})
            </button>
        </div>

        {#if activitySubTab === "milestones"}
            <PersonMilestonesTimeline
                person={current}
                milestones={contactMilestones}
                onCreateDoc={onCreateMilestonesDoc ? (p, m) => onCreateMilestonesDoc!(p, m) : undefined}
                onOpenDoc={onOpenPersonDoc}
                {i18n}
            />
        {:else}
        {@const trend12m = computeMonthlyInteractionTrend(insights?.timeline ? insights.timeline.map((t) => ({ id: t.eventId, personDocId: current.docId, occurredAt: t.occurredAt ?? (t.localDate ? new Date(t.localDate).getTime() : 0), localDate: t.localDate, source: t.source as any, note: t.note })) : [], 12)}
        <div class="lvct-twenty-activity-header">
            <div class="lvct-twenty-activity-stats">
                <span class="lvct-twenty-activity-title">📈 近一年互动分布 ({trend12m.totalCount} 次)</span>
                <span class="lvct-twenty-activity-freq">月峰值: {trend12m.maxCount} 次</span>
            </div>
            <div class="lvct-twenty-activity-spark">
                {#each trend12m.months as month}
                    {@const heightPercent = trend12m.maxCount > 0 ? Math.max(10, Math.round((month.count / trend12m.maxCount) * 100)) : 10}
                    <div class="lvct-twenty-spark-bar-wrap" title={`${month.monthKey}：${month.count}次互动`}>
                        <div class="lvct-twenty-spark-bar" style={`height: ${heightPercent}%;`} class:lvct-twenty-spark-bar--active={month.count > 0}></div>
                        <span class="lvct-twenty-spark-label">{month.label}</span>
                    </div>
                {/each}
            </div>
        </div>

        <div class="lvct-detail__activity-filters">
            <input class="b3-text-field" type="search" aria-label="搜索互动备注或日期" placeholder="搜索备注或日期" bind:value={activitySearch} oninput={() => (activityLimit = 20)} />
            <select class="b3-select" aria-label="互动来源" bind:value={activitySource} onchange={() => (activityLimit = 20)}>
                <option value="">全部来源</option>
                <option value="manual">手动记录</option>
                <option value="diary">笔记捕获</option>
                <option value="api">外部联动</option>
            </select>
        </div>
        <div class="lvct-detail__activity-filters" aria-label="日期范围">
            <input type="date" class="b3-text-field" aria-label="互动开始日期" bind:value={activityFrom} onchange={() => (activityLimit = 20)} />
            <span class="ft__on-surface">~</span>
            <input type="date" class="b3-text-field" aria-label="互动结束日期" bind:value={activityTo} onchange={() => (activityLimit = 20)} />
            <button type="button" class="b3-button b3-button--outline" onclick={() => setQuickRange(30)}>最近 30 天</button>
            <button type="button" class="b3-button b3-button--outline" onclick={() => setQuickRange(90)}>最近 90 天</button>
            {#if activityFrom || activityTo || activityType !== "all"}
                <button type="button" class="b3-button b3-button--text" onclick={clearDateRange}>清除筛选</button>
            {/if}
        </div>
        <div class="lvct-detail__type-filters" role="tablist" aria-label="按互动类型筛选" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
            <button
                type="button"
                role="tab"
                class="b3-chip font-size-11"
                class:b3-chip--primary={activityType === "all"}
                aria-selected={activityType === "all"}
                onclick={() => { activityType = "all"; activityLimit = 20; }}
            >全部</button>
            {#each INTERACTION_TYPES as itype}
                <button
                    type="button"
                    role="tab"
                    class="b3-chip font-size-11"
                    class:b3-chip--primary={activityType === itype}
                    aria-selected={activityType === itype}
                    onclick={() => { activityType = itype; activityLimit = 20; }}
                >
                    {INTERACTION_TYPE_LABELS[itype].icon} {INTERACTION_TYPE_LABELS[itype].label}
                </button>
            {/each}
        </div>
        {#if insights && insights.coAttendance.length > 0}
            <div class="lvct-strip__chips" style="margin-bottom: 6px;">
                {#each insights.coAttendance.slice(0, 5) as item (item.otherDocId)}
                    <span class="lvct-chip lvct-chip--group" style="font-variant-numeric: tabular-nums;">与 {item.name || text("unknownPerson", "未知联系人")} 同场 {item.count} 次</span>
                {/each}
            </div>
        {/if}
        {#if insightsLoading}
            <ViewState compact loading title="正在加载互动记录" />
        {:else if insightsError}
            <ViewState compact error title="互动记录加载失败" description={insightsError}>
                <button class="b3-button b3-button--outline" onclick={loadInsights}>{text("commonRetry", "重试")}</button>
            </ViewState>
        {:else if filteredTimeline.length > 0}
            <div class="lvct-detail__timeline">
                {#each monthGroups as group (group.month)}
                    <div class="lvct-detail__month-head">{group.label}（{group.items.length}）</div>
                    {#each group.items as item (item.eventId)}
                        <div class="lvct-detail__timeline-row lvct-bubble-row">
                            <div class="lvct-bubble-badge" title={INTERACTION_TYPE_LABELS[item.type]?.label ?? "互动"}>
                                <span>{INTERACTION_TYPE_LABELS[item.type]?.icon ?? "💬"}</span>
                            </div>
                            <div class="lvct-bubble-box">
                                <div class="lvct-bubble-header">
                                    <span class="ft__on-surface lvct-bubble-date">{item.localDate}</span>
                                    <span class="lvct-chip lvct-chip--type" style="padding: 1px 6px; font-size: 11px;">
                                        {INTERACTION_TYPE_LABELS[item.type]?.icon ?? "📝"} {INTERACTION_TYPE_LABELS[item.type]?.label ?? "其他"}
                                    </span>
                                    <span class="lvct-detail__timeline-source">{sourceLabels[item.source]}</span>
                                    {#if item.groupSize > 1}<span class="lvct-chip font-size-11">{item.groupSize} 人同场</span>{/if}
                                    <div class="lvct-bubble-actions">
                                        {#if item.externalRef?.startsWith("block:")}
                                            {@const refBlockId = item.externalRef.slice(6)}
                                            <button
                                                type="button"
                                                class="b3-button b3-button--text b3-button--small lvct-detail__timeline-source-link"
                                                style="padding: 1px 4px; font-size: 11px; display: inline-flex; align-items: center; gap: 2px;"
                                                title="点击复制块定位链接 (siyuan://blocks/...)，按住 Ctrl 点击可直接在思源中打开定位该块"
                                                onclick={(e) => copyBlockUri(refBlockId, e)}
                                            >
                                                {#if copiedBlockUriId === refBlockId}
                                                    <Check size={11} strokeWidth={1.6} class="lvct-text-success" />
                                                    <span class="lvct-text-success">已复制</span>
                                                {:else}
                                                    <Link size={11} strokeWidth={1.6} />
                                                    <span>原文</span>
                                                {/if}
                                            </button>
                                        {/if}
                                        {#if onAmendInteraction}
                                            <button class="b3-button b3-button--text b3-button--small" title="修改这条互动" aria-label={`修改 ${item.localDate} 的互动`} disabled={busy || editingTimeline?.eventId === item.eventId} onclick={() => startEditTimelineItem(item)}>编辑</button>
                                        {/if}
                                        {#if onDeleteInteraction}
                                            <button class="b3-button b3-button--text b3-button--small" title="删除这条互动" aria-label={`删除 ${item.localDate} 的互动`} disabled={busy} onclick={() => deleteTimelineItem(item.eventId)}>删除</button>
                                        {/if}
                                    </div>
                                </div>
                                {#if editingTimeline && editingTimeline.eventId === item.eventId}
                                    <form class="lvct-detail__timeline-edit" onsubmit={(event) => { event.preventDefault(); void commitEditTimelineItem(); }}>
                                        <div class="lvct-detail__timeline-edit-row">
                                            <input class="b3-text-field" type="date" required bind:value={editingTimeline.date} aria-label="互动日期" max={toLocalDateKey(new Date())} />
                                            <select class="b3-select" bind:value={editingTimeline.type} aria-label="互动类型">
                                                {#each INTERACTION_TYPES as itype}
                                                    <option value={itype}>{INTERACTION_TYPE_LABELS[itype].icon} {INTERACTION_TYPE_LABELS[itype].label}</option>
                                                {/each}
                                            </select>
                                        </div>
                                        <textarea
                                            class="b3-text-field"
                                            rows="3"
                                            bind:value={editingTimeline.note}
                                            aria-label="互动内容"
                                            aria-invalid={timelineEditError ? "true" : undefined}
                                            aria-describedby={timelineEditError ? `lvct-timeline-edit-error-${item.eventId}` : undefined}
                                            onkeydown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void commitEditTimelineItem(); } else if (event.key === "Escape") { event.stopPropagation(); editingTimeline = null; } }}
                                        ></textarea>
                                        {#if timelineEditError}
                                            <div class="lvct-detail__timeline-edit-error" id={`lvct-timeline-edit-error-${item.eventId}`} role="alert">{timelineEditError}</div>
                                        {/if}
                                        <div class="lvct-detail__timeline-edit-actions">
                                            <button type="button" class="b3-button b3-button--text b3-button--small" disabled={busy} onclick={() => { editingTimeline = null; timelineEditError = ""; }}>取消</button>
                                            <button type="submit" class="b3-button b3-button--small" disabled={busy}>{busy ? "保存中…" : "保存修改"}</button>
                                        </div>
                                    </form>
                                {:else}
                                <div class="lvct-detail__timeline-note lvct-bubble-note">
                                    {item.note || "互动"}
                                </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/each}
            </div>
            <div class="lvct-detail__activity-more">
                <span class="ft__smaller ft__on-surface">显示 {Math.min(activityLimit, filteredTimeline.length)} / {filteredTimeline.length} 条</span>
                {#if activityLimit < filteredTimeline.length}
                    <button class="b3-button b3-button--outline" onclick={() => (activityLimit += 20)}>加载更多</button>
                {/if}
            </div>
        {:else if insights && insights.timeline.length > 0}
            <ViewState compact title="没有匹配的互动">
                <button class="b3-button b3-button--outline" onclick={() => { activitySearch = ""; activitySource = ""; activityFrom = ""; activityTo = ""; activityLimit = 20; }}>清除筛选</button>
            </ViewState>
        {:else}
            <ViewState compact title="还没有互动记录" description="从一次聊天或见面开始，记录你们的往来。">
                <button class="b3-button b3-button--text" onclick={() => void selectTab("overview")}>去记一笔</button>
            </ViewState>
        {/if}
        {/if}

        <!-- Issue #87：笔记与日志反向链接（Backlinks / 提及）视窗 -->
        {#if insights && insights.backlinks && insights.backlinks.length > 0}
            {@const unconvertedCount = insights.backlinks.filter((item) => !allConvertedBlockIds.has(item.blockId)).length}
            <div class="lvct-detail__section" style="margin-top: 14px; border-top: 1px dashed var(--b3-theme-surface-lighter); padding-top: 12px;">
                <div class="lvct-detail__section-head" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div
                        role="button"
                        tabindex="0"
                        style="cursor: pointer; display: flex; align-items: center; gap: 6px; user-select: none;"
                        onclick={() => (backlinksCollapsed = !backlinksCollapsed)}
                        onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); backlinksCollapsed = !backlinksCollapsed; } }}
                    >
                        {#if backlinksCollapsed}
                            <ChevronRight size={14} />
                        {:else}
                            <ChevronDown size={14} />
                        {/if}
                        <h4 style="margin: 0; display: inline-flex; align-items: center;"><Link2 size={15} class="lvct-icon-inline" /> 🔗 笔记与日志反链（{insights.backlinks.length}）</h4>
                        {#if unconvertedCount > 0}
                            <span class="lvct-chip lvct-bucket--today" style="font-size: 10px; padding: 1px 6px;">{unconvertedCount} 条待转入</span>
                        {:else}
                            <span class="lvct-chip lvct-chip--group font-size-10" style="padding: 1px 6px;">已全部转入 ✓</span>
                        {/if}
                    </div>
                    <div class="fn__flex" style="gap: 6px; align-items: center; flex-wrap: wrap;">
                        <button
                            type="button"
                            class="b3-button b3-button--text b3-button--small lvct-detail__backlinks-copy-summary"
                            style="display: inline-flex; align-items: center; gap: 4px;"
                            title="复制当前过滤后的全部笔记反链为 Markdown 文本"
                            onclick={copyBacklinkSummaryMarkdown}
                        >
                            {#if backlinkSummaryCopied}
                                <Check size={12} class="lvct-text-success" />
                                <span class="lvct-text-success">已复制反链摘要 ✓</span>
                            {:else}
                                <Copy size={12} />
                                <span>复制反链摘要</span>
                            {/if}
                        </button>
                        <button
                            type="button"
                            class="b3-button b3-button--text b3-button--small lvct-detail__backlinks-refresh-btn"
                            style="display: inline-flex; align-items: center; gap: 4px;"
                            title="重新扫描全库笔记中的双链与提及反链"
                            disabled={busy || insightsLoading}
                            onclick={() => void loadInsights()}
                        ><RefreshCw size={12} class={insightsLoading ? "fn__rotate" : ""} /> 刷新反链</button>
                        {#if !backlinksCollapsed && unconvertedCount > 0}
                            <button
                                type="button"
                                class="b3-button b3-button--outline b3-button--small lvct-detail__backlinks-convert-all"
                                style="display: inline-flex; align-items: center;"
                                disabled={busy || batchConverting}
                                onclick={convertAllBacklinks}
                            ><Zap size={12} class="lvct-icon-inline" /> ⚡ 全部转为互动（{unconvertedCount}）</button>
                        {/if}
                    </div>
                </div>
                {#if !backlinksCollapsed}
                    <div class="lvct-detail__activity-filters" style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                        <input
                            class="b3-text-field fn__flex-1 lvct-detail__backlinks-search"
                            type="search"
                            placeholder="搜索反链笔记标题、内容或日期…"
                            aria-label="搜索反链笔记标题、内容或日期"
                            bind:value={backlinkQuery}
                            style="min-width: 140px;"
                        />
                        <button
                            type="button"
                            class="b3-chip font-size-11"
                            class:b3-chip--primary={backlinkFilterKind === "all"}
                            onclick={() => (backlinkFilterKind = "all")}
                        >全部 ({insights.backlinks.length})</button>
                        <button
                            type="button"
                            class="b3-chip font-size-11"
                            class:b3-chip--primary={backlinkFilterKind === "link"}
                            onclick={() => (backlinkFilterKind = "link")}
                        >🔗 双链 ({insights.backlinks.filter((i) => i.kind === "link").length})</button>
                        <button
                            type="button"
                            class="b3-chip font-size-11"
                            class:b3-chip--primary={backlinkFilterKind === "mention"}
                            onclick={() => (backlinkFilterKind = "mention")}
                        >💡 提及 ({insights.backlinks.filter((i) => i.kind === "mention").length})</button>
                    </div>
                    <div class="lvct-detail__timeline">
                        {#if filteredBacklinks.length === 0}
                            <div class="lvct-detail__empty-notice" style="padding: 24px 16px; text-align: center; color: var(--b3-theme-on-surface); font-size: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
                                <FileText size={28} style="opacity: 0.35;" />
                                <span>没有匹配的反链记录。</span>
                                {#if backlinkQuery || backlinkFilterKind !== "all"}
                                    <button type="button" class="b3-button b3-button--text b3-button--small" onclick={() => { backlinkQuery = ""; backlinkFilterKind = "all"; }}>清除筛选</button>
                                {/if}
                            </div>
                        {/if}
                        {#each backlinkMonthGroups as group (group.month)}
                            <div class="lvct-detail__month-head" style="margin-top: 10px; margin-bottom: 6px;">
                                {group.label}（{group.items.length} 条反链）
                            </div>
                            {#each group.items as bItem (bItem.blockId)}
                                {@const timeInfo = bItem.timeInfo}
                                {@const inferredType = inferInteractionType(bItem.content)}
                                <div class="lvct-detail__timeline-row lvct-backlink-card">
                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                            <span class="ft__on-surface" style="font-weight: 600; display: inline-flex; align-items: center;" title={timeInfo.sourceKind === "diary_title" ? "根据日记标题识别发生日期" : "根据段落创建时间识别发生日期"}>
                                                <Calendar size={13} class="lvct-icon-inline" /> {timeInfo.localDate}
                                            </span>
                                            <span class="lvct-chip lvct-chip--group font-size-11" style="display: inline-flex; align-items: center;">
                                                <FileText size={12} class="lvct-icon-inline" /> {bItem.docTitle}
                                            </span>
                                            {#if bItem.kind === "link"}
                                                <span class="lvct-chip--link-pill"><Link2 size={11} class="lvct-icon-inline" /> 🔗 双链</span>
                                            {:else}
                                                <span class="lvct-chip--mention-pill"><Lightbulb size={11} class="lvct-icon-inline" /> 💡 提及</span>
                                            {/if}
                                            <span class="lvct-chip font-size-10" style="background: var(--b3-theme-surface-lighter); color: var(--b3-theme-on-surface);" title={`智能识别互动类型为 ${INTERACTION_TYPE_LABELS[inferredType]?.label ?? "其他"}`}>
                                                {INTERACTION_TYPE_LABELS[inferredType]?.icon ?? "📝"} {INTERACTION_TYPE_LABELS[inferredType]?.label ?? "互动"}
                                            </span>
                                        </div>
                                        <div class="fn__flex" style="gap: 4px; align-items: center;">
                                            <button
                                                type="button"
                                                class="b3-button b3-button--text b3-button--small"
                                                title="在思源中打开该日志文档"
                                                onclick={() => onOpenPersonDoc(bItem.rootId)}
                                            >打开原笔记</button>
                                            <button
                                                type="button"
                                                class="b3-button b3-button--text b3-button--small lvct-detail__copy-block-ref-btn"
                                                style="display: inline-flex; align-items: center; gap: 2px;"
                                                title="点击复制块引用深度定位链接，按住 Ctrl 点击可直接在思源中打开定位该块"
                                                onclick={(e) => copyBlockUri(bItem.blockId, e)}
                                            >
                                                {#if copiedBlockUriId === bItem.blockId}
                                                    <Check size={11} class="lvct-text-success" />
                                                    <span class="lvct-text-success">已复制链接 ✓</span>
                                                {:else}
                                                    <Link size={11} />
                                                    <span>复制块引</span>
                                                {/if}
                                            </button>
                                            {#if !allConvertedBlockIds.has(bItem.blockId)}
                                                <button
                                                    type="button"
                                                    class="b3-button b3-button--text b3-button--small lvct-detail__backlink-edit-btn"
                                                    title="微调发生日期、分类与备注后再转录"
                                                    disabled={busy}
                                                    onclick={() => startEditBacklink(bItem)}
                                                >{editingBacklink?.blockId === bItem.blockId ? "收起微调" : "微调转入"}</button>
                                            {/if}
                                            <button
                                                type="button"
                                                class="b3-button b3-button--outline b3-button--small"
                                                class:lvct-text-success={allConvertedBlockIds.has(bItem.blockId)}
                                                title={allConvertedBlockIds.has(bItem.blockId) ? "已转录为互动事件" : `按历史日期 ${timeInfo.localDate} 转录为正式互动事件`}
                                                disabled={busy || allConvertedBlockIds.has(bItem.blockId)}
                                                onclick={() => convertBacklinkToInteraction(bItem)}
                                            >{allConvertedBlockIds.has(bItem.blockId) ? "✓ 已转互动" : "⚡ 转为互动"}</button>
                                        </div>
                                    </div>
                                    <div class="lvct-detail__timeline-note" style="margin: 0; padding-left: 2px;">
                                        {bItem.content}
                                    </div>
                                    {#if editingBacklink && editingBacklink.blockId === bItem.blockId}
                                        <div class="lvct-detail__quick-form lvct-detail__backlink-edit-box" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 6px; padding: 8px; background: var(--b3-theme-surface); border-radius: 6px; border: 1px solid var(--b3-theme-surface-lighter);">
                                            <input
                                                class="b3-text-field"
                                                type="date"
                                                style="width: 135px;"
                                                bind:value={editingBacklink.date}
                                                aria-label="互动发生日期"
                                            />
                                            <select class="b3-select" bind:value={editingBacklink.type} aria-label="互动类型">
                                                {#each INTERACTION_TYPES as itype}
                                                    <option value={itype}>{INTERACTION_TYPE_LABELS[itype].icon} {INTERACTION_TYPE_LABELS[itype].label}</option>
                                                {/each}
                                            </select>
                                            <input
                                                class="b3-text-field fn__flex-1"
                                                type="text"
                                                placeholder="互动备注内容"
                                                bind:value={editingBacklink.note}
                                                aria-label="互动备注内容"
                                            />
                                            <button
                                                type="button"
                                                class="b3-button b3-button--small lvct-detail__backlink-commit-btn"
                                                disabled={busy || !editingBacklink.note.trim()}
                                                onclick={commitEditBacklink}
                                            >确认转入</button>
                                            <button
                                                type="button"
                                                class="b3-button b3-button--text b3-button--small"
                                                disabled={busy}
                                                onclick={() => (editingBacklink = null)}
                                            >取消</button>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </section>
    </section>
    {:else}

    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -- tabpanel semantics are required for the tablist contract. -->
    <section id="lvct-detail-panel-relations" role="tabpanel" aria-labelledby="lvct-detail-tab-relations" tabindex="0">
        <div class="fn__flex" style="align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h4 style="margin: 0;">相关人（{relatedPeople.length}）</h4>
            {#if relatedPeople.length > 0}
                <div class="fn__flex" style="gap: 4px;">
                    <button
                        type="button"
                        class="b3-chip font-size-11"
                        class:b3-chip--primary={relationViewMode === "radar"}
                        onclick={() => (relationViewMode = "radar")}
                    >📡 关系雷达</button>
                    <button
                        type="button"
                        class="b3-chip font-size-11"
                        class:b3-chip--primary={relationViewMode === "list"}
                        onclick={() => (relationViewMode = "list")}
                    >📋 清单</button>
                </div>
            {/if}
        </div>
        {#if othersLoading}
            <ViewState compact loading title="正在加载相关人" />
        {:else if othersError}
            <ViewState compact error title="相关人加载失败" description={othersError}>
                <button class="b3-button b3-button--outline" onclick={loadOthers}>重试</button>
            </ViewState>
        {:else if relatedPeople.length === 0}
            <ViewState compact title="还没有建立关系"
                description={candidates.length > 0 ? "选择一位联系人，建立你们之间的关系。" : "先在联系人页添加其他人物，再回来建立关系。"}>
                {#if candidates.length > 0}
                    <button class="b3-button b3-button--outline" onclick={() => relationPicker?.openPicker()}>选择联系人</button>
                {:else}
                    <button class="b3-button b3-button--outline" onclick={onClose}>返回工作台</button>
                {/if}
            </ViewState>
        {:else}
            {#if relationViewMode === "radar"}
                <MiniRelationRadar
                    {current}
                    related={relatedPeople}
                    onNavigate={(p) => void navigate(p)}
                />
            {/if}
            <div class="lvct-detail__relations">
                {#each relatedPeople as other (other.itemId)}
                    <span class="lvct-detail__relation">
                        <button class="lvct-detail__relation-name" onclick={() => { onOpenPersonDoc(other.docId); }}>{other.name}</button>
                        <button
                            class="lvct-detail__relation-remove"
                            title="解除关系"
                            disabled={busy}
                            onclick={() => mutateRelationAction("remove", other)}
                        >×</button>
                    </span>
                {/each}
            </div>
        {/if}

        {#if recommendedTies.length > 0}
            <div class="lvct-detail__recommended-ties" role="region" aria-label="潜在交集伙伴推荐">
                <div class="lvct-detail__recommended-ties-head">
                    <span class="lvct-detail__recommended-ties-title">
                        <Sparkles size={13} class="lvct-icon-inline" style="color: var(--lv-brand, #ea580c);" />
                        <b>{text("detailRecommendedTiesTitle", "潜在交集伙伴（推荐建立关联）")}</b>
                    </span>
                    <span class="ft__smaller ft__on-surface">{text("detailRecommendedTiesSub", "基于同场活动、共同组织或共同好友推断")}</span>
                </div>
                <div class="lvct-detail__recommended-ties-grid">
                    {#each recommendedTies as tie (tie.id)}
                        <div class="lvct-detail__tie-card">
                            <div class="lvct-detail__tie-info">
                                <button
                                    type="button"
                                    class="b3-button b3-button--text lvct-detail__tie-name"
                                    onclick={() => void navigate(tie.targetPerson)}
                                    title="查看画像"
                                >
                                    <User size={13} class="lvct-icon-inline" /> {tie.targetPerson.name}
                                </button>
                                <div class="lvct-detail__tie-reasons">
                                    {#each tie.reasons as reason}
                                        <span class="lvct-chip lvct-chip--tag font-size-11">{reason}</span>
                                    {/each}
                                </div>
                            </div>
                            <div class="lvct-detail__tie-actions">
                                <button
                                    type="button"
                                    class="b3-button b3-button--small b3-button--outline lvct-detail__tie-add-btn"
                                    disabled={busy}
                                    onclick={() => void mutateRelationAction("add", tie.targetPerson)}
                                    title={text("detailAddRelationHint", "与当前人物建立正式双向关联")}
                                >
                                    + {text("detailAddRelation", "建立关联")}
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="lvct-detail__add fn__flex">
            <PersonPicker
                bind:this={relationPicker}
                items={relationCandidates}
                ariaLabel="选择要添加关系的联系人"
                placeholder={candidates.length === 0 ? "没有可添加的联系人" : "搜索并选择联系人…"}
                emptyText={candidates.length === 0 ? "没有可添加的联系人" : "没有匹配的联系人"}
                disabled={busy || othersLoading || !!othersError}
                onSelect={(itemId) => {
                    const other = others.find((item) => item.itemId === itemId);
                    if (other) mutateRelationAction("add", other);
                }}
            />
        </div>
        <p class="ft__smaller ft__on-surface">关系为双向：添加后对方的「被相关人」列会自动出现你。</p>
        {#if pendingRelationProjections.length > 0}
            <div role="alert" class="lvct-form__error">
                <p>{text("relationProjectionPending", "关系事实已保存，但部分文档投影尚未核实。")}</p>
                <ul>{#each pendingRelationProjections as item (item.docId)}<li>{item.docId}：{item.message}</li>{/each}</ul>
                <button type="button" class="b3-button b3-button--outline" disabled={busy} onclick={retryRelatedDocuments}>{text("relationProjectionRetry", "只重试未完成文档")}</button>
            </div>
        {/if}
    </section>
    {/if}

    {#if errorText}
        <div class="lvct-form__error" role="alert">{errorText}
            {#if pendingRelationMutation}
                <button type="button" class="b3-button b3-button--outline" disabled={busy} onclick={retryRelationMutation}>重新读取并继续关系操作</button>
            {/if}
        </div>
    {/if}

    <div class="lvct-form__actions">
        <button class="b3-button b3-button--cancel" onclick={() => void (async () => { if (await canLeave.requestClose()) onClose(); })()} disabled={busy || deleting}>{closeLabel ?? text("closeDialog", "关闭")}</button>
        {#if onOpenGraphPerson}
            <button class="b3-button b3-button--outline" onclick={() => void (async () => { if (await canLeave.requestClose()) { onClose(); onOpenGraphPerson?.(current.docId); } })()}><Network size={14}/>{text("detailOpenGraph", "图谱聚焦")}</button>
        {/if}
        <button class="b3-button b3-button--text" onclick={() => onOpenPersonDoc(current.docId)}>{text("detailOpenDoc", "打开文档")}</button>
        <button class="b3-button b3-button--cancel lvct-detail__delete" onclick={confirmDelete} disabled={busy || deleting}>{deleting ? text("detailRemoving", "移除中…") : text("detailRemove", "从人脉移除")}</button>
    </div>
</div>

{#if editing}
    <LvctDialog title={`编辑资料 · ${current.name}`} onClose={() => (editing = false)}>
        <PersonEditDialog
            {settings}
            {i18n}
            {availableGroups}
            person={current}
            onLoadRelationshipLabels={onLoadRelationshipLabels}
            onSaveRelationshipLabels={onSaveRelationshipLabels}
            onLoadOrgMemberships={onLoadOrgMemberships}
            onLoadOrgCandidates={onLoadOrgCandidates}
            onCreateOrganization={onCreateOrganization}
            onAddOrgMembership={onAddOrgMembership}
            onUpdateOrgMembership={onUpdateOrgMembership}
            onRemoveOrgMembership={onRemoveOrgMembership}
            onSaved={refreshAfterEdit}
            onClose={() => (editing = false)}
        />
    </LvctDialog>
{/if}

{#if templateManagerOpen}
    <LvctDialog title={text("tplManagerTitle", "管理互动备注模板")} onClose={() => (templateManagerOpen = false)}>
        <TemplateManager {i18n} templates={templates} onSave={persistTemplates} onReload={reloadTemplates} onClose={() => (templateManagerOpen = false)} />
    </LvctDialog>
{/if}

{#if briefingExportOpen}
    <LvctDialog title={`导出会面简报 · ${current.name}`} wide onClose={() => (briefingExportOpen = false)}>
        <div class="lvct-form">
            <label class="lvct-form__item">
                <span>互动条数范围</span>
                <select class="b3-select fn__block" style="border-radius: var(--lv-r-pill, 9999px);" aria-label="互动条数范围" bind:value={briefingLimit}>
                    <option value={5}>最近 5 条</option>
                    <option value={10}>最近 10 条</option>
                    <option value={20}>最近 20 条</option>
                    <option value={0}>全部互动</option>
                </select>
            </label>
            <pre class="lvct-briefing-preview" class:lvct-briefing-preview--copied={briefingCopied}>{briefingPreview}</pre>
            {#if briefingDocError}
                <div class="b3-label b3-label--error ft__smaller" style="margin-bottom: 6px;">
                    {briefingDocError}
                </div>
            {/if}
            {#if briefingDocCreated}
                <div class="b3-label b3-label--success ft__smaller" style="margin-bottom: 6px;">
                    {text("briefingDocSuccess", "已生成简报实体文档：")}{briefingDocCreated.hpath}
                </div>
            {/if}
            <div class="lvct-form__actions">
                <button class="b3-button b3-button--cancel" style="border-radius: var(--lv-r-pill, 9999px);" onclick={() => (briefingExportOpen = false)}>关闭</button>
                {#if onCreateBriefingDoc}
                    {#if briefingDocCreated}
                        <button
                            type="button"
                            class="b3-button b3-button--outline ft__primary"
                            style="border-radius: var(--lv-r-pill, 9999px);"
                            onclick={() => {
                                onOpenPersonDoc?.(briefingDocCreated!.docId);
                                briefingExportOpen = false;
                            }}
                        >
                            <ExternalLink size={14} strokeWidth={1.6} style="margin-right: 4px;" />
                            {text("briefingDocOpen", "在主编辑器中打开 ↗")}
                        </button>
                    {:else}
                        <button
                            type="button"
                            class="b3-button b3-button--outline"
                            style="border-radius: var(--lv-r-pill, 9999px);"
                            onclick={handleCreateBriefingDoc}
                            disabled={briefingDocBusy}
                        >
                            <span class="fn__flex" style="align-items: center; gap: 4px;">
                                <FileText size={14} strokeWidth={1.6} />
                                {briefingDocBusy ? text("briefingDocCreating", "正在生成简报文档…") : text("briefingDocCreateBtn", "沉淀为思源文档")}
                            </span>
                        </button>
                    {/if}
                {/if}
                <button class="b3-button b3-button--primary" style="border-radius: var(--lv-r-pill, 9999px);" onclick={copyBriefing} disabled={briefingCopying}>
                    {#if briefingCopied}
                        <Check size={14} strokeWidth={1.6} /> 已复制简报全文 ✓
                    {:else}
                        <Copy size={14} strokeWidth={1.6} /> 复制简报全文
                    {/if}
                </button>
                <button class="b3-button b3-button--text" style="border-radius: var(--lv-r-pill, 9999px);" onclick={downloadBriefing}>下载 .md</button>
            </div>
            <p class="ft__smaller ft__on-surface">预览与下载内容一致；仅含本地记录的事实，交往次数不代表关系亲疏。</p>
        </div>
    </LvctDialog>
{/if}

{#if cardModalOpen}
    <LvctDialog title={`视觉名片海报 · ${current.name}`} wide onClose={() => (cardModalOpen = false)}>
        <BusinessCardModal
            person={current}
            orgAndTitle={profileText(current.profile, "work")}
            region={personRegion.city ? `${personRegion.province ? `${personRegion.province} ` : ''}${personRegion.city}` : personRegion.province || ""}
            stageLabel={lifecycleRecord ? getStageMeta(lifecycleRecord.currentStage).shortLabel : undefined}
            onClose={() => (cardModalOpen = false)}
            {i18n}
        />
    </LvctDialog>
{/if}

{#if cardViewerOpen && businessCardUrl}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="lvct-card-viewer-modal" style={`z-index: ${viewerZIndex()}`} onclick={() => (cardViewerOpen = false)}>
        <div class="lvct-card-viewer-dialog" onclick={(e) => e.stopPropagation()}>
            <div class="lvct-card-viewer-header">
                <div class="fn__flex" style="align-items: center; gap: 8px;">
                    <CreditCard size={16} />
                    <span style="font-weight: 600;">{current.name} 的实体纸质名片</span>
                </div>
                <div class="fn__flex" style="align-items: center; gap: 6px;">
                    <button
                        type="button"
                        class="b3-button b3-button--outline b3-button--small"
                        onclick={() => cardFileInput?.click()}
                    >
                        更换名片
                    </button>
                    <button
                        type="button"
                        class="b3-button b3-button--text b3-button--small"
                        style="font-size: 16px; padding: 0 6px;"
                        onclick={() => (cardViewerOpen = false)}
                        title="关闭查看器"
                    >
                        ✕
                    </button>
                </div>
            </div>
            <div class="lvct-card-viewer-body">
                <img src={businessCardUrl} alt={`${current.name} 的实体名片`} class="lvct-card-viewer-img" />
            </div>
        </div>
    </div>
{/if}
