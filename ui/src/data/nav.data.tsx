import { IconBriefcase2, IconTableAlias, IconFile3d, IconTool } from '@tabler/icons-react'
import { type Block } from '@layouts/SideMenu'

// ─────────────────────────────────────────────────────────────────────────────
// Nav structure
//
// Settings and Sign out are rendered inside SideMenu's bottom section —
// not as top-level blocks. Only content nav goes here.
// ─────────────────────────────────────────────────────────────────────────────

export const navBlocks: Block[] = [
  {
    label: 'Jobs',
    link: '/jobs',
    icon: <IconBriefcase2 size={18} stroke={1.5} />,
    children: [
      { label: 'All Jobs',  link: '/jobs' },
      { label: 'New Job',   link: '/jobs/new' },
    ],
  },
  {
    label: 'Datasets',
    link: '/datasets',
    icon: <IconTableAlias size={18} stroke={1.5} />,
    children: [
      { label: 'All Datasets', link: '/datasets' },
      { label: 'Upload',       link: '/datasets/upload' },
    ],
  },
  {
    label: 'Models',
    link: '/models',
    icon: <IconFile3d size={18} stroke={1.5} />,
    children: [
      { label: 'Available Models', link: '/models' },
      { label: 'Download Models',       link: '/models/download', disabled: true },
    ],
  },
  {
    label: 'Tools',
    link: '/tools',
    icon: <IconTool size={18} stroke={1.5} />,
    disabled: true,
  },
]