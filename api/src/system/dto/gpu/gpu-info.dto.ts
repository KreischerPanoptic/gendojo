import { ApiProperty } from "@nestjs/swagger";
import { VramInfoDto } from "./vram-info.dto";
import { GpuUtilizationDto } from "./gpu-utilization.dto";
import { PowerInfoDto } from "./power-info.dto";

export class GpuInfoDto {
  @ApiProperty({ description: 'Zero-based GPU index as reported by nvidia-smi', example: 0 })
  index: number;
 
  @ApiProperty({ description: 'GPU model name', example: 'NVIDIA GeForce RTX 5090' })
  name: string;
 
  @ApiProperty({ description: 'GPU UUID', example: 'GPU-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  uuid: string;
 
  @ApiProperty({ description: 'NVIDIA driver version', example: '570.133.02' })
  driverVersion: string;
 
  @ApiProperty({ type: () => VramInfoDto })
  vram: VramInfoDto;
 
  @ApiProperty({ type: () => GpuUtilizationDto })
  utilization: GpuUtilizationDto;
 
  @ApiProperty({ description: 'GPU core temperature in °C', example: 72 })
  temperatureCelsius: number;
 
  @ApiProperty({ type: () => PowerInfoDto })
  power: PowerInfoDto;
}