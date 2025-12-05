const { Room, RoomEvent, DataPacket_Kind } = require('livekit-client');
const { AccessToken } = require('livekit-server-sdk');
const OpenAI = require('openai');
const tools = require('./tools');
const ws = require('ws');
const wrtc = require('@roamhq/wrtc');
require('dotenv').config({ path: '../.env' });

// Polyfills for Node.js environment
global.WebSocket = ws;
// global.fetch is available in Node 22+
global.RTCPeerConnection = wrtc.RTCPeerConnection;
global.RTCSessionDescription = wrtc.RTCSessionDescription;
global.RTCIceCandidate = wrtc.RTCIceCandidate;
global.navigator = {
    userAgent: 'node',
    mediaDevices: {
        getUserMedia: () => Promise.reject(new Error('Not implemented')),
        enumerateDevices: () => Promise.resolve([])
    }
};
global.window = global;

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://your-project.livekit.cloud';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are a helpful restaurant booking assistant for "Vaiu Voice Agent".
Your goal is to help users book a table.
Collect the following info: Name, Number of Guests, Date, Time, Cuisine Preference, Special Requests.

RULES:
1. LANGUAGE MATCHING IS CRITICAL. If the user speaks English, YOU MUST REPLY IN ENGLISH.
2. If the user speaks Hindi, reply in Hindi (or Hinglish).
3. NEVER switch languages randomly. Mirror the user's language exactly.
4. DO NOT use markdown formatting (like **bold** or *italics*). The response is spoken out loud.
5. ALWAYS check the weather using 'getWeather' tool when a date is mentioned.
6. Suggest "Outdoor" seating if weather is sunny/clear, and "Indoor" if rainy/cold.
7. Check availability using 'checkAvailability' before confirming.
8. Use 'createBooking' to finalize the booking.
9. Be polite and concise.

BONUS LOGIC:
- If weather is "Rainy", say: "It looks like rain that day, I recommend indoor seating."
- If user tries to book a busy slot, say: "Sorry, that time is already booked."
`;

async function createToken(participantName, roomName) {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: participantName });
    at.addGrant({ roomJoin: true, room: roomName });
    return await at.toJwt();
}

const conversationHistory = {};

async function runAgent() {
    const roomName = 'restaurant-booking';
    const participantName = 'agent-bot';

    console.log(`Agent connecting to room: ${roomName}`);
    const token = await createToken(participantName, roomName);

    const room = new Room();

    room.on(RoomEvent.DataReceived, async (payload, participant, kind, topic) => {
        const decoder = new TextDecoder();
        const strData = decoder.decode(payload);
        const participantId = participant?.identity || 'unknown';
        console.log(`Received data from ${participantId}: ${strData}`);

        // Process with OpenAI
        let responseText = await processWithAI(strData, participantId);

        // STRIP MARKDOWN: Remove **, *, #, etc. so TTS doesn't speak them
        responseText = responseText.replace(/[*#_`]/g, '');

        // Send response back
        const encoder = new TextEncoder();
        const data = encoder.encode(responseText);

        await room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
        console.log(`Sent response: ${responseText}`);
    });

    await room.connect(LIVEKIT_URL, token);
    console.log('Agent connected!');
}

async function processWithAI(userText, participantId) {
    // Initialize history for this participant if not exists
    if (!conversationHistory[participantId]) {
        conversationHistory[participantId] = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];
    }

    const messages = conversationHistory[participantId];
    messages.push({ role: 'user', content: userText });
    
    // Keep conversation history manageable (last 20 messages)
    if (messages.length > 20) {
        messages.splice(1, messages.length - 20); // Keep system prompt + last 19 messages
    }

    const toolsDef = [
        {
            type: 'function',
            function: {
                name: 'getWeather',
                description: 'Get weather for a location and date',
                parameters: {
                    type: 'object',
                    properties: {
                        location: { type: 'string' },
                        date: { type: 'string' }
                    },
                    required: ['location', 'date']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'checkAvailability',
                description: 'Check if a booking slot is available',
                parameters: {
                    type: 'object',
                    properties: {
                        date: { type: 'string' },
                        time: { type: 'string' }
                    },
                    required: ['date', 'time']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'createBooking',
                description: 'Create a new restaurant booking',
                parameters: {
                    type: 'object',
                    properties: {
                        customerName: { type: 'string' },
                        numberOfGuests: { type: 'number' },
                        bookingDate: { type: 'string' },
                        bookingTime: { type: 'string' },
                        cuisinePreference: { type: 'string' },
                        specialRequests: { type: 'string' },
                        weatherInfo: { type: 'object' },
                        seatingPreference: { type: 'string' },
                        language: { type: 'string' }
                    },
                    required: ['customerName', 'numberOfGuests', 'bookingDate', 'bookingTime']
                }
            }
        }
    ];

    try {
        let keepProcessing = true;
        let finalResponse = "Sorry, I am having trouble processing your request.";

        while (keepProcessing) {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
                tools: toolsDef,
                tool_choice: 'auto'
            });

            const responseMessage = response.choices[0].message;
            messages.push(responseMessage); // Add assistant message to history

            if (responseMessage.tool_calls) {
                // Handle tool calls
                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    let functionArgs;
                    let functionResult;
                    
                    try {
                        functionArgs = JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        console.error('Error parsing function arguments:', e);
                        functionResult = { error: 'Invalid function arguments' };
                    }

                    if (!functionResult) {
                        try {
                            if (functionName === 'getWeather') {
                                functionResult = await tools.getWeather(functionArgs.location || 'New York', functionArgs.date);
                            } else if (functionName === 'checkAvailability') {
                                functionResult = await tools.checkAvailability(functionArgs.date, functionArgs.time);
                            } else if (functionName === 'createBooking') {
                                functionResult = await tools.createBooking(functionArgs);
                            } else {
                                functionResult = { error: `Unknown function: ${functionName}` };
                            }
                        } catch (error) {
                            console.error(`Error executing ${functionName}:`, error);
                            functionResult = { error: `Failed to execute ${functionName}` };
                        }
                    }

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: functionName,
                        content: JSON.stringify(functionResult)
                    });
                }
                // Loop continues to process tool results
            } else {
                // No more tool calls, this is the final response
                finalResponse = responseMessage.content;
                keepProcessing = false;
            }
        }

        return finalResponse;
    } catch (error) {
        console.error('OpenAI Error:', error);
        return "Sorry, I am having trouble processing your request.";
    }
}

runAgent().catch(console.error);
