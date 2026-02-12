import type { PostProductionFeedContext } from '@/application/post-production-feed/PostProductionFeedContext'
import type { PostProductionFeedDeps } from '@/application/post-production-feed/PostProductionFeedDeps'
import type { RowModelBase } from '@/application/post-production-feed/PostProductionFeedTypes'
import { PostProductionFeedUseCase } from '@/application/post-production-feed/PostProductionFeedUseCase'
import type { PostProductionFeedStrategy } from '@/application/post-production-feed/PostProductionFeedStrategy'

// App: picks strategy, invokes use-case
export class PostProductionFeedFlow<TRow extends RowModelBase> {
  constructor(
    private deps: PostProductionFeedDeps,
    private getStrategy: () => PostProductionFeedStrategy
  ) {}

  async execute(ctx: PostProductionFeedContext): Promise<boolean> {
    const useCase = new PostProductionFeedUseCase<TRow>(this.deps, this.getStrategy)
    return useCase.execute(ctx)
  }
}
