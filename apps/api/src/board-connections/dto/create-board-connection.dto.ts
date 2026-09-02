import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import type { GithubOwnerType } from '../github-projects.client';

// The board a project chooses. No token: the developer's GitHub connection,
// given at login, is what reads it.
export class CreateBoardConnectionDto {
  @IsString()
  ownerLogin: string;

  @IsIn(['User', 'Organization'])
  ownerType: GithubOwnerType;

  @IsInt()
  @IsPositive()
  number: number;

  // Defaults to "days" in the service when omitted.
  @IsOptional()
  @IsIn(['days', 'hours'])
  estimateUnit?: 'days' | 'hours';
}
