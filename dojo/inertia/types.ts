import { type Data } from '@generated/data'
import { type PropsWithChildren } from 'react'
import { type JSONDataTypes } from '@adonisjs/core/types/transformers'

export type InertiaProps<T extends JSONDataTypes = {}> = PropsWithChildren<Data.SharedProps & T>

// ─── Augmented shared user shape ─────────────────────────────────────────────
// The generated Data.SharedProps.user comes from UserTransformer.
// This re-export is for pages that need to reference the user type explicitly.
// ─────────────────────────────────────────────────────────────────────────────

export type SharedUser = NonNullable<Data.SharedProps['user']>
