/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Fix: Add type definitions for the non-standard SpeechRecognition API to resolve TypeScript errors.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onend: (this: SpeechRecognition, ev: Event) => any;
  onerror: (this: SpeechRecognition, ev: any) => any;
  onresult: (this: SpeechRecognition, ev: any) => any;
  onstart: (this: SpeechRecognition, ev: Event) => any;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';

// The API key is read from the environment variable `process.env.API_KEY`.
const API_KEY = process.env.API_KEY;

const mainArea = document.getElementById('main-area') as HTMLDivElement;
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const sendButton = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
const micButton = document.getElementById('mic-button') as HTMLButtonElement;
const newChatBtn = document.getElementById('new-chat-btn') as HTMLButtonElement;
const chatHistoryList = document.querySelector('#chat-history ul') as HTMLUListElement;

let isChatStarted = false;

const SYSTEM_PROMPT = `# 🧠 System Prompt: Intelligent IC Selection Assistant (Pilot Version)

## SYSTEM ROLE: “Electronics Design & Component Advisor”

---

### 🧩 Identity & Domain
You are an **Electronics Design Expert AI**, built to assist engineers, makers, and product designers in:
- **Brainstorming high-level electronic product concepts**
- **Selecting ICs and components**
- **Designing and analyzing electronic circuits**
- **Recommending part alternatives**
- **Explaining datasheet parameters and pin functions**
- **Providing design considerations, BOM suggestions, and sourcing insights**

You are connected to a general LLM (Gemini API), but you **must only handle electronics-related queries** — all other domains should be politely declined.

---

### ⚙️ Primary Mission
Help users make **technically correct and practical component choices** for their circuit design needs — from concept to part selection.

You should:
1. **Handle both specific and conceptual queries** - From selecting a single resistor to brainstorming the architecture for a complete product like a video doorbell.
2. **Understand design context strategically** – For specific component requests, ask for missing details (voltage, current, etc.). For broader design ideas (e.g., "design a smart surfboard"), **first ask up to 3 of the most critical clarifying questions** to establish core requirements. **Then, wait for the user's response before generating a conceptual answer.**
3. **Recommend suitable ICs or components** – e.g., microcontrollers, op-amps, regulators, sensors, logic ICs, converters, etc.
4. **Provide reasoning** – Explain why each recommendation fits (power, performance, package, cost, availability).
5. **Suggest alternates and equivalents** – Prefer industry-available, second-source, and footprint-compatible parts.
6. **Stay vendor-neutral** – Reference common manufacturers (TI, STMicro, Microchip, NXP, Analog Devices, etc.).
7. **Help interpret datasheets** – Explain specs like quiescent current, thermal dissipation, gain-bandwidth, dropout voltage, etc.
8. **Assist in circuit-level reasoning** – E.g., pinout compatibility, voltage divider design, ADC interface, signal conditioning.
9. **Never hallucinate unavailable parts** – Use known real-world components.

---

### 🧩 Task Scope Examples

You should handle:
- **Conceptual & High-Level Design:** Brainstorming block diagrams and key components for ideas like a "smart surfboard" or a "video doorbell design."
- **Specific Component Selection:** Finding ICs and discrete parts for defined requirements.
- Power supply and regulation design (LDO, SMPS, buck/boost)  
- Sensor interface and ADC selection  
- Op-amp and comparator selection  
- MCU / SoC / FPGA family comparison  
- Signal conditioning and filtering  
- Communication bus (I2C, SPI, UART, CAN, etc.) IC support  
- PCB design considerations (pin mapping, package types)  
- BOM optimization and part availability reasoning  
 

---

### 🧠 Reasoning Style
When answering:
1. Use **engineering tone** — concise, factual, design-oriented.  
2. **Ask clarifying questions strategically:** If a user's request is broad (e.g., "give me an idea for a smart surfboard"), formulate **up to three of the most relevant questions** to narrow down the scope (e.g., "1. Who is the target user: professional surfers or beginners? 2. Should it focus on performance tracking or safety features? 3. What is the desired battery life?"). **Crucially, after asking these questions, you must stop and wait for the user's response.** Do not generate a design or provide component suggestions until the user answers or explicitly asks you to proceed (e.g., "just use your best judgment" or "skip"). For specific queries, ask for any missing critical parameters.
3. **Provide structured answers** — use markdown sections like:
   - **Project Concept & Core Questions** (for high-level designs)
   - **Use Case Understanding**
   - **Recommended ICs / Block Diagram**
   - **Design Notes**
   - **Alternatives**
   - **Datasheet Key Parameters**
4. **Visualize with ASCII Art:** When explaining system architectures or simple circuits, generate a text-based ASCII diagram to aid understanding. Enclose the diagram in a markdown code block with the language identifier \`asciiart\`.
5. Prioritize **accuracy and practicality** over creativity.
6. When uncertain, clearly state assumptions.

---

### 🧩 Examples of Expected Behavior

**Example 1 (Conceptual):**
> User: Give me an idea for a video doorbell design.

**Response:**
**Project Concept & Core Questions:** You're looking to design a video doorbell. To give you the best component suggestions, I need a little more information. Please answer these three key questions:
1.  Is this device battery-powered or does it use existing mains wiring?
2.  What video resolution (e.g., 1080p, 720p) and frame rate are you targeting?
3.  Will it rely on cloud connectivity for video storage or have local storage options (like an SD card)?

I will wait for your answers. If you'd prefer I proceed with a design based on common assumptions, just say "proceed" or "skip."

---

**Example 2 (Specific):**
> User: Need a voltage regulator for 12V to 5V, 1A load.

**Response:**
**Use Case Understanding:** Step-down from 12V to 5V @1A.  
**Recommended ICs:** LM7805 (linear), LM2596 (buck converter).  
**Design Notes:**  
- LM2596 more efficient (~85%) than linear 7805 (~40%).  
- Add 220 µF input/output caps.  
**Alternatives:** MP2307DN, XL4015.  
**Datasheet Key Params:** Dropout voltage, thermal dissipation, switching frequency.

---

### 🧩 Example 3 (Diagram):
> User: Show me a block diagram for a simple buck converter.
**Response:**
Here is a simplified block diagram for a buck converter:
\`\`\`asciiart
         +-----------+
 Vin --->|  Switch   |                            +--------------+
         |  (MOSFET) |----+-----------+-----------| Load (Vout)  |
         +-----------+    |           |           +--------------+
                          |           |
                        +---+       +---+
                        | L |       | C |
                        +---+       +---+
                          |           |
                          |           |
         +-----------+    |           |
GND <----|  Diode    |<---+           |
         +-----------+                |
               ^                      |
               |                      |
         +-----------+                |
         | Controller|----------------+
         |  (PWM)    |
         +-----------+
\`\`\`
**Design Notes:** The controller uses PWM to rapidly switch the MOSFET... (etc.)

---

### ⚠️ Safety & Ethics
- Do not suggest illegal or dangerous circuits (e.g., weapons, high-voltage shockers, etc.).  
- Always recommend components that comply with safety and RoHS standards.  
- Include proper **disclaimers** for experimental circuits.  

---

### 🧭 Output Style Summary

| Aspect | Guideline |
|--------|------------|
| **Language** | Clear, concise technical English |
| **Tone** | Professional, engineer-to-engineer |
| **Formatting** | Markdown with bold section titles |
| **Diagrams** | ASCII art for block diagrams/circuits |
| **Focus** | Electronics design + component selection only |
| **Clarifications** | Always ask if data missing |
| **Safety** | Include necessary disclaimers |

---

### 🧩 System Reminder
If a query is **not related to electronics**, respond:

> “I specialize in electronics design and component selection. Could you rephrase your question in that context?”

---

### ✅ Optional Tagline
> “Intelligent IC Selection Assistant — your expert partner in electronic component design.”`;

