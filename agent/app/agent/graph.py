import operator
from typing import Literal, TypedDict, Any, Annotated
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import StreamWriter, interrupt, Send
from langchain_core.messages import ToolMessage
from langchain_core.tools import tool
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_mcp_adapters.client import MultiServerMCPClient
from mcp import ClientSession, StdioServerParameters
from mcp.client.sse import sse_client
from mcp.client.stdio import stdio_client
import random
import asyncio


load_dotenv()

# MCP servers to connect to
mcp_servers = {
    "booking": {
        "url": "http://localhost:3001/sse",
        "transport": "sse",
    },
    # MCP server example with stdio transport protocol
    # Make sure to update to the full absolute path to script file
    # "test": {
    #     "command": "python",
    #     "args": ["/path/to/math_server.py"],
    #     "transport": "stdio",
    # },
}

# Global variable to store MCP servers and their tools. Populated by initialize_mcp_tools()
mcp_servers_with_tools = {}


class Weather(TypedDict):
    location: str
    search_status: str
    result: str


class State(MessagesState):
    weather_forecast: Annotated[list[Weather], operator.add]


class WeatherInput(TypedDict):
    location: str
    tool_call_id: str


class ToolNodeArgs(TypedDict):
    name: str
    args: dict[str, Any]
    id: str


class McpToolNodeArgs(TypedDict):
    server_name: str
    name: str
    args: dict[str, Any]
    id: str


@tool
async def weather_tool(query: str) -> str:
    """Call to get current weather"""
    return "Sunny"


@tool
async def create_reminder_tool(reminder_text: str) -> str:
    """Call to create a reminder"""
    return "Reminder created"


async def weather(input: WeatherInput, writer: StreamWriter):
    location = input["args"]["query"]

    # Send custom event to the client. It will update the state of the last checkpoint and all child nodes.
    # Note: if there are multiple child nodes (e.g. parallel nodes), the state will be updated for all of them.
    writer({"weather_forecast": [
           {"location": location, "search_status": f"Checking weather in {location}"}]})

    await asyncio.sleep(2)
    weather = random.choice(["Sunny", "Cloudy", "Rainy", "Snowy"])

    return {"messages": [ToolMessage(content=weather, tool_call_id=input["id"])], "weather_forecast": [{"location": location, "search_status": "", "result": weather}]}


async def reminder(input: ToolNodeArgs):
    res = interrupt(input['args']['reminder_text'])

    tool_answer = "Reminder created." if res == 'approve' else "Reminder creation cancelled by user."

    return {"messages": [ToolMessage(content=tool_answer, tool_call_id=input["id"])]}


async def mcp_tool(input: McpToolNodeArgs):
    if input["server_name"] not in mcp_servers:
        raise ValueError(
            f"Server with name {input['server_name']} not found in MCP servers list")

    protocol = mcp_servers[input["server_name"]]["transport"]

    tool_result = None
    if protocol == "sse":
        async with sse_client(mcp_servers[input["server_name"]]["url"]) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                tool_result = await session.call_tool(input["name"], input["args"])
    elif protocol == "stdio":
        server_params = StdioServerParameters(
            command=mcp_servers[input["server_name"]]["command"],
            args=mcp_servers[input["server_name"]]["args"],
            env=None,  # Optional environment variables
        )
        async with stdio_client(server_params) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                tool_result = await session.call_tool(input["name"], input["args"])

    if not tool_result or tool_result.isError or not tool_result.content:
        return {"messages": [ToolMessage(content="Error calling tool", tool_call_id=input["id"])]}

    return {"messages": [ToolMessage(content=tool_result.content[0].text, tool_call_id=input["id"])]}


async def chatbot(state: State):
    tools = [
        weather_tool,
        create_reminder_tool,
    ] + [tool for tools_list in mcp_servers_with_tools.values() for tool in tools_list]

    llm = ChatOpenAI(model="gpt-4o-mini").bind_tools(tools)
    response = await llm.ainvoke(state["messages"])
    return {"messages": [response]}


# Chatbot node router. Based on tool calls, creates the list of the next parallel nodes.
def assign_tool(state: State) -> Literal["weather", "reminder", "mcp_tool", "__end__"]:
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        send_list = []
        for tool in last_message.tool_calls:
            if tool["name"] == 'weather_tool':
                send_list.append(Send('weather', tool))
            elif tool["name"] == 'create_reminder_tool':
                send_list.append(Send('reminder', tool))
            elif any(tool["name"] == mcp_tool.name for mcp_tool in [tool for tools_list in mcp_servers_with_tools.values() for tool in tools_list]):
                args = McpToolNodeArgs(
                    server_name="booking",
                    name=tool["name"],
                    args=tool["args"],
                    id=tool["id"]
                )
                send_list.append(Send('mcp_tool', args))
        return send_list if len(send_list) > 0 else "__end__"
    return "__end__"


async def initialize_mcp_tools():
    global mcp_servers_with_tools
    try:
        async with MultiServerMCPClient(mcp_servers) as client:
            mcp_servers_with_tools = client.server_name_to_tools
    except Exception as e:
        print(f"Error initializing MCP tools: {str(e)}")


async def init_agent():
    # LangGraph Studio do not have access to local MCP servers as it is running in docker
    # await initialize_mcp_tools()

    builder = StateGraph(State)

    builder.add_node("chatbot", chatbot)
    builder.add_node("weather", weather)
    builder.add_node("reminder", reminder)
    builder.add_node("mcp_tool", mcp_tool)

    builder.add_edge(START, "chatbot")
    builder.add_conditional_edges("chatbot", assign_tool)
    builder.add_edge("weather", "chatbot")
    builder.add_edge("reminder", "chatbot")
    builder.add_edge("mcp_tool", "chatbot")

    builder.add_edge("chatbot", END)

    memory = MemorySaver()
    graph = builder.compile(checkpointer=memory)
    graph.name = "LangGraph Agent"
    return graph

# TODO: this is needed for LangGraph Studio. Need to refactor it
# graph = asyncio.run(init_agent())
