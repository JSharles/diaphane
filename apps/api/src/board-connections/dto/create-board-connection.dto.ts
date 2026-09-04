import { IsIn, IsInt, IsPositive, IsString } from 'class-validator';
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
}