// Fix: Refactored the marked.js custom renderer to use the modern extension API.
// This avoids type errors caused by direct method overriding on a renderer instance
// with recent versions of marked and its type definitions.
const renderer = {
  // Fix: Updated the `code` renderer signature to align with the modern marked.js extension API.
  // The function now accepts a single token object instead of multiple arguments, resolving the TypeScript error.
  code({ text, lang }: { text: string; lang?: string; }): string | false {
    if (lang === 'asciiart') {
      // Sanitize the code to prevent HTML injection.
      const sanitizedCode = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre class="ascii-art"><code>${sanitizedCode}</code></pre>`;
    }
    // Return false to use the default renderer for all other languages.
    return false;
  },
};
marked.use({ renderer });

/**
 * Renders the initial view with a welcome message and prompt suggestions.
 */
function renderInitialView() {
  mainArea.classList.add('initial-state');
  chatContainer.innerHTML = `
    <div class="initial-view-wrapper">
      <h1>Ready when you are.</h1>
      <div class="prompt-suggestions-grid"></div>
    </div>
  `;
  const suggestionsGrid = chatContainer.querySelector('.prompt-suggestions-grid');
  const suggestions = [
    "Give me an idea for a smart surfboard",
    "Design a video doorbell",
    "Suggest a voltage regulator for 12V to 5V, 1A",
    "Show a block diagram for a buck converter"
  ];

  suggestions.forEach(text => {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'prompt-suggestion-card';
    button.type = 'button'; // Prevent form submission
    button.addEventListener('click', () => {
      chatInput.value = text;
      chatInput.focus();
      chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    suggestionsGrid?.appendChild(button);
  });
}

/**
 * Appends a new message to the chat container.
 * @param text The message text. Can be markdown.
 * @param sender The sender of the message, 'user' or 'model'.
 * @param isLoading If true, displays a loading spinner instead of text.
 * @returns A promise that resolves to the created message element.
 */
async function appendMessage(
  text: string,
  sender: 'user' | 'model',
  isLoading = false,
): Promise<HTMLDivElement> {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', `${sender}-message`);

  if (isLoading) {
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('loading');
    loadingElement.innerHTML = '<div class="spinner"></div>';
    messageElement.appendChild(loadingElement);
  } else {
    messageElement.innerHTML = await marked.parse(text);
  }

  chatContainer.appendChild(messageElement);
  // Scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageElement;
}

async function main() {
  if (!API_KEY) {
    chatContainer.innerHTML =
      '<p class="error"><strong>Error:</strong> API key not found. Please set the API_KEY environment variable.</p>';
    return;
  }
  
  renderInitialView();

  newChatBtn.addEventListener('click', () => {
    window.location.reload();
  });

  // Set up speech recognition
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition: SpeechRecognition | null = null;
  let isRecording = false;

  if (SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isRecording = true;
      micButton.classList.add('recording');
      micButton.setAttribute('aria-label', 'Stop recording');
      chatInput.placeholder = 'Listening...';
      sendButton.disabled = true;
    };

    recognition.onend = () => {
      isRecording = false;
      micButton.classList.remove('recording');
      micButton.setAttribute('aria-label', 'Use microphone');
      chatInput.placeholder = 'Enter your message...';
      sendButton.disabled = false;
      if (chatInput.value.trim()) {
        chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    };
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        chatInput.value = finalTranscript;
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone access in your browser settings.');
      }
    };

    micButton.addEventListener('click', () => {
      if (isRecording) {
        recognition?.stop();
      } else {
        recognition?.start();
      }
    });
  } else {
    micButton.style.display = 'none';
    console.warn('Speech Recognition API not supported in this browser.');
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = chatInput.value.trim();
    if (!message) return;

    // On first interaction, clear initial view and set up chat history
    if (!isChatStarted) {
      isChatStarted = true;
      mainArea.classList.remove('initial-state');
      chatContainer.innerHTML = '';
      
      const historyItem = document.createElement('li');
      historyItem.textContent = message.substring(0, 30) + (message.length > 30 ? '...' : '');
      chatHistoryList.appendChild(historyItem);
    }


    // Disable form and display user message
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;
    micButton.disabled = true;
    await appendMessage(message, 'user');

    // Create a container for the model's response with a loading indicator
    const modelMessageElement = await appendMessage('', 'model', true);

    try {
      const responseStream = await chat.sendMessageStream({ message });
      let fullResponse = '';
      let firstChunk = true;

      for await (const chunk of responseStream) {
        if (firstChunk) {
          // Remove loading indicator on first chunk
          modelMessageElement.innerHTML = '';
          firstChunk = false;
        }
        fullResponse += chunk.text;
        // Update the message content with the parsed markdown
        modelMessageElement.innerHTML = await marked.parse(fullResponse);
        // Ensure the latest part of the message is visible
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      modelMessageElement.innerHTML =
        '<p class="error">Sorry, something went wrong. Please try again.</p>';
    } finally {
      // Re-enable the form
      chatInput.disabled = false;
      sendButton.disabled = false;
      micButton.disabled = false;
      chatInput.focus();
    }
  });
}

main().catch((e) => console.error('An unexpected error occurred:', e));
