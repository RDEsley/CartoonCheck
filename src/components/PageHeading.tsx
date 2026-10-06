import { useEffect, useRef } from 'react'
import type { ComponentProps } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
/**
 * The heading of a screen. It names the document and takes focus when the
 * screen appears, so assistive technology announces the new page even when the
 * screen had to load its data first.
 */
export function PageHeading({
  title,
  children,
  ...props
}: ComponentProps<'h1'> & { title: string }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useDocumentTitle(title)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])
  return (
    <h1 {...props} id="page-title" tabIndex={-1} ref={heading}>
      {children ?? title}
    </h1>
  )
}
