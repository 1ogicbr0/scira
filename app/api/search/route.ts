// /app/api/chat/route.ts
import {
  generateTitleFromUserMessage,
  getGroupConfig,
  getUserMessageCount,
  getExtremeSearchUsageCount,
  getCurrentUser,
  getCustomInstructions,
} from '@/app/actions';
import {
  convertToCoreMessages,
  streamText,
  NoSuchToolError,
  appendResponseMessages,
  CoreToolMessage,
  CoreAssistantMessage,
  createDataStream,
  generateObject,
} from 'ai';
import {
  ola,
  getMaxOutputTokens,
  requiresAuthentication,
  requiresProSubscription,
  shouldBypassRateLimits,
} from '@/ai/providers';
import {
  createStreamId,
  getChatById,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
  updateChatTitleById,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import { after } from 'next/server';
import { differenceInSeconds } from 'date-fns';
import { Chat, CustomInstructions } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { geolocation } from '@vercel/functions';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { session, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Import all tools from the organized tool files
import {
  stockChartTool,
  currencyConverterTool,
  xSearchTool,
  textTranslateTool,
  webSearchTool,
  movieTvSearchTool,
  trendingMoviesTool,
  trendingTvTool,
  academicSearchTool,
  youtubeSearchTool,
  retrieveTool,
  weatherTool,
  codeInterpreterTool,
  findPlaceOnMapTool,
  nearbyPlacesSearchTool,
  flightTrackerTool,
  coinDataTool,
  coinDataByContractTool,
  coinOhlcTool,
  datetimeTool,
  greetingTool,
  mcpSearchTool,
  memoryManagerTool,
  redditSearchTool,
  extremeSearchTool,
  nearbyDiscoveryTool,
  stackOverflowSearchTool,
  v0SearchTool,
  githubSearchTool,
  npmSearchTool,
  devCommunitySearchTool,
  docsSearchTool,
} from '@/lib/tools';

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

function getTrailingMessageId({ messages }: { messages: Array<ResponseMessage> }): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  // Disable Redis streaming completely
  return null;
}

// Helper function to get user from session (same as in other APIs)
async function getUserFromSession(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie');
    if (!cookies) return null;

    const match = cookies.match(/better-auth\.session_token=([^;]+)/);
    if (!match) return null;

    const sessionToken = match[1];
    const sessionRecord = await db.query.session.findFirst({
      where: eq(session.token, sessionToken),
    });

    if (!sessionRecord || new Date() > sessionRecord.expiresAt) {
      return null;
    }

    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, sessionRecord.userId),
    });

    return userRecord;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
}

