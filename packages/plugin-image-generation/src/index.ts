import { elizaLogger, generateText } from "@elizaos/core";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
    ModelClass,
} from "@elizaos/core";
import { generateImage } from "@elizaos/core";
import fs from "fs";
import path from "path";
import { validateImageGenConfig } from "./environment";

export function saveBase64Image(base64Data: string, filename: string): string {
    // Create generatedImages directory if it doesn't exist
    const imageDir = path.join(process.cwd(), "generatedImages");
    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
    }

    // Remove the data:image/png;base64 prefix if it exists
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");

    // Create a buffer from the base64 string
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Create full file path
    const filepath = path.join(imageDir, `${filename}.png`);

    // Save the file
    fs.writeFileSync(filepath, imageBuffer);

    return filepath;
}

export async function saveHeuristImage(
    imageUrl: string,
    filename: string
): Promise<string> {
    const imageDir = path.join(process.cwd(), "generatedImages");
    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
    }

    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Create full file path
    const filepath = path.join(imageDir, `${filename}.png`);

    // Save the file
    fs.writeFileSync(filepath, imageBuffer);

    return filepath;
}

const imageGeneration: Action = {
    name: "GENERATE_IMAGE",
    similes: [
        "IMAGE_GENERATION",
        "IMAGE_GEN",
        "CREATE_IMAGE",
        "MAKE_PICTURE",
        "GENERATE_IMAGE",
        "GENERATE_A",
        "DRAW",
        "DRAW_A",
        "MAKE_A",
    ],
    description: "Generate an image to go along with the message.",
    suppressInitialMessage: true,
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateImageGenConfig(runtime);

        const anthropicApiKeyOk = !!runtime.getSetting("ANTHROPIC_API_KEY");
        const nineteenAiApiKeyOk = !!runtime.getSetting("NINETEEN_AI_API_KEY");
        const togetherApiKeyOk = !!runtime.getSetting("TOGETHER_API_KEY");
        const heuristApiKeyOk = !!runtime.getSetting("HEURIST_API_KEY");
        const falApiKeyOk = !!runtime.getSetting("FAL_API_KEY");
        const openAiApiKeyOk = !!runtime.getSetting("OPENAI_API_KEY");
        const veniceApiKeyOk = !!runtime.getSetting("VENICE_API_KEY");
        const livepeerGatewayUrlOk = !!runtime.getSetting(
            "LIVEPEER_GATEWAY_URL"
        );

        return (
            anthropicApiKeyOk ||
            togetherApiKeyOk ||
            heuristApiKeyOk ||
            falApiKeyOk ||
            openAiApiKeyOk ||
            veniceApiKeyOk ||
            nineteenAiApiKeyOk ||
            livepeerGatewayUrlOk
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: {
            width?: number;
            height?: number;
            count?: number;
            negativePrompt?: string;
            numIterations?: number;
            guidanceScale?: number;
            seed?: number;
            modelId?: string;
            jobId?: string;
            stylePreset?: string;
            hideWatermark?: boolean;
        },
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Composing state for message:", message);
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);

        const CONTENT = message.content.text;

        const IMAGE_SYSTEM_PROMPT = `You are an expert marketing visual designer specializing in creating compelling prompts for AI-generated marketing content. You excel at crafting detailed descriptions that result in professional, brand-appropriate visuals. Focus on creating clean, commercial-quality imagery that would be suitable for marketing campaigns, social media, and advertising materials. Consider aspects like brand positioning, target audience, and marketing objectives. Your output should contain only the visual description, without instructions or marketing strategy.`;
        const STYLE =
            "professional, modern, and commercially polished with strong brand appeal";

        const IMAGE_PROMPT_INPUT = `You are tasked with generating a marketing-focused image prompt based on content and specified style.
            Create a detailed prompt that will generate a professional marketing visual while incorporating appropriate branding elements.\n\nInputs:\n<content>\n${CONTENT}\n</content>\n\n<style>\n${STYLE}\n</style>\n\nA effective marketing image prompt should include:\n\n

1. Main subject/product focus
2. Brand elements and identity
3. Target audience consideration
4. Marketing context/use case
5. Professional styling
6. Commercial-grade quality markers

Follow these steps:\n\n1. Analyze the marketing objective and target audience
\n\n
2. Determine the key visual elements:
   - Primary product or service focus
   - Brand identity elements
   - Target audience aspirational elements
   - Marketing context requirements
   - Professional styling needs

3. Consider the marketing environment:
   - Digital vs print considerations
   - Platform-specific requirements
   - Brand consistency elements

4. Choose lighting that enhances product appeal and brand perception

5. Select a color palette aligned with brand guidelines and marketing objectives

6. Define the commercial mood and emotional response

7. Plan composition for maximum marketing impact

8. Incorporate the professional style while maintaining brand integrity

Construct your prompt using:\n\n
1. Primary Focus: Main product/service/message
2. Brand Elements: Key visual brand identifiers
3. Environment: Professional context and setting
4. Lighting: Commercial-grade lighting description
5. Colors: Brand-aligned color palette
6. Mood: Desired customer emotional response
7. Composition: Marketing-optimized layout

Keep the prompt under 50 words while ensuring it will generate a professional marketing visual. Write only the prompt, nothing else.`;

        const imagePrompt = await generateText({
            runtime,
            context: IMAGE_PROMPT_INPUT,
            modelClass: ModelClass.MEDIUM,
            customSystemPrompt: IMAGE_SYSTEM_PROMPT,
        });

        elizaLogger.log("Image prompt received:", imagePrompt);
        const imageSettings = runtime.character?.settings?.imageSettings || {};
        elizaLogger.log("Image settings:", imageSettings);

        const res: { image: string; caption: string }[] = [];

        elizaLogger.log("Generating image with prompt:", imagePrompt);
        const images = await generateImage(
            {
                prompt: imagePrompt,
                width: options.width || imageSettings.width || 1024,
                height: options.height || imageSettings.height || 1024,
                ...(options.count != null || imageSettings.count != null
                    ? { count: options.count || imageSettings.count || 1 }
                    : {}),
                ...(options.negativePrompt != null ||
                imageSettings.negativePrompt != null
                    ? {
                          negativePrompt:
                              options.negativePrompt ||
                              imageSettings.negativePrompt,
                      }
                    : {}),
                ...(options.numIterations != null ||
                imageSettings.numIterations != null
                    ? {
                          numIterations:
                              options.numIterations ||
                              imageSettings.numIterations,
                      }
                    : {}),
                ...(options.guidanceScale != null ||
                imageSettings.guidanceScale != null
                    ? {
                          guidanceScale:
                              options.guidanceScale ||
                              imageSettings.guidanceScale,
                      }
                    : {}),
                ...(options.seed != null || imageSettings.seed != null
                    ? { seed: options.seed || imageSettings.seed }
                    : {}),
                ...(options.modelId != null || imageSettings.modelId != null
                    ? { modelId: options.modelId || imageSettings.modelId }
                    : {}),
                ...(options.jobId != null || imageSettings.jobId != null
                    ? { jobId: options.jobId || imageSettings.jobId }
                    : {}),
                ...(options.stylePreset != null ||
                imageSettings.stylePreset != null
                    ? {
                          stylePreset:
                              options.stylePreset || imageSettings.stylePreset,
                      }
                    : {}),
                ...(options.hideWatermark != null ||
                imageSettings.hideWatermark != null
                    ? {
                          hideWatermark:
                              options.hideWatermark ||
                              imageSettings.hideWatermark,
                      }
                    : {}),
            },
            runtime
        );

        if (images.success && images.data && images.data.length > 0) {
            elizaLogger.log(
                "Image generation successful, number of images:",
                images.data.length
            );
            for (let i = 0; i < images.data.length; i++) {
                const image = images.data[i];

                // Save the image and get filepath
                const filename = `generated_${Date.now()}_${i}`;

                // Choose save function based on image data format
                const filepath = image.startsWith("http")
                    ? await saveHeuristImage(image, filename)
                    : saveBase64Image(image, filename);

                elizaLogger.log(`Processing image ${i + 1}:`, filename);

                //just dont even add a caption or a description just have it generate & send
                /*
                try {
                    const imageService = runtime.getService(ServiceType.IMAGE_DESCRIPTION);
                    if (imageService && typeof imageService.describeImage === 'function') {
                        const caption = await imageService.describeImage({ imageUrl: filepath });
                        captionText = caption.description;
                        captionTitle = caption.title;
                    }
                } catch (error) {
                    elizaLogger.error("Caption generation failed, using default caption:", error);
                }*/

                const _caption = "...";
                /*= await generateCaption(
                    {
                        imageUrl: image,
                    },
                    runtime
                );*/

                res.push({ image: filepath, caption: "..." }); //caption.title });

                elizaLogger.log(
                    `Generated caption for image ${i + 1}:`,
                    "..." //caption.title
                );
                //res.push({ image: image, caption: caption.title });

                callback(
                    {
                        text: "...", //caption.description,
                        attachments: [
                            {
                                id: crypto.randomUUID(),
                                url: filepath,
                                title: "Generated image",
                                source: "imageGeneration",
                                description: "...", //caption.title,
                                text: "...", //caption.description,
                                contentType: "image/png",
                            },
                        ],
                    },
                    [
                        {
                            attachment: filepath,
                            name: `${filename}.png`,
                        },
                    ]
                );
            }
        } else {
            elizaLogger.error("Image generation failed or returned no data.");
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a social media banner for our new tech product launch",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's your social media banner",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Generate a lifestyle image for our fitness app campaign",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's your lifestyle marketing image",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Design an Instagram post for our organic food delivery service",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's your Instagram marketing visual",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a professional LinkedIn header for our B2B software",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's your LinkedIn header image",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Generate an email banner for our holiday sale campaign",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's your email marketing banner",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
    ],
} as Action;
export const imageGenerationPlugin: Plugin = {
    name: "imageGeneration",
    description: "Generate images",
    actions: [imageGeneration],
    evaluators: [],
    providers: [],
};

export default imageGenerationPlugin;
