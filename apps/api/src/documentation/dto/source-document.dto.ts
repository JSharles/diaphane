import { Equals, IsInt, Matches, Min } from 'class-validator';

// A Notion page id as `POST /v1/search` returns it: a uuid, dashed or not.
export class CreateNotionRootDto {
  @Matches(
    /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/iu,
  )
  pageId!: string;
}

export class ConfirmSourceDocumentRemovalDto {
  @IsInt() @Min(1) expectedDocumentVersion!: number;
  @Equals(true) confirmed!: true;
}
