import { ApiProperty } from "@nestjs/swagger";

export class TrainTomlPreviewResponseDto {
  @ApiProperty({
    description: 'Generated train.toml content ready for --config_file',
    example: 'pretrained_model_name_or_path = "/workspace/models/flux/dit/flux1-dev.safetensors"\nnetwork_module = "networks.lora_flux"\nnetwork_dim = 16\nlearning_rate = 0.0001\n',
  })
  toml: string;
 
  @ApiProperty({
    description: 'Python script filename that should be launched via accelerate for this architecture',
    example: 'flux_train_network.py',
  })
  script: string;
 
  @ApiProperty({
    description: 'Default network module resolved for this architecture (used when network_module is not explicitly set)',
    example: 'networks.lora_flux',
  })
  networkModule: string;
}