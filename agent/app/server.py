import uvicorn
from langgraph.types import Command, Interrupt
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from typing import AsyncGenerator, Dict
from app.utils import message_chunk_event, interrupt_event, custom_event, checkpoint_event, format_state_snapshot
import asyncio

from app.agent.graph import graph

# Track active connections
active_connections: Dict[str, asyncio.Event] = {}

app = FastAPI(
    title="LangGraph API",
    description="API for LangGraph interactions",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/state")
async def state(thread_id: str | None = None):
    """Endpoint returning current graph state."""
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id is required")

    config = {"configurable": {"thread_id": thread_id}}

    state = await graph.aget_state(config)
    return format_state_snapshot(state)


@ app.get("/history")
async def history(thread_id: str | None = None):
    """Endpoint returning complete state history. Used for restoring graph."""
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id is required")

    config = {"configurable": {"thread_id": thread_id}}

    records = []
    async for state in graph.aget_state_history(config):
        records.append(format_state_snapshot(state))
    return records


@app.post("/agent/stop")
async def stop_agent(request: Request):
    """Endpoint for stopping the running agent."""
    body = await request.json()
    thread_id = body.get("thread_id")
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id is required")

    if thread_id in active_connections:
        active_connections[thread_id].set()
        return {"status": "stopped", "thread_id": thread_id}
    raise HTTPException(status_code=404, detail="Thread is not running")


@app.post("/agent")
async def agent(request: Request):
    """Endpoint for running the agent."""
    body = await request.json()

    request_type = body.get("type")
    if not request_type:
        raise HTTPException(status_code=400, detail="type is required")

    thread_id = body.get("thread_id")
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id is required")

    stop_event = asyncio.Event()
    active_connections[thread_id] = stop_event

    config = {"configurable": {"thread_id": thread_id}}

    if request_type == "run":
        input = body.get("state", None)
    elif request_type == "resume":
        resume = body.get("resume")
        if not resume:
            raise HTTPException(status_code=400, detail="resume is required")
        input = Command(resume=resume)
    elif request_type == "fork":
        config = body.get("config")
        if not config:
            raise HTTPException(status_code=400, detail="config is required")
        input = body.get("state", None)
        print("input before update:", input)
        print("config before update:", config)
        config = await graph.aupdate_state(config, input)
        input = None
    elif request_type == "replay":
        config = body.get("config")
        if not config:
            raise HTTPException(status_code=400, detail="config is required")
        input = None
    else:
        raise HTTPException(status_code=400, detail="invalid request type")

    print("request_type:", request_type)
    print("thread_id:", thread_id)
    print("input:", input)
    print("config:", config)

    async def generate_events() -> AsyncGenerator[dict, None]:
        try:
            async for chunk in graph.astream(
                input,
                config,
                stream_mode=["debug", "messages", "updates", "custom"],
            ):
                if stop_event.is_set():
                    break

                chunk_type, chunk_data = chunk

                if chunk_type == "debug":
                    # type can be checkpoint, task, task_result
                    debug_type = chunk_data["type"]
                    if debug_type == "checkpoint":
                        yield checkpoint_event(chunk_data)
                    elif debug_type == "task_result":
                        interrupts = chunk_data["payload"].get(
                            "interrupts", [])
                        if interrupts and len(interrupts) > 0:
                            yield interrupt_event(interrupts)
                elif chunk_type == "messages":
                    yield message_chunk_event(chunk_data[1]["langgraph_node"], chunk_data[0])
                elif chunk_type == "custom":
                    yield custom_event(chunk_data)
        finally:
            if thread_id in active_connections:
                del active_connections[thread_id]

    return EventSourceResponse(generate_events())


def main():
    uvicorn.run("app.server:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