export async function POST(req: Request) {
  console.log('🔍 Search API endpoint hit');
  
  try {
    const requestStartTime = Date.now();
    const requestData = await req.json();
    console.log('=== API Request Debug Info ===');
    console.log('Request data:', {
      model: requestData.model,
      group: requestData.group,
      messageCount: requestData.messages?.length,
      timezone: requestData.timezone,
      id: requestData.id,
      visibility: requestData.selectedVisibilityType
    });

    const { messages, model, group, timezone, id, selectedVisibilityType } = requestData;
    const { latitude, longitude } = geolocation(req);

    console.log('--------------------------------');
    console.log('Location: ', latitude, longitude);
    console.log('--------------------------------');

    console.log('--------------------------------');
    console.log('Messages: ', messages);
    console.log('--------------------------------');

    const userCheckTime = Date.now();
    const user = await getCurrentUser();
    const streamId = 'stream-' + uuidv4();
    console.log(`⏱️  User check took: ${((Date.now() - userCheckTime) / 1000).toFixed(2)}s`);

    if (!user) {
      console.log('User not found');
    }
    let customInstructions: CustomInstructions | null = null;

    // Check if model requires authentication (fast check)
    const authRequiredModels = ['ola-anthropic', 'ola-google'];
    if (authRequiredModels.includes(model) && !user) {
      return new ChatSDKError('unauthorized:model', `Authentication required to access ${model}`).toResponse();
    }

    // For authenticated users, do critical checks in parallel
    let criticalChecksPromise: Promise<{
      canProceed: boolean;
      error?: any;
      isProUser?: boolean;
    }> = Promise.resolve({ canProceed: true });

    if (user) {
      customInstructions = await getCustomInstructions(user);

      const isProUser = user.isProUser;

      // Check if model requires Pro subscription
      if (requiresProSubscription(model) && !isProUser) {
        return new ChatSDKError('upgrade_required:model', `${model} requires a Pro subscription`).toResponse();
      }

      // For non-pro users, check usage limits upfront
      if (!isProUser) {
        const criticalChecksStartTime = Date.now();

        try {
          const [messageCountResult, extremeSearchUsage] = await Promise.all([
            getUserMessageCount(user),
            getExtremeSearchUsageCount(user),
          ]);
          console.log(`⏱️  Critical checks took: ${((Date.now() - criticalChecksStartTime) / 1000).toFixed(2)}s`);

          if (messageCountResult.error) {
            console.error('Error getting message count:', messageCountResult.error);
            return new ChatSDKError('bad_request:api', 'Failed to verify usage limits').toResponse();
          }

          // Check if user should bypass limits for free unlimited models
          const shouldBypassLimits = shouldBypassRateLimits(model, user);

          if (!shouldBypassLimits && messageCountResult.count !== undefined) {
            const dailyLimit = 100; // Non-pro users have a daily limit
            if (messageCountResult.count >= dailyLimit) {
              return new ChatSDKError('rate_limit:chat', 'Daily search limit reached').toResponse();
            }
          }

          criticalChecksPromise = Promise.resolve({
            canProceed: true,
            messageCount: messageCountResult.count,
            isProUser: false,
            subscriptionData: user.subscriptionData,
            shouldBypassLimits,
            extremeSearchUsage: extremeSearchUsage.count,
          });
        } catch (error) {
          console.error('Critical checks failed:', error);
          return new ChatSDKError('bad_request:api', 'Failed to verify user access').toResponse();
        }
      } else {
        // Pro users skip all usage limit checks
        const criticalChecksStartTime = Date.now();
        console.log(
          `⏱️  Critical checks took: ${((Date.now() - criticalChecksStartTime) / 1000).toFixed(2)}s (Pro user - skipped usage checks)`,
        );
        criticalChecksPromise = Promise.resolve({
          canProceed: true,
          messageCount: 0, // Not relevant for pro users
          isProUser: true,
          subscriptionData: user.subscriptionData,
          shouldBypassLimits: true,
          extremeSearchUsage: 0, // Not relevant for pro users
        });
      }
    } else {
      // For anonymous users, check if model requires authentication
      if (requiresAuthentication(model)) {
        return new ChatSDKError('unauthorized:model', `${model} requires authentication`).toResponse();
      }

      criticalChecksPromise = Promise.resolve({
        canProceed: true,
        messageCount: 0,
        isProUser: false,
        subscriptionData: null,
        shouldBypassLimits: false,
        extremeSearchUsage: 0,
      });
    }

    // Get configuration in parallel with critical checks
    const configStartTime = Date.now();
    const configPromise = getGroupConfig(group).then((config) => {
      console.log(`⏱️  Config loading took: ${((Date.now() - configStartTime) / 1000).toFixed(2)}s`);
      return config;
    });

    // Start streaming immediately while background operations continue
    const stream = createDataStream({
      execute: async (dataStream) => {
        // Wait for critical checks to complete
        const criticalWaitStartTime = Date.now();
        const criticalResult = await criticalChecksPromise;
        console.log(`⏱️  Critical checks wait took: ${((Date.now() - criticalWaitStartTime) / 1000).toFixed(2)}s`);

        if (!criticalResult.canProceed) {
          throw criticalResult.error;
        }

        // Get configuration
        const configWaitStartTime = Date.now();
        const { tools: activeTools, instructions } = await configPromise;
        console.log(`⏱️  Config wait took: ${((Date.now() - configWaitStartTime) / 1000).toFixed(2)}s`);

        // Critical: Ensure chat exists before streaming starts
        if (user) {
          const chatCheckStartTime = Date.now();
          const chat = await getChatById({ id });
          console.log(`⏱️  Chat check took: ${((Date.now() - chatCheckStartTime) / 1000).toFixed(2)}s`);

          if (!chat) {
            // Create chat without title first - title will be generated in onFinish
            const chatCreateStartTime = Date.now();
            console.log('🔍 Search API - Creating new chat in database');
            await saveChat({
              id,
              userId: user.id,
              title: 'New conversation', // Temporary title that will be updated in onFinish
              visibility: selectedVisibilityType,
            });
            console.log(`⏱️  Chat creation took: ${((Date.now() - chatCreateStartTime) / 1000).toFixed(2)}s`);
            console.log('🔍 Search API - Chat created successfully');
          } else {
            if (chat.userId !== user.id) {
              throw new ChatSDKError('forbidden:chat', 'This chat belongs to another user');
            }
            console.log('🔍 Search API - Using existing chat');
          }

          // Save user message and create stream ID in background (non-blocking)
          const backgroundOperations = (async () => {
            try {
              const backgroundStartTime = Date.now();
              console.log('🔍 Search API - Saving user message to database');
              await Promise.all([
                saveMessages({
                  messages: [
                    {
                      chatId: id,
                      role: 'user',
                      parts: messages[messages.length - 1].parts,
                      attachments: messages[messages.length - 1].experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                }),
                createStreamId({ streamId, chatId: id }),
              ]);
              console.log(`⏱️  Background operations took: ${((Date.now() - backgroundStartTime) / 1000).toFixed(2)}s`);
              console.log('🔍 Search API - User message saved successfully');

              console.log('--------------------------------');
              console.log('Messages saved: ', messages);
              console.log('--------------------------------');
            } catch (error) {
              console.error('Error in background message operations:', error);
              // These are non-critical errors that shouldn't stop the stream
            }
          })();

          // Start background operations but don't wait for them
          backgroundOperations.catch((error) => {
            console.error('Background operations failed:', error);
          });
        }

        console.log('--------------------------------');
        console.log('Messages: ', messages);
        console.log('--------------------------------');
        console.log('Running with model: ', model.trim());
        console.log('Model type check - is Groq model:', model.includes('ola-default') || model.includes('ola-grok') || model.includes('ola-vision') || model.includes('ola-qwen-32b') || model.includes('ola-kimi-k2') || model.includes('ola-llama-4'));
        console.log('Model breakdown:');
        console.log('  - Model value:', model);
        console.log('  - Is ola-default:', model.includes('ola-default'));
        console.log('  - Is ola-grok:', model.includes('ola-grok'));
        console.log('  - Is ola-vision:', model.includes('ola-vision'));
        console.log('  - Is ola-qwen-32b:', model.includes('ola-qwen-32b'));
        console.log('  - Is ola-kimi-k2:', model.includes('ola-kimi-k2'));
        console.log('  - Is ola-llama-4:', model.includes('ola-llama-4'));
        console.log('Group: ', group);
        console.log('Timezone: ', timezone);

        // Calculate time to reach streamText
        const preStreamTime = Date.now();
        const setupTime = (preStreamTime - requestStartTime) / 1000;
        console.log('--------------------------------');
        console.log(`Time to reach streamText: ${setupTime.toFixed(2)} seconds`);
        console.log('--------------------------------');

        console.log('--------------------------------');
        console.log('Available tools:', Object.keys({
          // Stock & Financial Tools
          stock_chart: stockChartTool,
          currency_converter: currencyConverterTool,
          coin_data: coinDataTool,
          coin_data_by_contract: coinDataByContractTool,
          coin_ohlc: coinOhlcTool,

          // Search & Content Tools
          x_search: xSearchTool,
          web_search: webSearchTool(dataStream),
          academic_search: academicSearchTool,
          youtube_search: youtubeSearchTool,
          reddit_search: redditSearchTool,
          stackoverflow_search: stackOverflowSearchTool(dataStream),
          v0_search: v0SearchTool(dataStream),
          github_search: githubSearchTool(dataStream),
          npm_search: npmSearchTool(dataStream),
          dev_community_search: devCommunitySearchTool(dataStream),
          docs_search: docsSearchTool(dataStream),
          retrieve: retrieveTool,

          // Media & Entertainment
          movie_or_tv_search: movieTvSearchTool,
          trending_movies: trendingMoviesTool,
          trending_tv: trendingTvTool,

          // Location & Maps
          find_place_on_map: findPlaceOnMapTool,
          nearby_places_search: nearbyPlacesSearchTool,
          get_weather_data: weatherTool,

          // Utility Tools
          text_translate: textTranslateTool,
          code_interpreter: codeInterpreterTool,
          track_flight: flightTrackerTool,
          datetime: datetimeTool,
          mcp_search: mcpSearchTool,
          memory_manager: memoryManagerTool,
          extreme_search: extremeSearchTool(dataStream),
          nearby_discovery: nearbyDiscoveryTool,
          greeting: greetingTool,
        }));
        console.log('--------------------------------');

        const result = streamText({
          model: ola.languageModel(model),
          messages: convertToCoreMessages(messages),
          ...(model.includes('ola-qwen-32b')
            ? {
                temperature: 0.6,
                topP: 0.95,
                topK: 20,
                minP: 0,
              }
            : model.includes('ola-deepseek-v3') || model.includes('ola-qwen-30b')
              ? {
                  temperature: 0.6,
                  topP: 1,
                  topK: 40,
                }
              : model.includes('ola-grok') || model.includes('ola-vision') || model.includes('ola-kimi-k2') || model.includes('ola-llama-4')
                ? {
                    temperature: 0,
                    maxTokens: 16000,
                  }
                : {
                    temperature: 0,
                  }),
          maxSteps: 5,
          maxRetries: 10,
          experimental_activeTools: [...activeTools],
          system:
            instructions +
            (customInstructions
              ? `\n\nThe user's custom instructions are as follows and YOU MUST FOLLOW THEM AT ALL COSTS: ${customInstructions?.content}`
              : '\n') +
            (latitude && longitude ? `\n\nThe user's location is ${latitude}, ${longitude}.` : ''),
          toolChoice: 'auto',
          providerOptions: {
            openai: {
              ...(model === 'ola-o4-mini' || model === 'ola-o3'
                ? {
                    strictSchemas: true,
                    reasoningSummary: 'detailed',
                    serviceTier: 'flex',
                  }
                : {}),
              ...(model === 'ola-4.1-mini'
                ? {
                    parallelToolCalls: false,
                    strictSchemas: true,
                  }
                : {}),
            },
            groq: {
              parallelToolCalls: false,
              strictSchemas: true,
            },
          },
          tools: {
            // Stock & Financial Tools
            stock_chart: stockChartTool,
            currency_converter: currencyConverterTool,
            coin_data: coinDataTool,
            coin_data_by_contract: coinDataByContractTool,
            coin_ohlc: coinOhlcTool,

            // Search & Content Tools
            x_search: xSearchTool,
            web_search: webSearchTool(dataStream),
            academic_search: academicSearchTool,
            youtube_search: youtubeSearchTool,
            reddit_search: redditSearchTool,
            stackoverflow_search: stackOverflowSearchTool(dataStream),
            v0_search: v0SearchTool(dataStream),
            github_search: githubSearchTool(dataStream),
            npm_search: npmSearchTool(dataStream),
            dev_community_search: devCommunitySearchTool(dataStream),
            docs_search: docsSearchTool(dataStream),
            retrieve: retrieveTool,

            // Media & Entertainment
            movie_or_tv_search: movieTvSearchTool,
            trending_movies: trendingMoviesTool,
            trending_tv: trendingTvTool,

            // Location & Maps
            find_place_on_map: findPlaceOnMapTool,
            nearby_places_search: nearbyPlacesSearchTool,
            get_weather_data: weatherTool,

            // Utility Tools
            text_translate: textTranslateTool,
            code_interpreter: codeInterpreterTool,
            track_flight: flightTrackerTool,
            datetime: datetimeTool,
            mcp_search: mcpSearchTool,
            memory_manager: memoryManagerTool,
            extreme_search: extremeSearchTool(dataStream),
            nearby_discovery: nearbyDiscoveryTool,
            greeting: greetingTool,
          },
          experimental_repairToolCall: async ({ toolCall, tools, parameterSchema, error }: { toolCall: any, tools: any, parameterSchema: any, error: any }  ) => {
            console.log('🔍 Tool call repair - Tool name:', toolCall.toolName);
            console.log('🔍 Tool call repair - Available tools:', Object.keys(tools));
            console.log('🔍 Tool call repair - Tool exists:', toolCall.toolName in tools);
            
            // Handle malformed tool calls where the entire JSON is passed as tool name
            if (toolCall.toolName && toolCall.toolName.includes('{') && toolCall.toolName.includes('}')) {
              console.log('🔍 Tool call repair - Detected malformed tool call with JSON in tool name');
              try {
                const jsonStr = toolCall.toolName;
                const parsed = JSON.parse(jsonStr);
                
                // Try to extract the actual tool name and arguments
                if (parsed.queries && (parsed.maxResults || parsed.quality)) {
                  // This looks like a web_search call
                  console.log('🔍 Tool call repair - Attempting to fix web_search call');
                  return {
                    toolName: 'web_search',
                    args: JSON.stringify(parsed)
                  };
                }
                
                // Try other common tools
                const toolNames = Object.keys(tools);
                for (const toolName of toolNames) {
                  if (jsonStr.includes(toolName)) {
                    console.log(`🔍 Tool call repair - Attempting to fix ${toolName} call`);
                    return {
                      toolName: toolName,
                      args: JSON.stringify(parsed)
                    };
                  }
                }
              } catch (parseError) {
                console.log('🔍 Tool call repair - Failed to parse malformed tool call JSON');
              }
            }
            
            if (NoSuchToolError.isInstance(error)) {
              console.log('🔍 Tool call repair - NoSuchToolError detected, not attempting to fix');
              return null; // do not attempt to fix invalid tool names
            }

            console.log('Fixing tool call================================');
            console.log('toolCall', toolCall);
            console.log('tools', tools);
            console.log('parameterSchema', parameterSchema);
            console.log('error', error);

            const tool = tools[toolCall.toolName as keyof typeof tools];

            const { object: repairedArgs } = await generateObject({
              model: ola.languageModel('ola-4o-mini'),
              schema: tool.parameters,
              prompt: [
                `The model tried to call the tool "${toolCall.toolName}"` + ` with the following arguments:`,
                JSON.stringify(toolCall.args),
                `The tool accepts the following schema:`,
                JSON.stringify(parameterSchema(toolCall)),
                'Please fix the arguments.',
                'Do not use print statements stock chart tool.',
                `For the stock chart tool you have to generate a python code with matplotlib and yfinance to plot the stock chart.`,
                `For the web search make multiple queries to get the best results.`,
                `Today's date is ${new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}`,
              ].join('\n'),
            });

            console.log('repairedArgs', repairedArgs);

            return { ...toolCall, args: JSON.stringify(repairedArgs) };
          },
          onChunk(event) {
            if (event.chunk.type === 'tool-call') {
              console.log('Called Tool: ', event.chunk.toolName);
            }
          },
          onStepFinish(event) {
            if (event.warnings) {
              console.log('Warnings: ', event.warnings);
            }
          },
          onFinish: async (event) => {
            console.log('Fin reason: ', event.finishReason);
            console.log('Reasoning: ', event.reasoning);
            console.log('reasoning details: ', event.reasoningDetails);
            console.log('Steps: ', event.steps);
            console.log('Messages: ', event.response.messages);
            console.log('Response Body: ', event.response.body);
            console.log('Provider metadata: ', event.providerMetadata);
            console.log('Sources: ', event.sources);
            console.log('Usage: ', event.usage);



            // Only proceed with user-specific operations if user is authenticated
            if (user?.id && event.finishReason === 'stop') {
              // FIRST: Generate and update title for new conversations (highest priority)
              try {
                const chat = await getChatById({ id });
                if (chat && chat.title === 'New conversation') {
                  console.log('Generating title for new conversation...');
                  const title = await generateTitleFromUserMessage({
                    message: messages[messages.length - 1],
                  });

                  console.log('--------------------------------');
                  console.log('Generated title: ', title);
                  console.log('--------------------------------');

                  // Update the chat with the generated title
                  console.log('🔍 Search API - Updating chat title:', title);
                  await updateChatTitleById({ chatId: id, title });
                  console.log('🔍 Search API - Chat title updated successfully');
                }
              } catch (titleError) {
                console.error('Failed to generate or update title:', titleError);
                // Title generation failure shouldn't break the conversation
              }

              // Track message usage for rate limiting (deletion-proof)
              // Only track usage for models that are not free unlimited
              try {
                if (!shouldBypassRateLimits(model, user)) {
                  await incrementMessageUsage({ userId: user.id });
                }
              } catch (error) {
                console.error('Failed to track message usage:', error);
              }

              // Track extreme search usage if it was used successfully
              if (group === 'extreme') {
                try {
                  // Check if extreme_search tool was actually called
                  const extremeSearchUsed = event.steps?.some((step) =>
                    step.toolCalls?.some((toolCall) => toolCall.toolName === 'extreme_search'),
                  );

                  if (extremeSearchUsed) {
                    console.log('Extreme search was used successfully, incrementing count');
                    await incrementExtremeSearchUsage({ userId: user.id });
                  }
                } catch (error) {
                  console.error('Failed to track extreme search usage:', error);
                }
              }

              // LAST: Save assistant message (after title is generated)
              try {
                console.log('🔍 Search API - Saving assistant message to database');
                const assistantId = getTrailingMessageId({
                  messages: event.response.messages.filter((message: any) => message.role === 'assistant'),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [messages[messages.length - 1]],
                  responseMessages: event.response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments: assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
                console.log('🔍 Search API - Assistant message saved successfully');
              } catch (error) {
                console.error('Failed to save assistant message:', error);
              }
            }

            // Calculate and log overall request processing time
            const requestEndTime = Date.now();
            const processingTime = (requestEndTime - requestStartTime) / 1000;
            console.log('--------------------------------');
            console.log(`Total request processing time: ${processingTime.toFixed(2)} seconds`);
            console.log('--------------------------------');
          },
          onError(event) {
            console.log('Error: ', event.error);
            // Calculate and log processing time even on error
            const requestEndTime = Date.now();
            const processingTime = (requestEndTime - requestStartTime) / 1000;
            console.log('--------------------------------');
            console.log(`Request processing time (with error): ${processingTime.toFixed(2)} seconds`);
            console.log('--------------------------------');
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError(error) {
        console.error('Stream error:', error);
        if (error instanceof Error && error.message.includes('Rate Limit')) {
          return 'Oops, you have reached the rate limit! Please try again later.';
        }
        return 'Oops, an error occurred!';
      },
    });

    // Always return regular stream without Redis
    return new Response(stream);
  } catch (error) {
    console.error('=== API Error Debug Info ===');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause,
      stack: error.stack
    });
    console.error('========================');
    
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return new ChatSDKError('bad_request:api', 'Invalid request format').toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'An unexpected error occurred').toResponse();
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api', 'Chat ID is required').toResponse();
  }

  const session = await auth.api.getSession(request);

  if (!session?.user) {
    return new ChatSDKError('unauthorized:auth', 'Authentication required to resume chat stream').toResponse();
  }

  let chat: Chat | null;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat', 'Access denied to private chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(recentStreamId, () => emptyDataStream);

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}
