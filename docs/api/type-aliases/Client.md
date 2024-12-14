[@ai16z/eliza v0.1.4-alpha.3](../index.md) / Client

# Type Alias: Client

> **Client**: `object`

Client interface for platform connections

## Type declaration

### start()

> **start**: (`runtime`?) => `Promise`\<`unknown`\>

Start client connection

#### Parameters

• **runtime?**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

#### Returns

`Promise`\<`unknown`\>

### stop()

> **stop**: (`runtime`?) => `Promise`\<`unknown`\>

Stop client connection

#### Parameters

• **runtime?**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

#### Returns

`Promise`\<`unknown`\>

## Defined in

packages/core/src/types.ts:563