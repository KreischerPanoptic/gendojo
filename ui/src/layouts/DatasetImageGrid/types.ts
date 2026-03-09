import type { CSSProperties } from 'react'
import type { DatasetImage } from '@services/datasets'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetImageGridProps {
  images: DatasetImage[]
  datasetName: string
  /** Called with the clicked image's index */
  onImageClick: (index: number) => void
  /** Highlights the image at this index (edit mode) */
  selectedIndex?: number
  /** Passed straight to the ScrollArea's style — use to control fill strategy */
  scrollAreaStyle?: CSSProperties
  editMode?: boolean
}