export interface Block {
  label: string
  link?: string
  icon?: React.ReactNode
  disabled?: boolean
  children?: Block[]
}

export interface RecursiveNavLinkProps {
  block: Block
  path: string
  depth: number
  expandedItems: Set<string>
  onToggle: (path: string, hasChildren: boolean) => void
  sidebarOpened: boolean
  hoverClass?: string
}

export interface SideMenuProps {
  blocks: Block[]
}
