import type { User } from '@prisma/client';
import { GithubConnectionService } from '../auth/github-connection.service';
import { ConnectionsController } from './connections.controller';

const fakeUser = { id: 'user-1', accountKind: 'developer' } as User;

describe('ConnectionsController', () => {
  let githubConnections: jest.Mocked<
    Pick<GithubConnectionService, 'findForUser' | 'disconnect'>
  >;
  let controller: ConnectionsController;

  beforeEach(() => {
    githubConnections = { findForUser: jest.fn(), disconnect: jest.fn() };
    controller = new ConnectionsController(
      githubConnections as unknown as GithubConnectionService,
    );
  });

  it('findAll returns the GitHub connection state for the current user', async () => {
    githubConnections.findForUser.mockResolvedValue({
      connected: true,
      needsReconnect: false,
    });

    await expect(controller.findAll(fakeUser)).resolves.toEqual({
      github: { connected: true, needsReconnect: false },
    });
    expect(githubConnections.findForUser).toHaveBeenCalledWith('user-1');
  });

  it('disconnectGithub cuts the current user’s connection', async () => {
    githubConnections.disconnect.mockResolvedValue(undefined);

    await controller.disconnectGithub(fakeUser);

    expect(githubConnections.disconnect).toHaveBeenCalledWith('user-1');
  });
});
