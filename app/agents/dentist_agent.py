"""
app/agents/dentist_agent.py
=============================
The dentist-facing agent. Three tools, no domain restriction needed
(a dentist's queries are naturally in-scope for a clinical assistant).

dentist_name is bound from the logged-in user's own name (via auth
token), same security pattern as patient_id in patient_agent.py —
the LLM can't impersonate another dentist's schedule.

patient_id, by contrast, is something the dentist SHOULD be able to
supply freely — they're allowed to look up any patient, that's the
whole point of the search tool.
"""

import os
from sqlalchemy.orm import Session
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from datetime import date
from app.agents import tools as db_tools
from app.config import settings

SYSTEM_PROMPT = """You are Dentlaal's assistant for dentists. You help with:
1. Searching for patients by name or patient ID.
2. Pulling up a patient's treatment and appointment history.
3. Reporting the dentist's own schedule for today.

Be concise and clinical in tone. When listing search results or
schedules, use clear formatting (e.g. a short list) rather than dense
paragraphs — the dentist is scanning this quickly between patients.
List each distinct appointment or result exactly once — do not repeat
the same entry.

Do not use Markdown formatting (no **, no #, no bullet dashes) — write in plain, 
natural sentences and paragraphs, since your replies are displayed as plain text.
"""


def build_dentist_agent(db: Session, dentist_name: str):
    today_str = date.today().strftime("%A, %B %d, %Y")  # e.g. "Tuesday, August 18, 2026"
    @tool
    def search_patients(query: str) -> list:
        """Search for patients by name or external patient ID (partial match)."""
        return db_tools.search_patients(db, query)

    @tool
    def get_patient_history(patient_id: int) -> dict:
        """Get a patient's full record: profile, appointment history, and tooth treatment history."""
        return db_tools.get_patient_history(db, patient_id)

    @tool
    def get_today_schedule() -> list:
        """Get the requesting dentist's own appointment schedule for today."""
        return db_tools.get_today_schedule(db, dentist_name)  # <-- bound, not LLM-supplied

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        #model="gemini-3.5-flash-lite",
        google_api_key=settings.gemini_api_key,
        temperature=0.2,
    )

    return create_react_agent(
        llm,
        tools=[search_patients, get_patient_history, get_today_schedule],
        prompt=SYSTEM_PROMPT,
    )


def run_dentist_agent(db: Session, dentist_name: str, messages: list[dict]) -> str:
    """Entry point the router will call. messages: full conversation history."""
    agent = build_dentist_agent(db, dentist_name)
    result = agent.invoke({"messages": messages})
    final_message = result["messages"][-1]

    content = final_message.content
    if isinstance(content, str):
        return content
    return "".join(
        block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text"
    )