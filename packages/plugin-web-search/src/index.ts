import { elizaLogger } from "@elizaos/core";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
    Content,
} from "@elizaos/core";
import { generateWebSearch } from "@elizaos/core";
import { SearchResult } from "@elizaos/core";
import { encodingForModel, TiktokenModel } from "js-tiktoken";

const DEFAULT_MAX_WEB_SEARCH_TOKENS = 4000;
const DEFAULT_MODEL_ENCODING = "gpt-3.5-turbo";

function getTotalTokensFromString(
    str: string,
    encodingName: TiktokenModel = DEFAULT_MODEL_ENCODING
) {
    const encoding = encodingForModel(encodingName);
    return encoding.encode(str).length;
}

function MaxTokens(
    data: string,
    maxTokens: number = DEFAULT_MAX_WEB_SEARCH_TOKENS
): string {
    if (getTotalTokensFromString(data) >= maxTokens) {
        return data.slice(0, maxTokens);
    }
    return data;
}

const webSearch: Action = {
    name: "WEB_SEARCH",
    similes: [
        "SEARCH_WEB",
        "INTERNET_SEARCH",
        "LOOKUP",
        "QUERY_WEB",
        "FIND_ONLINE",
        "SEARCH_ENGINE",
        "WEB_LOOKUP",
        "ONLINE_SEARCH",
        "FIND_INFORMATION",
    ],
    description:
        "Perform a web search to find information related to the message.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const tavilyApiKeyOk = !!runtime.getSetting("TAVILY_API_KEY");

        return tavilyApiKeyOk;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Composing state for message:", message);
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);

        const webSearchPrompt = message.content.text;
        elizaLogger.log("web search prompt received:", webSearchPrompt);

        elizaLogger.log("Generating image with prompt:", webSearchPrompt);
        const searchResponse = await generateWebSearch(
            webSearchPrompt,
            runtime
        );

        if (searchResponse && searchResponse.results.length) {
            const responseList = searchResponse.answer
                ? `${searchResponse.answer}${
                      Array.isArray(searchResponse.results) &&
                      searchResponse.results.length > 0
                          ? `\n\nFor more details, you can check out these resources:\n${searchResponse.results
                                .map(
                                    (result: SearchResult, index: number) =>
                                        `${index + 1}. [${result.title}](${result.url})`
                                )
                                .join("\n")}`
                          : ""
                  }`
                : "";

            const newMemory: Memory = {
                ...message,
                content: {
                    ...message.content,
                    text: MaxTokens(
                        responseList,
                        DEFAULT_MAX_WEB_SEARCH_TOKENS
                    ),
                } as Content,
            };

            await runtime.messageManager.createMemory(newMemory);

            callback(newMemory.content);
        } else {
            elizaLogger.error("search failed or returned no data.");
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the current trending marketing strategies for SaaS companies?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the latest trending marketing strategies for SaaS companies:",
                    action: "WEB_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Find successful social media campaigns in the fashion industry this quarter.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are some successful fashion industry social media campaigns I found:",
                    action: "WEB_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the latest changes to Meta's advertising policies?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the recent updates to Meta's advertising policies:",
                    action: "WEB_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Find the average ROI for email marketing campaigns in the tech sector.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the latest email marketing ROI statistics for the tech sector:",
                    action: "WEB_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the most effective TikTok marketing trends for B2C brands?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the current effective TikTok marketing trends for B2C brands:",
                    action: "WEB_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Find case studies of successful content marketing strategies in fintech.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are some notable content marketing case studies from fintech companies:",
                    action: "WEB_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the key performance metrics for influencer marketing campaigns?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the essential KPIs for measuring influencer marketing success:",
                    action: "WEB_SEARCH",
                },
            },
        ],
    ],
} as Action;

export const webSearchPlugin: Plugin = {
    name: "webSearch",
    description: "Search web",
    actions: [webSearch],
    evaluators: [],
    providers: [],
};

export default webSearchPlugin;
