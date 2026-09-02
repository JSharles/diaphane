import { Module } from '@nestjs/common';
import { NotionConnectionService } from './notion-connection.service';
import { NotionOauthClient } from './notion-oauth.client';
import { NotionClient } from './notion.client';

// The developer's Notion connection and the client that reads pages with it.
// Its routes live in ConnectionsController, beside GitHub's.
@Module({
  providers: [NotionConnectionService, NotionOauthClient, NotionClient],
  exports: [NotionConnectionService, NotionOauthClient, NotionClient],
})
export class NotionConnectionModule {}
