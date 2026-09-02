import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotionConnectionModule } from '../notion-connection/notion-connection.module';
import { ConnectionsController } from './connections.controller';

@Module({
  imports: [AuthModule, NotionConnectionModule],
  controllers: [ConnectionsController],
})
export class ConnectionsModule {}
