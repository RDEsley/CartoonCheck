import { useEffect, useState } from 'react'
import { useRuntime } from '../app/context'
import { checkpointDraft, discardDraft, getDraftSnapshot } from '../pwa/drafts'
export function useFormDraft(
  scope: string,
  revision: number,
  route: string,
  fields: Record<string, string>,
  original: Record<string, string>,
) {
  const { context } = useRuntime()
  const [conflicted] = useState(() => {
    const draft = getDraftSnapshot().draft
    return (
      draft?.scope === scope &&
      (draft.epoch !== context.datasetEpoch || draft.revision !== revision)
    )
  })
  const serialized = JSON.stringify(fields)
  const baseline = JSON.stringify(original)
  useEffect(() => {
    if (conflicted) return
    if (serialized === baseline) {
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
    baseline,
    scope,
    revision,
    route,
    context.datasetEpoch,
    conflicted,
  ])
  return conflicted
}
