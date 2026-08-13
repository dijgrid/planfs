import { RefreshCoordinator } from './refreshCoordinator';

describe('RefreshCoordinator', () => {
  it('coalesces burst events per workspace without dropping another workspace', async () => {
    const coordinator = new RefreshCoordinator();
    const first = jest.fn(async () => undefined);
    const second = jest.fn(async () => undefined);
    coordinator.schedule('first', first, 10);
    coordinator.schedule('first', first, 10);
    coordinator.schedule('second', second, 10);
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
