import { useEffect } from 'react'
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title =
      title === null ? 'Cartoon Check' : `${title} · Cartoon Check`
  }, [title])
}
