// #region Imports

import { z } from 'zod';
import {
  mergeModes,
  processRoles,
  workflowArtifactKinds,
  workflowGuardIds,
  workflowStageKinds,
} from '@symphony/domain-workflow';
import { decisionOptionSchema } from './DecisionOptionSchema';
import { identifierSchema } from '@symphony/configuration-core';
import { labelSchema } from './LabelSchema';
import { stageIdSchema } from './StageIdSchema';
import { transitionTriggerSchema } from './TransitionTriggerSchema';
const stageSchema = z
  .object({
    id: stageIdSchema,
    label: labelSchema,
    description: z.string().trim().max(500),
    kind: z.enum(workflowStageKinds),
    roles: z.array(z.enum(processRoles)).max(8).readonly().optional(),
    autoStart: z.boolean().optional(),
    decisions: z.array(decisionOptionSchema).max(16).readonly().optional(),
  })
  .strict()
  .refine((stage) => stage.kind !== 'automated' || (stage.roles?.length ?? 0) > 0, {
    message: 'Choose at least one role that works on this stage.',
    path: ['roles'],
  })
  .refine((stage) => stage.kind !== 'human-gate' || (stage.decisions?.length ?? 0) > 0, {
    message: 'A human gate needs at least one decision.',
    path: ['decisions'],
  });

const transitionSchema = z
  .object({
    id: identifierSchema.max(96),
    from: stageIdSchema,
    to: stageIdSchema,
    trigger: transitionTriggerSchema,
    guards: z.array(z.enum(workflowGuardIds)).readonly(),
    invalidates: z.array(z.enum(workflowArtifactKinds)).readonly().optional(),
  })
  .strict();

const retryPolicySchema = z
  .object({
    backoffMinutes: z.array(z.number().int().min(0).max(1_440)).min(1).max(10).readonly(),
    jitterRatio: z.number().min(0).max(1),
    maxAttemptsPerReason: z.number().int().min(1).max(10),
  })
  .strict();

const loopLimitPolicySchema = z
  .object({
    maxReworkPerRoute: z.number().int().min(1).max(20),
    maxReworkTotal: z.number().int().min(1).max(50),
    maxIdenticalFailures: z.number().int().min(1).max(10),
    maxDurationHours: z.number().int().min(1).max(8_760),
  })
  .strict()
  .refine((limits) => limits.maxReworkPerRoute <= limits.maxReworkTotal, {
    message: 'The total rework limit cannot be lower than the per-route limit.',
    path: ['maxReworkTotal'],
  });

const mergePolicySchema = z
  .object({
    mode: z.enum(mergeModes),
    strategy: z.enum(['merge', 'squash', 'rebase']),
    deleteBranchAfterMerge: z.boolean(),
    requirePostMergeChecks: z.boolean(),
  })
  .strict();

const escalationPolicySchema = z
  .object({
    reminderHours: z.number().int().min(1).max(720),
    escalationHours: z.number().int().min(1).max(2_160),
    decisionHours: z.number().int().min(1).max(8_760),
  })
  .strict();

const claimPolicySchema = z
  .object({
    leaseMinutes: z.number().int().min(1).max(1_440),
    heartbeatSeconds: z.number().int().min(5).max(3_600),
  })
  .strict()
  .refine((claim) => claim.heartbeatSeconds * 2 <= claim.leaseMinutes * 60, {
    message: 'The heartbeat must run at least twice per lease.',
    path: ['heartbeatSeconds'],
  });

// #endregion

/**
 * The delivery process as configuration. Stages, transitions, and policies are editable, so
 * nothing in the engine may assume the shipped stage identifiers exist.
 */
export const workflowDefinitionSchema = z
  .object({
    id: identifierSchema.max(64),
    name: labelSchema,
    version: z.number().int().positive(),
    initialStageId: stageIdSchema,
    stages: z.array(stageSchema).min(1).max(24).readonly(),
    transitions: z.array(transitionSchema).max(200).readonly(),
    policies: z
      .object({
        retry: retryPolicySchema,
        loopLimits: loopLimitPolicySchema,
        merge: mergePolicySchema,
        humanRequired: escalationPolicySchema,
        claim: claimPolicySchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((workflow, context) => {
    const stageIds = new Set(workflow.stages.map((stage) => stage.id));
    const seenStageIds = new Set<string>();
    workflow.stages.forEach((stage, index) => {
      if (seenStageIds.has(stage.id)) {
        context.addIssue({
          code: 'custom',
          path: ['stages', index, 'id'],
          message: `Duplicate stage id "${stage.id}".`,
        });
      }
      seenStageIds.add(stage.id);
    });
    const seenTransitionIds = new Set<string>();
    workflow.transitions.forEach((transition, index) => {
      if (seenTransitionIds.has(transition.id)) {
        context.addIssue({
          code: 'custom',
          path: ['transitions', index, 'id'],
          message: `Duplicate transition id "${transition.id}".`,
        });
      }
      seenTransitionIds.add(transition.id);
    });
    if (!stageIds.has(workflow.initialStageId)) {
      context.addIssue({
        code: 'custom',
        path: ['initialStageId'],
        message: `Unknown stage "${workflow.initialStageId}".`,
      });
    }
    if (!workflow.stages.some((stage) => stage.kind === 'terminal')) {
      context.addIssue({
        code: 'custom',
        path: ['stages'],
        message: 'A workflow needs at least one terminal stage.',
      });
    }
    workflow.stages.forEach((stage, stageIndex) => {
      (stage.decisions ?? []).forEach((decision, decisionIndex) => {
        if (decision.targetStageId !== undefined && !stageIds.has(decision.targetStageId)) {
          context.addIssue({
            code: 'custom',
            path: ['stages', stageIndex, 'decisions', decisionIndex, 'targetStageId'],
            message: `Unknown stage "${decision.targetStageId}".`,
          });
        }
      });
    });
    workflow.transitions.forEach((transition, index) => {
      if (!stageIds.has(transition.from)) {
        context.addIssue({
          code: 'custom',
          path: ['transitions', index, 'from'],
          message: `Unknown stage "${transition.from}".`,
        });
      }
      if (!stageIds.has(transition.to)) {
        context.addIssue({
          code: 'custom',
          path: ['transitions', index, 'to'],
          message: `Unknown stage "${transition.to}".`,
        });
      }
      const trigger = transition.trigger;
      if (trigger.kind === 'decision') {
        const stage = workflow.stages.find((candidate) => candidate.id === transition.from);
        const known = stage?.decisions?.some((decision) => decision.id === trigger.optionId);
        if (known !== true) {
          context.addIssue({
            code: 'custom',
            path: ['transitions', index, 'trigger', 'optionId'],
            message: `Stage "${transition.from}" offers no decision "${trigger.optionId}".`,
          });
        }
      }
    });
    // A stage no transition can reach would hold work items forever.
    const reachable = new Set<string>([workflow.initialStageId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const transition of workflow.transitions) {
        if (reachable.has(transition.from) && !reachable.has(transition.to)) {
          reachable.add(transition.to);
          grew = true;
        }
      }
    }
    workflow.stages.forEach((stage, index) => {
      if (!reachable.has(stage.id)) {
        context.addIssue({
          code: 'custom',
          path: ['stages', index, 'id'],
          message: `Stage "${stage.id}" cannot be reached from the initial stage.`,
        });
      }
    });
  });
