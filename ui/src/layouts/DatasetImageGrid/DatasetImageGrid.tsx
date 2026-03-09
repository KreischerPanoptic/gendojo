import { ScrollArea, SimpleGrid } from '@mantine/core'
import { ImageCard } from '@ui/ImageCard'
import type { DatasetImageGridProps } from './types'

export function DatasetImageGrid({
  images,
  datasetName,
  onImageClick,
  editMode,
  selectedIndex,
  scrollAreaStyle = { flex: 1 },
}: DatasetImageGridProps) {
  return (
    <ScrollArea style={scrollAreaStyle} p="md">
      <SimpleGrid
        cols={{ base: 3, sm: 4, md: 5, lg: 6, xl: 8 }}
        className="pb-5 pt-3 ps-4 pe-4"
        spacing="xs"
      >
        {images.map((image, index) => (
          <ImageCard
            key={image.filename}
            image={image}
            editMode={editMode}
            datasetName={datasetName}
            isSelected={selectedIndex !== undefined && index === selectedIndex}
            onClick={() => onImageClick(index)}
          />
        ))}
      </SimpleGrid>
    </ScrollArea>
  )
}