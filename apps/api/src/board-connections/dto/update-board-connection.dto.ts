import { IsIn } from 'class-validator';

// The one choice a project can change on its board without choosing the
// board again: how the board's numeric "Estimate" reads as a duration.
export class UpdateBoardConnectionDto {
  @IsIn(['days', 'hours'])
  estimateUnit: 'days' | 'hours';
}
