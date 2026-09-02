import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConnectionsController } from './connections.controller';

@Module({
  imports: [AuthModule],
  controllers: [ConnectionsController],
})
export class ConnectionsModule {}
