export type ProductionLifecycleDeps = {
    start: (uuid: string) => void
    stop: () => Promise<void>
    buildProductionPath: (uuid: string) => string
    extraQueryParamsToRemove?: string[]
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
        const replaceQuery: Record<string, any> = { ...input.currentQuery, uuid: input.uuid }
        for (const key of this.deps.extraQueryParamsToRemove ?? []) {
            delete replaceQuery[key]
        }

        const pushQuery = { ...input.currentQuery }
        delete pushQuery.uuid
        for (const key of this.deps.extraQueryParamsToRemove ?? []) {
            delete pushQuery[key]
        }

        return {
            replace: {
                path: input.currentPath,
                query: replaceQuery,
            },
            push: {
                path: this.deps.buildProductionPath(input.uuid),
                query: pushQuery,
            },
        }
    }

    async stop(): Promise<void> {
        await this.deps.stop()
    }
}
