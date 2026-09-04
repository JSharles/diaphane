import type { User } from '@prisma/client';
import { BoardConnectionsController } from './board-connections.controller';
import { BoardConnectionsService } from './board-connections.service';

const fakeUser: User = {
  id: 'user-1',
  firstName: 'Jean',
  lastName: 'Charles',
  email: 'jc@example.com',
  passwordHash: 'hashed',
  accountKind: 'developer',
  company: null,
  address: null,
  phone: null,
  image: null,
  bio: null,
  github: null,
  githubId: null,
  socials: null,
  linkedin: null,
  malt: null,
  website: null,
  roleTitle: null,
  locale: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeConnection = {
  provider: 'github' as const,
  boardOwnerLogin: 'acme',
  boardOwnerType: 'Organization',
  boardNumber: 3,
  boardTitle: 'Roadmap',
  boardUrl: 'https://github.com/orgs/acme/projects/3',
  estimateUnit: 'days' as const,
  needsReconnect: false,
};

describe('BoardConnectionsController', () => {
  let service: jest.Mocked<
    Pick<
      BoardConnectionsService,
      | 'findForProject'
      | 'listBoards'
      | 'connect'
      | 'updateEstimateUnit'
      | 'disconnect'
    >
  >;
  let controller: BoardConnectionsController;

  beforeEach(() => {
    service = {
      findForProject: jest.fn(),
      listBoards: jest.fn(),
      connect: jest.fn(),
      updateEstimateUnit: jest.fn(),
      disconnect: jest.fn(),
    };
    controller = new BoardConnectionsController(
      service as unknown as BoardConnectionsService,
    );
  });

  it('findOne delegates to the service with the current user and project', async () => {
    service.findForProject.mockResolvedValue(fakeConnection);

    await expect(controller.findOne(fakeUser, 'project-1')).resolves.toEqual(
      fakeConnection,
    );
    expect(service.findForProject).toHaveBeenCalledWith('user-1', 'project-1');
  });

  it('listBoards returns what the developer’s GitHub connection can see, no token in the request', async () => {
    const boards = [
      {
        ownerLogin: 'acme',
        ownerType: 'Organization' as const,
        number: 3,
        title: 'Roadmap',
        url: 'https://github.com/orgs/acme/projects/3',
      },
    ];
    service.listBoards.mockResolvedValue(boards);

    await expect(controller.listBoards(fakeUser, 'project-1')).resolves.toEqual(
      boards,
    );
    expect(service.listBoards).toHaveBeenCalledWith('user-1', 'project-1');
  });

  it('connect passes the board selection through, estimate unit included', async () => {
    service.connect.mockResolvedValue({
      ...fakeConnection,
      estimateUnit: 'hours',
    });

    const result = await controller.connect(fakeUser, 'project-1', {
      ownerLogin: 'acme',
      ownerType: 'Organization',
      number: 3,
      estimateUnit: 'hours',
    });

    expect(result.estimateUnit).toBe('hours');
    expect(service.connect).toHaveBeenCalledWith('user-1', 'project-1', {
      ownerLogin: 'acme',
      ownerType: 'Organization',
      number: 3,
      estimateUnit: 'hours',
    });
  });

  it('update changes only the estimate unit of the connected board', async () => {
    service.updateEstimateUnit.mockResolvedValue({
      ...fakeConnection,
      estimateUnit: 'hours',
    });

    const result = await controller.update(fakeUser, 'project-1', {
      estimateUnit: 'hours',
    });

    expect(result.estimateUnit).toBe('hours');
    expect(service.updateEstimateUnit).toHaveBeenCalledWith(
      'user-1',
      'project-1',
      'hours',
    );
  });

  it('disconnect delegates to the service', async () => {
    service.disconnect.mockResolvedValue(undefined);

    await controller.disconnect(fakeUser, 'project-1');

    expect(service.disconnect).toHaveBeenCalledWith('user-1', 'project-1');
  });
});
