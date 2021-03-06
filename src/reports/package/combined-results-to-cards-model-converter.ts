// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CardSelectionViewData } from "common/get-card-selection-view-data";
import { CardResult, CardRuleResult, CardRuleResultsByStatus, CardsViewModel } from "common/types/store-data/card-view-model";
import { UUIDGenerator } from "common/uid-generator";
import { ResolutionCreator } from "injected/adapters/resolution-creator";
import { IssueFilingUrlStringUtils } from "issue-filing/common/issue-filing-url-string-utils";
import { isNil } from "lodash";
import { AxeRuleData, FailureData, FailuresGroup, GroupedResults } from "reports/package/accessibilityInsightsReport";
import { GuidanceLink } from "scanner/rule-to-links-mappings";

export class CombinedResultsToCardsModelConverter {
    constructor(
        private readonly getGuidanceLinks: (ruleId: string) => GuidanceLink[],
        private readonly cardSelectionViewData: CardSelectionViewData,
        private readonly uuidGenerator: UUIDGenerator,
    ) {}

    public convertResults = (
        results: GroupedResults,
    ): CardsViewModel => {
        
        const passedCards = this.getCardRuleResults(results.passed);
        const inapplicableCards = this.getCardRuleResults(results.notApplicable);
        const failedCards = results.failed.map(this.getFailuresGroupedByRule);
        
        const statusResults: CardRuleResultsByStatus = {
            fail: failedCards,
            pass: passedCards,
            inapplicable: inapplicableCards,
            unknown: [],
        };
    
        return {
            cards: statusResults,
            visualHelperEnabled: this.cardSelectionViewData.visualHelperEnabled,
            allCardsCollapsed: this.cardSelectionViewData.expandedRuleIds.length === 0,
        };
    }
    
    private getCardRuleResults = (rules?: AxeRuleData[]): CardRuleResult[] => {
        if(isNil(rules)) {
            return [];
        }
    
        return rules.map(rule => this.getCardRuleResult(rule));
    }
    
    private getCardRuleResult = (rule: AxeRuleData, nodes?: CardResult[]): CardRuleResult => {
        return {
            id: rule.ruleId,
            description: rule.description,
            url: rule.ruleUrl,
            isExpanded: false,
            guidance: this.getGuidanceLinks(rule.ruleId),
            nodes: isNil(nodes) ? [] : nodes,
        };
    }

    private getFailuresGroupedByRule = (groupedFailures: FailuresGroup): CardRuleResult => {
        if(groupedFailures.failed.length == 0) {
            return null;
        }
        const rule = groupedFailures.failed[0].rule;
        const failureNodes = groupedFailures.failed.map(this.getFailureCardResult);
        
        return this.getCardRuleResult(rule, failureNodes);
    }

    private getFailureCardResult = (failureData: FailureData): CardResult => {
        const rule = failureData.rule;
        const cssSelector = failureData.elementSelector;

        return {
            uid: this.uuidGenerator(),
            status: 'fail',
            ruleId: rule.ruleId,
            identifiers: {
                identifier: cssSelector,
                conciseName: IssueFilingUrlStringUtils.getSelectorLastPart(cssSelector),
                'css-selector': cssSelector,
                urls: { urls: failureData.urls },
            },
            descriptors: {
                snippet: failureData.snippet,
            },
            resolution: {
                howToFixSummary: failureData.fix,
            },
            isSelected: false,
            highlightStatus: 'unavailable',
        }
    }
}
