import asyncio
import os
from uuid import uuid4

from agents import (
    Agent,
    AsyncOpenAI,
    OpenAIChatCompletionsModel,
    Runner,
    SQLiteSession,
    function_tool,
    set_tracing_disabled,
)
from dotenv import load_dotenv
from openai.types.responses import ResponseTextDeltaEvent
from pinecone import Pinecone


load_dotenv()

# gemini_api_key = os.getenv("GEMINI_API_KEY")

gemini_api_key = os.getenv("GEMINI_API_KEY")
pinecone_api_key = os.getenv("PINECONE_API_KEY")

print(f"DEBUG: Key length is {len(pinecone_api_key) if pinecone_api_key else 0}")
print(f"DEBUG: Key starts with: {pinecone_api_key[:8]}...")

# if gemini_api_key:
#     print("Gemini API Key loaded.")
if gemini_api_key:
    print(f"gemini_api_key API Key loaded. Starts with: {gemini_api_key[:15]}...")
if pinecone_api_key:
    print("Pinecone API Key loaded.")


# Pinecone index for RAG
INDEX_NAME = "ai-vector-embeddings"
NAMESPACE = "example_namespace"

pc = Pinecone(api_key=pinecone_api_key)
# dense_index = pc.Index(INDEX_NAME) if pc.has_index(INDEX_NAME) else None
# if not pc.has_index(INDEX_NAME):
#     pc.create_index_for_model(
#         name=INDEX_NAME,
#         cloud= "aws",
#         region="us-east-1",
#         embed= {
#             "model" : "llama-text-embed-v2",
#             "field_map": {"text":"chunk_text"}
#          }
#     )

dense_index = pc.Index(INDEX_NAME)


@function_tool
def search_knowledge_base(query: str) -> str:
    """Search the Takhleeq knowledge base for relevant information.
    Call this when you need to answer questions about Takhleeq, policies, or documented facts.
    Args:
        query: The search question or topic to look up (e.g. "What is Takhleeq?", "refund policy").
    """
    if dense_index is None:
        return "Knowledge base is not available (index not found)."
    try:
        result = dense_index.search(
            namespace=NAMESPACE,
            query={
                "top_k": 100,
                "inputs": {"text": query},
            },
            rerank={
                "model": "bge-reranker-v2-m3",
                "top_n": 100,
                "rank_fields": ["chunk_text"],
            },
        )
        hits = result.get("result", {}).get("hits", [])
        if not hits:
            return "No relevant passages found in the knowledge base."
        parts = []
        for i, hit in enumerate(hits, 1):
            text = hit.get("fields", {}).get("chunk_text", "")
            if text:
                parts.append(f"[{i}] {text.strip()}")
        return "\n\n".join(parts) if parts else "No relevant passages found."
    except Exception as e:
        return f"Search failed: {e}"


external_client = AsyncOpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    # base_url="https://openrouter.ai/api/v1",
)

model = OpenAIChatCompletionsModel(
    # model="gemini-2.0-flash",
    model="gemini-1.5-flash",
    openai_client=external_client,
)

set_tracing_disabled(disabled=True)



# Read instructions from the markdown file
_instruction_file = os.path.join(os.path.dirname(__file__), "dynamic_instruction.md")
with open(_instruction_file, "r", encoding="utf-8") as f:
    dynamic_instruction = f.read()


agent = Agent(
    name="Takhleeq AI Assistant",
    instructions= dynamic_instruction,
    model=model,
    tools=[search_knowledge_base],
)

print("Loaded Instructions Length:", len(dynamic_instruction))

# SQLite file for persistent session storage (OpenAI Agents SDK)
SESSIONS_DB = os.path.join(os.path.dirname(__file__), "sessions", "conversations.db")
os.makedirs(os.path.dirname(SESSIONS_DB), exist_ok=True)


async def stream_agent_response(session, user_input):
    """Async generator that runs the agent with streaming. Yields (event_type, data) tuples.
    - ("text", str): token to display
    - ("tool_call", tool_name): agent is calling a tool (e.g. "search_knowledge_base")
    """
    result = Runner.run_streamed(agent, input=user_input, session=session)
    async for event in result.stream_events():
        if event.type == "raw_response_event":
            if isinstance(event.data, ResponseTextDeltaEvent):
                delta = event.data.delta or ""
                if delta:
                    yield ("text", delta)
        elif event.type == "run_item_stream_event":
            if getattr(event, "item", None) and getattr(event.item, "type", None) == "tool_call_item":
                tool_name = getattr(event.item, "name", None) or "tool"
                yield ("tool_call", tool_name)


async def main():
    """Run a continuous conversation loop with streaming and SDK session memory."""
    session_id = str(uuid4())
    session = SQLiteSession(session_id, SESSIONS_DB)

    print("👋 Welcome! I'm the Takhleeq AI Assistant.")
    print(f"   Session: {session_id[:8]}... (conversation stored via OpenAI Agents SDK)")
    print("   Commands: /new (fresh chat), /session (show id), exit/quit/bye (end)\n")

    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit", "bye"):
            print("Goodbye! Have a great day.")
            break

        if user_input.lower() == "/new":
            await session.clear_session()
            session_id = str(uuid4())
            session = SQLiteSession(session_id, SESSIONS_DB)
            print("🔄 New session started. Previous context cleared.")
            continue
        if user_input.lower() == "/session":
            print(f"   Session ID: {session.session_id[:8]}...")
            continue

        print("\nAssistant: ", end="", flush=True)

        async for event_type, data in stream_agent_response(session, user_input):
            if event_type == "text":
                print(data, end="", flush=True)
            elif event_type == "tool_call":
                print(f"\n[Searching knowledge base...] ", end="", flush=True)

        print()


if __name__ == "__main__":
    asyncio.run(main())
