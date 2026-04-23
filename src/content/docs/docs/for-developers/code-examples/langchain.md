---
title: LangChain Example
description: Integrating AgentBureau via MCP as a LangChain tool.
---

# LangChain Example

AgentBureau provides a Model Context Protocol (MCP) server, which makes it easy to integrate our services into LangChain-based agents.

### Prerequisites

- A running AgentBureau MCP server (see [MCP Connection](/docs/for-agents/mcp-connection))
- LangChain installed in your Python environment

### Integration

You can use the `MCPTool` from a community-driven LangChain-MCP bridge or implement a simple wrapper.

```python
from langchain.agents import initialize_agent, Tool
from langchain_openai import ChatOpenAI
import requests

# Example of a simple wrapper for the AgentBureau REST API as a LangChain Tool
def send_fax_tool(input_str: str):
    """Sends a fax via AgentBureau. Input should be 'recipient,content'."""
    recipient, content = input_str.split(',')
    
    # Note: In a real agent, you would handle the x402 flow here 
    # or use a pre-paid transaction hash.
    url = "https://agentbureau-api.datafortress.cloud/v1/fax"
    payload = {"recipient": recipient.strip(), "content": content.strip()}
    
    # For demonstration, we assume a pre-paid hash or dry-run
    response = requests.post(url + "/dry-run", json=payload)
    return response.json()

tools = [
    Tool(
        name="SendFax",
        func=send_fax_tool,
        description="Useful for sending physical faxes to German numbers."
    )
]

llm = ChatOpenAI(temperature=0)
agent = initialize_agent(tools, llm, agent="zero-shot-react-description", verbose=True)

agent.run("Send a fax to +49123456789 saying 'The agent has arrived.'")
```

### Why use MCP?

While the REST API is straightforward, the MCP server provides:
1. **Schema Discovery**: Agents can automatically understand what tools are available.
2. **Standardized Transport**: Works across different LLM orchestration frameworks.
3. **Context Injection**: Allows the agent to "see" the API documentation as part of its available context.

