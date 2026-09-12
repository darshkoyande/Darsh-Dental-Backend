"""
app/agents/patient_agent.py
=============================
The patient-facing agent. Two jobs:
  1. Symptom triage — free-form reasoning, no DB involved, answered
     straight from the LLM's medical/dental knowledge + a strict prompt.
  2. Booking — the one tool it's allowed to call, with patient_id
     pre-bound so the LLM can never book on someone else's behalf.

Domain guardrail: enforced by (a) the system prompt's scope, and
(b) simply not giving this agent any tools beyond booking. It has
nothing else it *could* act on, even off-script.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from datetime import date
from app.agents import tools as db_tools
from app.config import settings


def build_patient_agent(db: Session, patient_id: int):
    today_str = date.today().strftime("%A, %B %d, %Y")  # e.g. "Tuesday, August 18, 2026"

    system_prompt = f"""You are Dentlaal's patient assistant. Today's date is {today_str}.
When the patient says "today", "tomorrow", or a day of the week, resolve it
to the actual calendar date based on today's date above before calling any tool.

Your ONLY job is:
1. Ask about dental symptoms and advise whether the patient should see a
   dentist, and how urgently (routine / soon / urgent-see-today).
2. If the patient wants to schedule an appointment, use the book_appointment
   tool to do it directly — don't just describe how, actually call it.
   Always use the exact dentist name "Dr. Anita Mehra" unless the patient
   names a different dentist explicitly.

STRICT RULES:
- You only discuss dental/oral health topics and appointment booking for
  THIS patient. Nothing else — no general chit-chat, no unrelated advice,
  no topics outside dentistry (e.g. "how do I order a pizza").
  If asked something outside this scope, politely decline and redirect
  to dental concerns.
- You are not a diagnostic authority. Give guidance, not a diagnosis.
  For anything serious (facial swelling, uncontrolled bleeding, severe
  trauma), tell them to seek urgent/emergency care immediately.
- Never ask the patient for their patient ID — you already know who
  they are.
- Do not use Markdown formatting (no **, no #, no bullet dashes) — write
  in plain, natural sentences and paragraphs, since your replies are
  displayed as plain text.
"""
    # ... rest of function stays the same, just replace SYSTEM_PROMPT with system_prompt
    # in the create_react_agent(...) call at the bottom

    @tool
    def book_appointment(
        appointment_date: str,
        appointment_type: str,
        dentist_name: str,
        notes: str = "",
    ) -> dict:
        """
        Book a dental appointment for THIS patient.
        appointment_date: ISO format, e.g. '2026-08-15T14:30:00'
        appointment_type: one of Regular, Checkup, Emergency, Root Canal, Extraction
        dentist_name: name of the dentist to book with
        """
        parsed_date = datetime.fromisoformat(appointment_date)
        return db_tools.book_appointment(
            db=db,
            patient_id=patient_id,
            appointment_date=parsed_date,
            appointment_type=appointment_type,
            dentist_name=dentist_name,
            notes=notes or None,
        )

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        #model="gemini-3.5-flash-lite",
        google_api_key=settings.gemini_api_key,
        temperature=0.3,
    )

    return create_react_agent(llm, tools=[book_appointment], prompt=system_prompt)


def run_patient_agent(db: Session, patient_id: int, messages: list[dict]) -> str:
    """Entry point the router will call. messages: full conversation history."""
    agent = build_patient_agent(db, patient_id)
    result = agent.invoke({"messages": messages})
    final_message = result["messages"][-1]

    content = final_message.content
    if isinstance(content, str):
        return content
    return "".join(
        block.get("text", "") for block in content
        if isinstance(block, dict) and block.get("type") == "text"
    )