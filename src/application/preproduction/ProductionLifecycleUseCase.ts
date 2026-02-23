export type ProductionLifecycleDeps = {
    start: (uuid: string) => void
    stop: () => Promise<void>
}

export type ProductionStartedIntent = {
    replace: { path: string; query: Record<string, any> }
    push: { path: string; query: Record<string, any> }
}

export class ProductionLifecycleUseCase {
    constructor(private deps: ProductionLifecycleDeps) {}

    handleStarted(input: {
        uuid: string
        currentPath: string
        currentQuery: Record<string, any>
    }): ProductionStartedIntent {
        this.deps.start(input.uuid)
        const pushQuery = { ...input.currentQuery }
        delete pushQuery.uuid

        return {
            replace: {
                path: input.currentPath,
                query: {
                    ...input.currentQuery,
                    uuid: input.uuid,
                },
            },
            push: {
                path: `/smt/panasonic-mounter-production/${input.uuid}`,
                query: pushQuery,
            },
        }
    }

    async stop(): Promise<void> {
        await this.deps.stop()
    }
}
