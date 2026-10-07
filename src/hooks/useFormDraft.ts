import { useEffect, useSyncExternalStore } from 'react'
import { useRuntime } from '../app/context'
import {
  beginEditing,
  checkpointDraft,
  discardDraft,
  getDraftSnapshot,
  subscribeDraft,
} from '../pwa/drafts'
/**
 * Checkpoints an open form so an update or a reload cannot drop what was typed.
 *
 * `conflicted` means a draft of this same form exists for other data (an older
 * revision or a replaced dataset). It cannot be applied, and nothing typed now
 * would be checkpointed, so the form must not be edited until that draft is
 * saved elsewhere or discarded. A form that has nothing to lose from the stale
 * draft can ask for it to be replaced instead.
 */
export function useFormDraft(
  scope: string,
  revision: number,
  route: string,
  fields: Record<string, string>,
  original: Record<string, string>,
  replaceStale = false,
) {
  const { context } = useRuntime()
  const { draft } = useSyncExternalStore(subscribeDraft, getDraftSnapshot)
  const stale =
    draft?.scope === scope &&
    (draft.epoch !== context.datasetEpoch || draft.revision !== revision)
  const conflicted = stale && !replaceStale
  useEffect(() => beginEditing(scope), [scope])
  const serialized = JSON.stringify(fields)
  const dirty = serialized !== JSON.stringify(original)
  useEffect(() => {
    if (conflicted) return
    if (!dirty) {
      discardDraft(scope)
      return
    }
    const parsed: unknown = JSON.parse(serialized)
    if (typeof parsed !== 'object' || parsed === null) return
    const values = Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
    checkpointDraft({
      version: 1,
      scope,
      revision,
      route,
      epoch: context.datasetEpoch,
      fields: values,
    })
  }, [
    serialized,
    dirty,
    scope,
    revision,
    route,
    context.datasetEpoch,
    conflicted,
  ])
  return { conflicted, dirty }
}
