import operator
from typing import Literal, TypedDict, Any, Annotated
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import StreamWriter, interrupt, Send, RunnableConfig
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, ToolMessageChunk, AIMessageChunk, ToolMessage
from langchain_core.tools import tool
import random
import asyncio

load_dotenv()


class Weather(TypedDict):
    location: str
    search_status: str
    result: str


class State(MessagesState):
    # letters: Annotated[list, operator.add]
    weather_forecast: Annotated[list[Weather], operator.add]


class WeatherInput(TypedDict):
    location: str
    tool_call_id: str


class ToolNodeArgs(TypedDict):
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


async def weather_deprecated(state: State, writer: StreamWriter):
    last_message = state["messages"][-1]
    tool_call_id = last_message.tool_calls[0]["id"]
    last_message_args = last_message.tool_calls[0]["args"]

    # Send custom event to the client. It will update the state.
    writer({"weather_search_status": f"Checking weather in {
           last_message_args['query']}"})

    await asyncio.sleep(2)
    weather = random.choice(["Sunny", "Cloudy", "Rainy", "Snowy"])

    return {"messages": [ToolMessage(content=weather, tool_call_id=tool_call_id)], "weather_result": weather, "weather_search_status": ""}


async def weather(input: WeatherInput, writer: StreamWriter):
    location = input["location"]
    tool_call_id = input["tool_call_id"]

    # Send custom event to the client. It will update the state of the last checkpoint and all child nodes.
    # Note: if there are multiple child nodes (e.g. parallel nodes), the state will be updated for all of them.
    writer({"weather_forecast": [
           {"location": location, "search_status": f"Checking weather in {location}"}]})

    await asyncio.sleep(2)
    weather = random.choice(["Sunny", "Cloudy", "Rainy", "Snowy"])

    return {"messages": [ToolMessage(content=weather, tool_call_id=tool_call_id)], "weather_forecast": [{"location": location, "search_status": "", "result": weather}]}


async def reminder_deprecated(state: State):
    last_message = state["messages"][-1]
    tool_call_id = last_message.tool_calls[0]["id"]
    reminder_text = last_message.tool_calls[0]["args"]["reminder_text"]

    res = interrupt(reminder_text)

    tool_answer = "Reminder created." if res == 'approve' else "Reminder creation cancelled by user."

    return {"messages": [ToolMessage(content=tool_answer, tool_call_id=tool_call_id)]}


async def reminder(input: ToolNodeArgs):
    res = interrupt(input['args']['reminder_text'])

    tool_answer = "Reminder created." if res == 'approve' else "Reminder creation cancelled by user."

    return {"messages": [ToolMessage(content=tool_answer, tool_call_id=input["id"])]}


async def chatbot(state: State):
    llm = ChatOpenAI(
        model="gpt-4o-mini").bind_tools([weather_tool, create_reminder_tool])
    response = await llm.ainvoke(state["messages"])
    return {"messages": [response]}


def tool_router(state: State) -> Literal["weather", "reminder", "__end__"]:
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        if last_message.tool_calls[0]["name"] == "weather_tool":
            return "weather"
        elif last_message.tool_calls[0]["name"] == "create_reminder_tool":
            return "reminder"
    return "__end__"


# Chatbot node router. Based on tool calls, creates the list of the next parallel nodes.
def assign_tool(state: State) -> Literal["weather", "reminder", "__end__"]:
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        send_list = []
        for tool in last_message.tool_calls:
            if tool["name"] == 'weather_tool':
                send_list.append(
                    Send('weather', {'location': tool['args']['query'], 'tool_call_id': tool['id']}))
            elif tool["name"] == 'create_reminder_tool':
                send_list.append(Send('reminder', tool))
        return send_list if len(send_list) > 0 else "__end__"
    return "__end__"


def hitl_router(state: State) -> Literal["hitl_node", "__end__"]:
    if state["search_results"] == "y":
        return "hitl_node"
    return "__end__"


async def a_node(state: State):
    # res = interrupt("a")
    return {"letters": ["a"]}


async def b_node(state: State, writer: StreamWriter):
    # res = interrupt("b")
    writer({"letters": ["bb"]})
    return {"letters": ["b"]}


async def c_node(state: State):
    # res = interrupt("c")
    return {"letters": ["c"]}


async def d_node(state: State):
    return {"letters": ["d"]}


builder = StateGraph(State)

# tool_node = ToolNode([weather_tool, create_reminder_tool])
# builder.add_node("tools", tool_node)
# builder.add_edge("tools", "chatbot")

builder.add_node("chatbot", chatbot)
builder.add_node("weather", weather)
builder.add_node("reminder", reminder)

builder.add_edge(START, "chatbot")
builder.add_conditional_edges("chatbot", assign_tool)
builder.add_edge("weather", "chatbot")
builder.add_edge("reminder", "chatbot")

builder.add_edge("chatbot", END)

# testing parallel nodes
# builder.add_node("a_node", a_node)
# builder.add_node("b_node", b_node)
# builder.add_node("c_node", c_node)
# builder.add_node("d_node", d_node)
# builder.add_edge(START, "a_node")
# builder.add_edge("a_node", "b_node")
# builder.add_edge("a_node", "c_node")
# builder.add_edge("b_node", "d_node")
# builder.add_edge("c_node", "d_node")
# builder.add_edge("d_node", END)

memory = MemorySaver()
graph = builder.compile(checkpointer=memory)
